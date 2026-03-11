'use server';

import { revalidatePath } from 'next/cache';
import { subDays } from 'date-fns';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/dal';
import {
  createOperatorOrderSchema,
  type CreateOperatorOrderFormState,
} from '@/lib/validators/operator-orders';
import { generateOrderNumber } from '@/lib/utils/order-number';

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
