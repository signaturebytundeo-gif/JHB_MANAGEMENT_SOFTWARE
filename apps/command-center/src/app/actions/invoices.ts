'use server';

import { revalidatePath } from 'next/cache';
import { differenceInDays, addDays } from 'date-fns';
import { db } from '@/lib/db';
import { verifySession, verifyManagerOrAbove } from '@/lib/dal';
import {
  createInvoiceSchema,
  logPaymentSchema,
  type CreateInvoiceFormState,
  type LogPaymentFormState,
} from '@/lib/validators/invoices';
import { generateInvoiceNumber } from '@/lib/utils/order-number';

// ── Create Invoice ─────────────────────────────────────────────────────────────

export async function createInvoice(
  prevState: CreateInvoiceFormState,
  formData: FormData
): Promise<CreateInvoiceFormState> {
  try {
    await verifyManagerOrAbove();

    const validatedFields = createInvoiceSchema.safeParse({
      orderId: formData.get('orderId'),
      notes: formData.get('notes') || undefined,
      taxRate: formData.get('taxRate') || '0',
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { orderId, notes, taxRate } = validatedFields.data;

    // Fetch order with line items
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        lineItems: true,
        invoice: true,
      },
    });

    if (!order) {
      return { message: 'Order not found' };
    }

    // Guard: order must be CONFIRMED or later
    const validStatuses = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'];
    if (!validStatuses.includes(order.status)) {
      return { message: 'Order must be confirmed before generating an invoice' };
    }

    // Guard: must not already have an invoice
    if (order.invoice) {
      return { message: 'This order already has an invoice' };
    }

    const subtotal = order.lineItems.reduce(
      (sum, item) => sum + Number(item.totalPrice),
      0
    );
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    const issuedAt = new Date();
    const dueDate = addDays(issuedAt, 30);

    const invoice = await db.$transaction(async (tx) => {
      const invoiceNumber = await generateInvoiceNumber(tx as typeof db);

      return tx.invoice.create({
        data: {
          invoiceNumber,
          orderId: order.id,
          customerId: order.customerId || null,
          status: 'SENT',
          subtotal,
          taxAmount,
          totalAmount,
          paidAmount: 0,
          issuedAt,
          dueDate,
          notes: notes || null,
        },
      });
    });

    revalidatePath('/dashboard/finance');

    return { success: true, invoiceId: invoice.id };
  } catch (error) {
    console.error('Error creating invoice:', error);
    return { message: 'Failed to create invoice' };
  }
}

// ── Get Invoices ──────────────────────────────────────────────────────────────

