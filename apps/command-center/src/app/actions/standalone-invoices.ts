'use server';

import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';
import { db } from '@/lib/db';
import { verifySession, verifyManagerOrAbove } from '@/lib/dal';
import { generateInvoiceNumber } from '@/lib/utils/order-number';
import {
  sendInvoiceEmailMessage,
  sendInvoiceReminderMessage,
  type InvoiceEmailData,
  type InvoiceEmailLineItem,
} from '@/lib/emails/invoice-email';

// ── Types ────────────────────────────────────────────────────────────────────

export type StandaloneInvoiceFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
      success?: boolean;
      invoiceId?: string;
    }
  | undefined;

export type QuickCustomerFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
      success?: boolean;
      customerId?: string;
    }
  | undefined;

interface LineItemInput {
  description: string;
  productId?: string | null;
  quantity: number;
  unitPrice: number;
  deliveryNote?: string | null;
}

// ── Create Standalone Invoice ────────────────────────────────────────────────

export async function createStandaloneInvoice(
  prevState: StandaloneInvoiceFormState,
  formData: FormData
): Promise<StandaloneInvoiceFormState> {
  try {
    await verifyManagerOrAbove();

    const customerId = formData.get('customerId') as string;
    const dueDate = formData.get('dueDate') as string;
    const taxRate = parseFloat((formData.get('taxRate') as string) || '0');
    const notes = (formData.get('notes') as string) || null;
    const paymentLink = (formData.get('paymentLink') as string) || null;
    const lineItemsJson = formData.get('lineItems') as string;
    const sendEmail = formData.get('sendEmail') === 'true';

    // Validation
    const errors: Record<string, string[]> = {};
    if (!customerId) errors.customerId = ['Customer is required'];
    if (!dueDate) errors.dueDate = ['Due date is required'];
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      errors.taxRate = ['Tax rate must be between 0 and 100'];
    }

    let lineItems: LineItemInput[] = [];
    try {
      lineItems = JSON.parse(lineItemsJson || '[]');
    } catch {
      errors.lineItems = ['Invalid line items data'];
    }

    if (lineItems.length === 0) {
      errors.lineItems = ['At least one line item is required'];
    }

    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (!item.description?.trim()) {
        errors[`lineItems.${i}.description`] = ['Description is required'];
      }
      if (!item.quantity || item.quantity < 1) {
        errors[`lineItems.${i}.quantity`] = ['Quantity must be at least 1'];
      }
      if (item.unitPrice == null || item.unitPrice < 0) {
        errors[`lineItems.${i}.unitPrice`] = ['Unit price must be 0 or greater'];
      }
    }

    if (Object.keys(errors).length > 0) {
      return { errors };
    }

    // Calculate totals
    const subtotal = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    const invoice = await db.$transaction(async (tx) => {
      const invoiceNumber = await generateInvoiceNumber(tx as typeof db);

      const created = await tx.invoice.create({
        data: {
          invoiceNumber,
          orderId: null,
          customerId,
          status: 'DRAFT',
          subtotal,
          taxAmount,
          totalAmount,
          paidAmount: 0,
          dueDate: new Date(dueDate),
          notes,
          paymentLink,
          lineItems: {
            create: lineItems.map((item) => ({
              description: item.description.trim(),
              productId: item.productId || null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
              deliveryNote: item.deliveryNote || null,
            })),
          },
        },
      });

      return created;
    });

    // If sendEmail requested, send immediately
    if (sendEmail) {
      await sendInvoiceEmail(invoice.id);
    }

    revalidatePath('/dashboard/finance');

    return { success: true, invoiceId: invoice.id };
  } catch (error) {
    console.error('Error creating standalone invoice:', error);
    return { message: 'Failed to create invoice' };
  }
}

// ── Send Invoice Email ───────────────────────────────────────────────────────

