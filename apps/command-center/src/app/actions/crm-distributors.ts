'use server';

import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/dal';
import {
  createDistributorAgreementSchema,
  updateDistributorAgreementSchema,
} from '@/lib/validators/crm-distributors';

// ============================================================================
// Types
// ============================================================================

export type DistributorAgreementFormState = {
  errors?: Record<string, string[]>;
  success?: boolean;
  message?: string;
};

// ============================================================================
// Queries
// ============================================================================

export async function getDistributorAgreements() {
  try {
    await verifySession();

    const agreements = await db.distributorAgreement.findMany({
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate estimated commission for each agreement based on customer orders
    const agreementsWithCommission = await Promise.all(
      agreements.map(async (agreement) => {
        const orders = await db.order.findMany({
          where: {
            customerId: agreement.customerId,
            status: { in: ['DELIVERED', 'COMPLETED'] },
          },
          select: { totalAmount: true },
        });

        const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
        const commissionRate = Number(agreement.commissionRate) / 100;
        const estimatedCommission = totalRevenue * commissionRate;

        return {
          ...agreement,
          commissionRate: Number(agreement.commissionRate),
          totalRevenue,
          estimatedCommission,
        };
      })
    );

    return agreementsWithCommission;
  } catch (error) {
    console.error('Error fetching distributor agreements:', error);
    return [];
  }
}

export async function getDistributorPerformance(agreementId: string) {
  try {
    await verifySession();

    const agreement = await db.distributorAgreement.findUnique({
      where: { id: agreementId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
          },
        },
      },
    });

    if (!agreement) return null;

    const orders = await db.order.findMany({
      where: {
        customerId: agreement.customerId,
        status: { in: ['DELIVERED', 'COMPLETED'] },
      },
      orderBy: { orderDate: 'asc' },
      select: {
        orderDate: true,
        totalAmount: true,
      },
    });

    const commissionRate = Number(agreement.commissionRate) / 100;

    // Group by month
    const monthMap = new Map<string, { revenue: number; commission: number }>();
    for (const order of orders) {
      const monthKey = format(order.orderDate, 'yyyy-MM');
      const revenue = Number(order.totalAmount);
      const existing = monthMap.get(monthKey) ?? { revenue: 0, commission: 0 };
      monthMap.set(monthKey, {
        revenue: existing.revenue + revenue,
        commission: existing.commission + revenue * commissionRate,
      });
    }

    const months = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    const totalRevenue = months.reduce((sum, m) => sum + m.revenue, 0);
    const totalCommission = months.reduce((sum, m) => sum + m.commission, 0);

    return {
      agreement: {
        ...agreement,
        commissionRate: Number(agreement.commissionRate),
      },
      months,
      totalRevenue,
      totalCommission,
    };
  } catch (error) {
    console.error('Error fetching distributor performance:', error);
    return null;
  }
}

// ============================================================================
// Mutations
// ============================================================================

export async function createDistributorAgreement(
  prevState: DistributorAgreementFormState,
  formData: FormData
): Promise<DistributorAgreementFormState> {
  try {
    await verifySession();

    const validatedFields = createDistributorAgreementSchema.safeParse({
      customerId: formData.get('customerId'),
      territory: formData.get('territory'),
      commissionRate: formData.get('commissionRate'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate') || undefined,
      notes: formData.get('notes') || undefined,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = validatedFields.data;

    await db.distributorAgreement.create({
      data: {
        customerId: data.customerId,
        territory: data.territory,
        commissionRate: data.commissionRate,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        notes: data.notes ?? null,
      },
    });

    revalidatePath('/dashboard/customers');
    return { success: true };
  } catch (error) {
    console.error('Error creating distributor agreement:', error);
    return { message: 'Failed to create distributor agreement. Please try again.' };
  }
}

export async function updateDistributorAgreement(
  prevState: DistributorAgreementFormState,
  formData: FormData
): Promise<DistributorAgreementFormState> {
  try {
    await verifySession();

    const validatedFields = updateDistributorAgreementSchema.safeParse({
      id: formData.get('id'),
      territory: formData.get('territory') || undefined,
      commissionRate: formData.get('commissionRate') || undefined,
      startDate: formData.get('startDate') || undefined,
      endDate: formData.get('endDate') || undefined,
      status: formData.get('status') || undefined,
      notes: formData.get('notes') || undefined,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { id, ...data } = validatedFields.data;

    await db.distributorAgreement.update({
      where: { id },
      data: {
        ...data,
        commissionRate: data.commissionRate ?? undefined,
        endDate: data.endDate ?? undefined,
        notes: data.notes ?? undefined,
      },
    });

    revalidatePath('/dashboard/customers');
    return { success: true };
  } catch (error) {
    console.error('Error updating distributor agreement:', error);
    return { message: 'Failed to update distributor agreement. Please try again.' };
  }
}