export async function getInvoices() {
  try {
    await verifySession();

    const invoices = await db.invoice.findMany({
      include: {
        order: {
          select: { orderNumber: true },
        },
        customer: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    return invoices.map((invoice) => {
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
      let computedLateFee = Number(invoice.lateFeeAmount);

      if (invoice.status === 'OVERDUE' && dueDate) {
        const daysOverdue = differenceInDays(now, dueDate);
        const principal = Number(invoice.totalAmount) - Number(invoice.paidAmount);
        if (principal > 0 && daysOverdue > 0) {
          computedLateFee = principal * 0.015 * (daysOverdue / 30);
        }
      }

      return {
        ...invoice,
        subtotal: Number(invoice.subtotal),
        taxAmount: Number(invoice.taxAmount),
        totalAmount: Number(invoice.totalAmount),
        paidAmount: Number(invoice.paidAmount),
        lateFeeAmount: computedLateFee,
      };
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }
}

export type InvoiceListItem = Awaited<ReturnType<typeof getInvoices>>[number];

// ── Get Invoice By ID ─────────────────────────────────────────────────────────

export async function getInvoiceById(invoiceId: string) {
  try {
    await verifySession();

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        order: {
          include: {
            lineItems: {
              include: { product: true },
            },
          },
        },
        customer: true,
        payments: {
          orderBy: { paidAt: 'desc' },
        },
      },
    });

    if (!invoice) return null;

    const now = new Date();
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
    let computedLateFee = Number(invoice.lateFeeAmount);

    if (invoice.status === 'OVERDUE' && dueDate) {
      const daysOverdue = differenceInDays(now, dueDate);
      const principal = Number(invoice.totalAmount) - Number(invoice.paidAmount);
      if (principal > 0 && daysOverdue > 0) {
        computedLateFee = principal * 0.015 * (daysOverdue / 30);
      }
    }

    return {
      ...invoice,
      subtotal: Number(invoice.subtotal),
      taxAmount: Number(invoice.taxAmount),
      totalAmount: Number(invoice.totalAmount),
      paidAmount: Number(invoice.paidAmount),
      lateFeeAmount: computedLateFee,
      order: {
        ...invoice.order,
        totalAmount: Number(invoice.order.totalAmount),
        lineItems: invoice.order.lineItems.map((item) => ({
          ...item,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        })),
      },
      payments: invoice.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
    };
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return null;
  }
}

export type InvoiceDetail = Awaited<ReturnType<typeof getInvoiceById>>;

// ── Log Payment ───────────────────────────────────────────────────────────────

export async function logPayment(
  prevState: LogPaymentFormState,
  formData: FormData
): Promise<LogPaymentFormState> {
  try {
    const session = await verifyManagerOrAbove();

    const validatedFields = logPaymentSchema.safeParse({
      invoiceId: formData.get('invoiceId'),
      amount: formData.get('amount'),
      paymentMethod: formData.get('paymentMethod'),
      paidAt: formData.get('paidAt'),
      notes: formData.get('notes') || undefined,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { invoiceId, amount, paymentMethod, paidAt, notes } = validatedFields.data;

    await db.$transaction(async (tx) => {
      // Create payment record
      await tx.invoicePayment.create({
        data: {
          invoiceId,
          amount,
          paymentMethod,
          paidAt,
          notes: notes || null,
          createdById: session.userId,
        },
      });

      // Fetch current invoice to update paid amount
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) throw new Error('Invoice not found');

      const newPaidAmount = Number(invoice.paidAmount) + amount;
      const totalAmount = Number(invoice.totalAmount);

      let newStatus = invoice.status;
      let paidAt_field: Date | null = null;

      if (newPaidAmount >= totalAmount) {
        newStatus = 'PAID';
        paidAt_field = new Date();
      } else if (newPaidAmount > 0) {
        newStatus = 'PARTIAL';
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
          ...(paidAt_field ? { paidAt: paidAt_field } : {}),
        },
      });
    });

    revalidatePath('/dashboard/finance');
    revalidatePath(`/dashboard/finance/invoices/${invoiceId}`);

    return { success: true, message: 'Payment recorded successfully' };
  } catch (error) {
    console.error('Error logging payment:', error);
    return { message: 'Failed to log payment' };
  }
}

// ── Flag Overdue Invoices ─────────────────────────────────────────────────────

export async function flagOverdueInvoices(): Promise<number> {
  try {
    const now = new Date();
    // 31 days past due = dueDate < now - 1 day (since Net 30 means 31+ days = overdue)
    const overdueThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const overdueInvoices = await db.invoice.findMany({
      where: {
        status: { notIn: ['PAID', 'VOID', 'OVERDUE'] },
        dueDate: { lt: overdueThreshold },
      },
    });

    for (const invoice of overdueInvoices) {
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : now;
      const daysOverdue = differenceInDays(now, dueDate);
      const principal = Number(invoice.totalAmount) - Number(invoice.paidAmount);
      const lateFeeAmount = principal > 0 && daysOverdue > 0
        ? principal * 0.015 * (daysOverdue / 30)
        : 0;

      await db.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'OVERDUE',
          overdueAt: now,
          lateFeeAmount,
        },
      });
    }

    return overdueInvoices.length;
  } catch (error) {
    console.error('Error flagging overdue invoices:', error);
    return 0;
  }
}