export async function sendInvoiceEmail(
  invoiceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await verifyManagerOrAbove();

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        lineItems: {
          include: { product: true },
        },
        order: {
          include: {
            lineItems: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!invoice) {
      return { success: false, error: 'Invoice not found' };
    }

    if (!invoice.customer) {
      return { success: false, error: 'Invoice has no customer — cannot send email' };
    }

    if (!invoice.customer.email) {
      return { success: false, error: 'Customer has no email address' };
    }

    // Build line items from InvoiceLineItems (standalone) or OrderLineItems (order-based)
    let emailLineItems: InvoiceEmailLineItem[];

    if (invoice.lineItems.length > 0) {
      // Standalone invoice
      emailLineItems = invoice.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        deliveryNote: item.deliveryNote,
      }));
    } else if (invoice.order) {
      // Order-based invoice
      emailLineItems = invoice.order.lineItems.map((item) => ({
        description: item.product.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        deliveryNote: null,
      }));
    } else {
      return { success: false, error: 'Invoice has no line items' };
    }

    const emailData: InvoiceEmailData = {
      invoiceNumber: invoice.invoiceNumber,
      issuedDate: format(new Date(), 'MMMM d, yyyy'),
      dueDate: invoice.dueDate
        ? format(new Date(invoice.dueDate), 'MMMM d, yyyy')
        : 'Upon Receipt',
      customerName: `${invoice.customer.firstName} ${invoice.customer.lastName}`,
      customerEmail: invoice.customer.email,
      customerCompany: invoice.customer.company,
      customerAddress: invoice.customer.billingAddress || invoice.customer.shippingAddress,
      customerCity: invoice.customer.city,
      customerState: invoice.customer.state,
      customerZip: invoice.customer.zip,
      customerPhone: invoice.customer.phone,
      lineItems: emailLineItems,
      subtotal: Number(invoice.subtotal),
      taxAmount: Number(invoice.taxAmount),
      totalAmount: Number(invoice.totalAmount),
      paymentLink: invoice.paymentLink,
      notes: invoice.notes,
    };

    const result = await sendInvoiceEmailMessage(emailData);

    if (result.success) {
      // Update invoice status to SENT and set issuedAt
      await db.invoice.update({
        where: { id: invoiceId },
        data: {
          status: invoice.status === 'DRAFT' ? 'SENT' : invoice.status,
          issuedAt: invoice.issuedAt || new Date(),
        },
      });

      revalidatePath('/dashboard/finance');
      revalidatePath(`/dashboard/finance/invoices/${invoiceId}`);
    }

    return result;
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return { success: false, error: 'Failed to send invoice email' };
  }
}

// ── Send Invoice Reminder ────────────────────────────────────────────────────

export async function sendInvoiceReminder(
  invoiceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await verifyManagerOrAbove();

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        lineItems: {
          include: { product: true },
        },
        order: {
          include: {
            lineItems: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!invoice) {
      return { success: false, error: 'Invoice not found' };
    }

    // Only allow reminders for SENT/OVERDUE invoices
    if (!['SENT', 'OVERDUE', 'VIEWED', 'PARTIAL'].includes(invoice.status)) {
      return {
        success: false,
        error: 'Reminders can only be sent for sent, viewed, partial, or overdue invoices',
      };
    }

    if (!invoice.customer?.email) {
      return { success: false, error: 'Customer has no email address' };
    }

    // Build line items
    let emailLineItems: InvoiceEmailLineItem[];

    if (invoice.lineItems.length > 0) {
      emailLineItems = invoice.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        deliveryNote: item.deliveryNote,
      }));
    } else if (invoice.order) {
      emailLineItems = invoice.order.lineItems.map((item) => ({
        description: item.product.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        deliveryNote: null,
      }));
    } else {
      return { success: false, error: 'Invoice has no line items' };
    }

    const emailData: InvoiceEmailData = {
      invoiceNumber: invoice.invoiceNumber,
      issuedDate: invoice.issuedAt
        ? format(new Date(invoice.issuedAt), 'MMMM d, yyyy')
        : format(new Date(), 'MMMM d, yyyy'),
      dueDate: invoice.dueDate
        ? format(new Date(invoice.dueDate), 'MMMM d, yyyy')
        : 'Upon Receipt',
      customerName: `${invoice.customer.firstName} ${invoice.customer.lastName}`,
      customerEmail: invoice.customer.email,
      customerCompany: invoice.customer.company,
      customerAddress: invoice.customer.billingAddress || invoice.customer.shippingAddress,
      customerCity: invoice.customer.city,
      customerState: invoice.customer.state,
      customerZip: invoice.customer.zip,
      customerPhone: invoice.customer.phone,
      lineItems: emailLineItems,
      subtotal: Number(invoice.subtotal),
      taxAmount: Number(invoice.taxAmount),
      totalAmount: Number(invoice.totalAmount),
      paymentLink: invoice.paymentLink,
      notes: invoice.notes,
    };

    const result = await sendInvoiceReminderMessage(emailData);

    if (result.success) {
      revalidatePath('/dashboard/finance');
      revalidatePath(`/dashboard/finance/invoices/${invoiceId}`);
    }

    return result;
  } catch (error) {
    console.error('Error sending invoice reminder:', error);
    return { success: false, error: 'Failed to send invoice reminder' };
  }
}

