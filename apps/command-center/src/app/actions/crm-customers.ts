'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { verifySession } from '@/lib/dal';
import {
  createCustomerSchema,
  updateCustomerSchema,
  type FormState,
} from '@/lib/validators/crm-customers';

export async function getCRMCustomers() {
  try {
    await verifySession();

    const customers = await db.customer.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        customerType: true,
        company: true,
        paymentTerms: true,
        creditLimit: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            operatorOrders: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return customers.map((c) => ({
      ...c,
      creditLimit: c.creditLimit ? Number(c.creditLimit) : null,
      operatorOrderCount: c._count.operatorOrders,
    }));
  } catch (error) {
    console.error('Error fetching CRM customers:', error);
    return [];
  }
}

export async function getCRMCustomerById(id: string) {
  try {
    await verifySession();

    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        operatorOrders: {
          orderBy: { createdAt: 'desc' },
          include: {
            lineItems: {
              include: {
                product: {
                  select: { id: true, name: true, sku: true },
                },
              },
            },
            channel: { select: { id: true, name: true } },
          },
        },
        distributorAgreements: {
          orderBy: { createdAt: 'desc' },
        },
        subscriptionMembers: {
          include: {
            plan: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) return null;

    return {
      ...customer,
      creditLimit: customer.creditLimit ? Number(customer.creditLimit) : null,
      totalSpent: Number(customer.totalSpent),
      operatorOrders: customer.operatorOrders.map((o) => ({
        ...o,
        totalAmount: Number(o.totalAmount),
        depositAmount: o.depositAmount ? Number(o.depositAmount) : null,
        lineItems: o.lineItems.map((li) => ({
          ...li,
          unitPrice: Number(li.unitPrice),
          totalPrice: Number(li.totalPrice),
          discountPercent: li.discountPercent ? Number(li.discountPercent) : null,
        })),
      })),
    };
  } catch (error) {
    console.error('Error fetching CRM customer:', error);
    return null;
  }
}

export async function createCRMCustomer(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    await verifySession();

    const raw = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      phone: formData.get('phone') || undefined,
      customerType: formData.get('customerType'),
      company: formData.get('company') || undefined,
      paymentTerms: formData.get('paymentTerms') || undefined,
      creditLimit: formData.get('creditLimit') || undefined,
      billingAddress: formData.get('billingAddress') || undefined,
      shippingAddress: formData.get('shippingAddress') || undefined,
      city: formData.get('city') || undefined,
      state: formData.get('state') || undefined,
      zip: formData.get('zip') || undefined,
      notes: formData.get('notes') || undefined,
    };

    const result = createCustomerSchema.safeParse(raw);

    if (!result.success) {
      return {
        errors: result.error.flatten().fieldErrors as Record<string, string[]>,
        message: 'Validation failed. Please check the form.',
      };
    }

    const data = result.data;

    await db.customer.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone ?? null,
        customerType: data.customerType,
        company: data.company ?? null,
        paymentTerms: data.paymentTerms ?? null,
        creditLimit: data.creditLimit ?? null,
        billingAddress: data.billingAddress ?? null,
        shippingAddress: data.shippingAddress ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        zip: data.zip ?? null,
        notes: data.notes ?? null,
      },
    });

    revalidatePath('/dashboard/customers');
    return { success: true };
  } catch (error: unknown) {
    console.error('Error creating CRM customer:', error);
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      return { errors: { email: ['A customer with this email already exists.'] } };
    }
    return { message: 'Failed to create customer. Please try again.' };
  }
}

export async function updateCRMCustomer(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    await verifySession();

    const id = formData.get('id') as string;
    if (!id) {
      return { message: 'Customer ID is required for updates.' };
    }

    const raw = {
      firstName: formData.get('firstName') || undefined,
      lastName: formData.get('lastName') || undefined,
      email: formData.get('email') || undefined,
      phone: formData.get('phone') || undefined,
      customerType: formData.get('customerType') || undefined,
      company: formData.get('company') || undefined,
      paymentTerms: formData.get('paymentTerms') || undefined,
      creditLimit: formData.get('creditLimit') || undefined,
      billingAddress: formData.get('billingAddress') || undefined,
      shippingAddress: formData.get('shippingAddress') || undefined,
      city: formData.get('city') || undefined,
      state: formData.get('state') || undefined,
      zip: formData.get('zip') || undefined,
      notes: formData.get('notes') || undefined,
    };

    const result = updateCustomerSchema.safeParse(raw);

    if (!result.success) {
      return {
        errors: result.error.flatten().fieldErrors as Record<string, string[]>,
        message: 'Validation failed. Please check the form.',
      };
    }

    const data = result.data;

    await db.customer.update({
      where: { id },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.customerType !== undefined && { customerType: data.customerType }),
        ...(data.company !== undefined && { company: data.company }),
        ...(data.paymentTerms !== undefined && { paymentTerms: data.paymentTerms }),
        ...(data.creditLimit !== undefined && { creditLimit: data.creditLimit }),
        ...(data.billingAddress !== undefined && { billingAddress: data.billingAddress }),
        ...(data.shippingAddress !== undefined && { shippingAddress: data.shippingAddress }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.zip !== undefined && { zip: data.zip }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    revalidatePath('/dashboard/customers');
    revalidatePath(`/dashboard/customers/${id}`);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating CRM customer:', error);
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      return { errors: { email: ['A customer with this email already exists.'] } };
    }
    return { message: 'Failed to update customer. Please try again.' };
  }
}

export async function getCustomerPurchaseHistory(customerId: string) {
  try {
    await verifySession();

    const orders = await db.order.findMany({
      where: { customerId },
      include: {
        lineItems: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        channel: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const serialized = orders.map((o) => ({
      ...o,
      totalAmount: Number(o.totalAmount),
      depositAmount: o.depositAmount ? Number(o.depositAmount) : null,
      lineItems: o.lineItems.map((li) => ({
        ...li,
        unitPrice: Number(li.unitPrice),
        totalPrice: Number(li.totalPrice),
        discountPercent: li.discountPercent ? Number(li.discountPercent) : null,
      })),
    }));

    const lifetimeValue = serialized.reduce((sum, o) => sum + o.totalAmount, 0);
    const orderCount = serialized.length;
    const avgOrderValue = orderCount > 0 ? lifetimeValue / orderCount : 0;

    return {
      orders: serialized,
      lifetimeValue,
      orderCount,
      avgOrderValue,
    };
  } catch (error) {
    console.error('Error fetching customer purchase history:', error);
    return {
      orders: [],
      lifetimeValue: 0,
      orderCount: 0,
      avgOrderValue: 0,
    };
  }
}