// ── AR Aging Report ───────────────────────────────────────────────────────────

export type ARAgingBucket = 'CURRENT' | '1_30' | '31_60' | '61_90' | '90_PLUS';

export type ARAgingItem = {
  id: string;
  invoiceNumber: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  lateFeeAmount: number;
  outstanding: number;
  daysPastDue: number;
  bucket: ARAgingBucket;
  dueDate: Date | null;
};

export type ARAgingSummary = {
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days90Plus: number;
  grandTotal: number;
};

export type ARAgingReport = {
  items: ARAgingItem[];
  summary: ARAgingSummary;
};

export async function getARAgingReport(): Promise<ARAgingReport> {
  try {
    await verifyManagerOrAbove();

    const invoices = await db.invoice.findMany({
      where: {
        status: { notIn: ['PAID', 'VOID'] },
      },
      include: {
        customer: {
          select: { firstName: true, lastName: true },
        },
        order: {
          select: { orderNumber: true },
        },
      },
    });

    const now = new Date();

    const items: ARAgingItem[] = invoices.map((invoice) => {
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
      const daysPastDue = dueDate ? differenceInDays(now, dueDate) : 0;

      let bucket: ARAgingBucket;
      if (daysPastDue <= 0) {
        bucket = 'CURRENT';
      } else if (daysPastDue <= 30) {
        bucket = '1_30';
      } else if (daysPastDue <= 60) {
        bucket = '31_60';
      } else if (daysPastDue <= 90) {
        bucket = '61_90';
      } else {
        bucket = '90_PLUS';
      }

      const totalAmount = Number(invoice.totalAmount);
      const paidAmount = Number(invoice.paidAmount);
      const lateFeeAmount = Number(invoice.lateFeeAmount);
      const outstanding = totalAmount - paidAmount + lateFeeAmount;

      const customerName = invoice.customer
        ? `${invoice.customer.firstName} ${invoice.customer.lastName}`
        : 'Unknown';

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        orderNumber: invoice.order.orderNumber,
        customerName,
        totalAmount,
        paidAmount,
        lateFeeAmount,
        outstanding,
        daysPastDue: Math.max(0, daysPastDue),
        bucket,
        dueDate,
      };
    });

    const summary: ARAgingSummary = {
      current: items.filter((i) => i.bucket === 'CURRENT').reduce((s, i) => s + i.outstanding, 0),
      days1_30: items.filter((i) => i.bucket === '1_30').reduce((s, i) => s + i.outstanding, 0),
      days31_60: items.filter((i) => i.bucket === '31_60').reduce((s, i) => s + i.outstanding, 0),
      days61_90: items.filter((i) => i.bucket === '61_90').reduce((s, i) => s + i.outstanding, 0),
      days90Plus: items.filter((i) => i.bucket === '90_PLUS').reduce((s, i) => s + i.outstanding, 0),
      grandTotal: items.reduce((s, i) => s + i.outstanding, 0),
    };

    return { items, summary };
  } catch (error) {
    console.error('Error generating AR aging report:', error);
    return {
      items: [],
      summary: { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90Plus: 0, grandTotal: 0 },
    };
  }
}

// ── Get Uninvoiced Orders ─────────────────────────────────────────────────────

export async function getUninvoicedOrders() {
  try {
    await verifySession();

    const orders = await db.order.findMany({
      where: {
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
        invoice: null,
      },
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        orderDate: true,
        customer: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { orderDate: 'desc' },
    });

    return orders.map((order) => ({
      ...order,
      totalAmount: Number(order.totalAmount),
    }));
  } catch (error) {
    console.error('Error fetching uninvoiced orders:', error);
    return [];
  }
}

export type UninvoicedOrder = Awaited<ReturnType<typeof getUninvoicedOrders>>[number];
