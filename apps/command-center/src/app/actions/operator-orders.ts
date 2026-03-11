'use server';

import { revalidatePath } from 'next/cache';
import { subDays } from 'date-fns';
import { db } from '@/lib/db';
import { verifySession, verifyManagerOrAbove } from '@/lib/dal';
import {
  createOperatorOrderSchema,
  type CreateOperatorOrderFormState,
} from '@/lib/validators/operator-orders';
import { generateOrderNumber } from '@/lib/utils/order-number';
import { allocateInventoryFIFO } from '@/lib/utils/fifo';

export async function createOperatorOrder(
  prevState: CreateOperatorOrderFormState,
  formData: FormData
): Promise<CreateOperatorOrderFormState> {
  try {
    const session = await verifySession();

    const validatedFields = createOperatorOrderSchema.safeParse({
      channelId: formData.get('channelId'),
      locationId: formData.get('locationId'),
      customerId: formData.get('customerId') || undefined,
      paymentMethod: formData.get('paymentMethod'),
      orderType: formData.get('orderType') || 'STANDARD',
      notes: formData.get('notes') || undefined,
      lineItems: formData.get('lineItems'),
      depositAmount: formData.get('depositAmount') || undefined,
      eventDate: formData.get('eventDate') || undefined,
      eventLocation: formData.get('eventLocation') || undefined,
      weatherNotes: formData.get('weatherNotes') || undefined,
      footTrafficNotes: formData.get('footTrafficNotes') || undefined,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = validatedFields.data;

    // Calculate total from line items
    const totalAmount = data.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    // Compute balance due date for catering orders (7 days before event)
    let balanceDueDate: Date | undefined;
    if (data.orderType === 'CATERING' && data.eventDate) {
      balanceDueDate = subDays(data.eventDate, 7);
    }

    const order = await db.$transaction(async (tx) => {
      const orderNumber = await generateOrderNumber(tx as any);

      return tx.order.create({
        data: {
          orderNumber,
          status: 'DRAFT',
          orderType: data.orderType as 'STANDARD' | 'CATERING' | 'FARMERS_MARKET',
          channelId: data.channelId,
          locationId: data.locationId,
          customerId: data.customerId || null,
          paymentMethod: data.paymentMethod,
          totalAmount,
          notes: data.notes,
          createdById: session.userId,
          // Catering fields
          depositAmount: data.depositAmount ?? null,
          eventDate: data.eventDate ?? null,
          balanceDueDate: balanceDueDate ?? null,
          // Farmers market fields
          eventLocation: data.eventLocation ?? null,
          weatherNotes: data.weatherNotes ?? null,
          footTrafficNotes: data.footTrafficNotes ?? null,
          // Line items
          lineItems: {
            create: data.lineItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
            })),
          },
        },
      });
    });

    revalidatePath('/dashboard/orders');

    return {
      success: true,
      message: 'Order created',
      orderId: order.id,
    };
  } catch (error) {
    console.error('Error creating operator order:', error);
    return {
      message: 'Failed to create order',
    };
  }
}

export async function getOperatorOrders() {
  try {
    await verifySession();

    const orders = await db.order.findMany({
      include: {
        customer: {
          select: { firstName: true, lastName: true },
        },
        channel: {
          select: { name: true },
        },
        location: {
          select: { name: true },
        },
        lineItems: {
          select: { quantity: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => ({
      ...order,
      totalAmount: Number(order.totalAmount),
    }));
  } catch (error) {
    console.error('Error fetching operator orders:', error);
    return [];
  }
}

export type OperatorOrderListItem = Awaited<ReturnType<typeof getOperatorOrders>>[number];

export async function getOperatorOrderById(orderId: string) {
  try {
    await verifySession();

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        channel: true,
        location: true,
        lineItems: {
          include: {
            product: true,
          },
        },
        createdBy: {
          select: { name: true },
        },
        approvedBy: true,
        invoice: true,
      },
    });

    if (!order) return null;

    return {
      ...order,
      totalAmount: Number(order.totalAmount),
      depositAmount: order.depositAmount ? Number(order.depositAmount) : null,
      lineItems: order.lineItems.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    };
  } catch (error) {
    console.error('Error fetching operator order:', error);
    return null;
  }
}

export type OperatorOrderDetail = Awaited<ReturnType<typeof getOperatorOrderById>>;

// ── Order Confirmation with FIFO Allocation ─────────────────────────────────

export async function confirmOrder(
  orderId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await verifyManagerOrAbove();

    await db.$transaction(async (tx) => {
      // Fetch order with line items inside the transaction
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { lineItems: true },
      });

      if (!order) throw new Error('Order not found');
      if (order.status !== 'DRAFT') throw new Error('Only DRAFT orders can be confirmed');

      const totalAmount = Number(order.totalAmount);

      // FIFO allocation for each line item → create DEDUCTION movements
      for (const line of order.lineItems) {
        const allocations = await allocateInventoryFIFO(
          line.productId,
          order.locationId,
          line.quantity,
          tx as typeof db
        );

        for (const alloc of allocations) {
          await tx.inventoryMovement.create({
            data: {
              movementType: 'DEDUCTION',
              batchId: alloc.batchId,
              fromLocationId: order.locationId,
              toLocationId: null,
              quantity: alloc.quantity,
              orderId: order.id,
              requiresApproval: false,
              approvedById: session.userId,
              approvedAt: new Date(),
              createdById: session.userId,
            },
          });
        }
      }

      // Query approval thresholds from DB (never hardcoded)
      const thresholds = await tx.approvalThreshold.findMany({
        orderBy: { minAmount: 'asc' },
      });

      // Find matching threshold for this order's total amount
      let approvalStatus: string | null = null;
      let newStatus: 'DRAFT' | 'CONFIRMED' = 'DRAFT';
      let approvedById: string | null = null;
      let approvedAt: Date | null = null;

      const matchingThreshold = thresholds.find((t) => {
        const min = Number(t.minAmount);
        const max = t.maxAmount !== null ? Number(t.maxAmount) : Infinity;
        return totalAmount >= min && totalAmount <= max;
      });

      if (matchingThreshold) {
        if (matchingThreshold.approvalType === 'auto') {
          approvalStatus = 'approved';
          newStatus = 'CONFIRMED';
          approvedById = session.userId;
          approvedAt = new Date();
        } else if (matchingThreshold.approvalType === 'single_member') {
          approvalStatus = 'pending_single';
          newStatus = 'DRAFT';
        } else if (
          matchingThreshold.approvalType === 'dual_member' ||
          matchingThreshold.approvalType === 'dual_bank'
        ) {
          approvalStatus = 'pending_dual';
          newStatus = 'DRAFT';
        }
      } else {
        // No matching threshold: default auto-approve
        approvalStatus = 'approved';
        newStatus = 'CONFIRMED';
        approvedById = session.userId;
        approvedAt = new Date();
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          approvalStatus,
          ...(approvedById ? { approvedById, approvedAt } : {}),
        },
      });
    });

    revalidatePath('/dashboard/orders');
    revalidatePath(`/dashboard/orders/${orderId}`);

    return { success: true, message: 'Order confirmed and inventory allocated' };
  } catch (error) {
    console.error('Error confirming order:', error);
    const message = error instanceof Error ? error.message : 'Failed to confirm order';
    return { success: false, message };
  }
}