// ── Get Standalone Invoice By ID ─────────────────────────────────────────────

export async function getStandaloneInvoiceById(id: string) {
  try {
    await verifySession();

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        lineItems: {
          include: { product: true },
        },
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
      const diffMs = now.getTime() - dueDate.getTime();
      const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
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
      lineItems: invoice.lineItems.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      order: invoice.order
        ? {
            ...invoice.order,
            totalAmount: Number(invoice.order.totalAmount),
            lineItems: invoice.order.lineItems.map((item) => ({
              ...item,
              unitPrice: Number(item.unitPrice),
              totalPrice: Number(item.totalPrice),
            })),
          }
        : null,
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

export type StandaloneInvoiceDetail = Awaited<ReturnType<typeof getStandaloneInvoiceById>>;

// ── Quick Create Customer ────────────────────────────────────────────────────

export async function quickCreateCustomer(
  prevState: QuickCustomerFormState,
  formData: FormData
): Promise<QuickCustomerFormState> {
  try {
    await verifyManagerOrAbove();

    const firstName = (formData.get('firstName') as string)?.trim();
    const lastName = (formData.get('lastName') as string)?.trim();
    const email = (formData.get('email') as string)?.trim();
    const phone = (formData.get('phone') as string)?.trim() || null;
    const company = (formData.get('company') as string)?.trim() || null;
    const billingAddress = (formData.get('billingAddress') as string)?.trim() || null;
    const city = (formData.get('city') as string)?.trim() || null;
    const state = (formData.get('state') as string)?.trim() || null;
    const zip = (formData.get('zip') as string)?.trim() || null;
    const customerType = (formData.get('customerType') as string) || 'WHOLESALE';

    const errors: Record<string, string[]> = {};
    if (!firstName) errors.firstName = ['First name is required'];
    if (!lastName) errors.lastName = ['Last name is required'];
    if (!email) errors.email = ['Email is required'];

    if (Object.keys(errors).length > 0) {
      return { errors };
    }

    // Check for existing customer with same email
    const existing = await db.customer.findUnique({ where: { email } });
    if (existing) {
      return { success: true, customerId: existing.id };
    }

    const customer = await db.customer.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        company,
        billingAddress,
        city,
        state,
        zip,
        customerType: customerType as any,
      },
    });

    revalidatePath('/dashboard/finance');

    return { success: true, customerId: customer.id };
  } catch (error) {
    console.error('Error creating customer:', error);
    return { message: 'Failed to create customer' };
  }
}

// ── Get Customers for Selector ───────────────────────────────────────────────

export async function getCustomersForInvoice(search?: string) {
  try {
    await verifySession();

    const where = search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { company: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const customers = await db.customer.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        company: true,
        phone: true,
        billingAddress: true,
        city: true,
        state: true,
        zip: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return customers;
  } catch (error) {
    console.error('Error fetching customers for invoice:', error);
    return [];
  }
}

export type InvoiceCustomer = Awaited<ReturnType<typeof getCustomersForInvoice>>[number];

// ── Get Products for Selector ────────────────────────────────────────────────

export async function getProductsForInvoice() {
  try {
    await verifySession();

    return await db.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        size: true,
      },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Error fetching products for invoice:', error);
    return [];
  }
}

export type InvoiceProduct = Awaited<ReturnType<typeof getProductsForInvoice>>[number];