// ── Approve Order ────────────────────────────────────────────────────────────

export async function approveOrder(
  orderId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await verifyManagerOrAbove();

    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, message: 'Order not found' };

    if (order.approvalStatus === 'pending_single') {
      await db.order.update({
        where: { id: orderId },
        data: {
          approvedById: session.userId,
          approvedAt: new Date(),
          approvalStatus: 'approved',
          status: 'CONFIRMED',
        },
      });
    } else if (order.approvalStatus === 'pending_dual') {
      if (!order.approvedById) {
        // First approver — record but still pending second
        await db.order.update({
          where: { id: orderId },
          data: {
            approvedById: session.userId,
            approvedAt: new Date(),
            // Status stays DRAFT, approvalStatus stays pending_dual
          },
        });
      } else {
        // Second approver — must be different from first
        if (order.approvedById === session.userId) {
          return {
            success: false,
            message: 'Dual control: second approver must be a different user',
          };
        }
        await db.order.update({
          where: { id: orderId },
          data: {
            secondApprovedById: session.userId,
            approvalStatus: 'approved',
            status: 'CONFIRMED',
          },
        });
      }
    } else {
      return { success: false, message: 'Order is not pending approval' };
    }

    revalidatePath('/dashboard/orders');
    revalidatePath(`/dashboard/orders/${orderId}`);

    return { success: true, message: 'Order approved' };
  } catch (error) {
    console.error('Error approving order:', error);
    return { success: false, message: 'Failed to approve order' };
  }
}

// ── Update Order Status ──────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['COMPLETED', 'CANCELLED'],
};

export async function updateOrderStatus(
  orderId: string,
  newStatus: string
): Promise<{ success: boolean; message: string }> {
  try {
    await verifyManagerOrAbove();

    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, message: 'Order not found' };

    const allowedTransitions = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowedTransitions.includes(newStatus)) {
      return {
        success: false,
        message: `Cannot transition from ${order.status} to ${newStatus}`,
      };
    }

    await db.order.update({
      where: { id: orderId },
      data: { status: newStatus as any },
    });

    revalidatePath('/dashboard/orders');
    revalidatePath(`/dashboard/orders/${orderId}`);

    return { success: true, message: `Order status updated to ${newStatus}` };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, message: 'Failed to update order status' };
  }
}

// ── Pick/Pack List ───────────────────────────────────────────────────────────

export type PickPackItem = {
  productName: string;
  sku: string;
  totalQuantity: number;
  batches: { batchCode: string; quantity: number }[];
};

export type PickPackList = {
  orderId: string;
  orderNumber: string;
  locationName: string;
  items: PickPackItem[];
};

export async function getPickPackList(orderId: string): Promise<PickPackList | null> {
  try {
    await verifySession();

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { location: { select: { name: true } } },
    });
    if (!order) return null;

    const movements = await db.inventoryMovement.findMany({
      where: { orderId, movementType: 'DEDUCTION' },
      include: {
        batch: {
          select: {
            batchCode: true,
            product: { select: { name: true, sku: true } },
          },
        },
        fromLocation: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by product
    const productMap = new Map<string, PickPackItem>();
    for (const m of movements) {
      const key = m.batch.product.sku;
      if (!productMap.has(key)) {
        productMap.set(key, {
          productName: m.batch.product.name,
          sku: m.batch.product.sku,
          totalQuantity: 0,
          batches: [],
        });
      }
      const entry = productMap.get(key)!;
      entry.totalQuantity += m.quantity;
      entry.batches.push({ batchCode: m.batch.batchCode, quantity: m.quantity });
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      locationName: order.location.name,
      items: Array.from(productMap.values()),
    };
  } catch (error) {
    console.error('Error fetching pick/pack list:', error);
    return null;
  }
}
