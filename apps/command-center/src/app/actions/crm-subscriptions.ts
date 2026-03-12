'use server';

import { revalidatePath } from 'next/cache';
import { addDays, differenceInMonths } from 'date-fns';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/dal';
import {
  createSubscriptionMemberSchema,
  updateSubscriptionStatusSchema,
} from '@/lib/validators/crm-subscriptions';
import { sendRenewalReminderEmail } from '@/lib/emails/crm-emails';

// ============================================================================
// Types
// ============================================================================

export type SubscriptionMemberFormState = {
  errors?: Record<string, string[]>;
  success?: boolean;
  message?: string;
};

export type UpdateStatusFormState = {
  errors?: Record<string, string[]>;
  success?: boolean;
  message?: string;
};

// ============================================================================
// Queries
// ============================================================================

export async function getSubscriptionMembers() {
  try {
    await verifySession();

    const members = await db.subscriptionMember.findMany({
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            billingCycle: true,
            price: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    return members.map((member) => {
      const monthsActive = differenceInMonths(now, member.startDate);
      const loyaltyEligible = monthsActive >= 6 && member.loyaltyRewardAt === null;

      return {
        ...member,
        plan: {
          ...member.plan,
          price: Number(member.plan.price),
        },
        monthsActive,
        loyaltyEligible,
      };
    });
  } catch (error) {
    console.error('Error fetching subscription members:', error);
    return [];
  }
}

// ============================================================================
// Mutations
// ============================================================================

export async function createSubscriptionMember(
  prevState: SubscriptionMemberFormState,
  formData: FormData
): Promise<SubscriptionMemberFormState> {
  try {
    await verifySession();

    const validatedFields = createSubscriptionMemberSchema.safeParse({
      customerId: formData.get('customerId'),
      planId: formData.get('planId'),
      startDate: formData.get('startDate'),
      renewalDate: formData.get('renewalDate') || undefined,
      notes: formData.get('notes') || undefined,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = validatedFields.data;

    await db.subscriptionMember.create({
      data: {
        customerId: data.customerId,
        planId: data.planId,
        startDate: data.startDate,
        renewalDate: data.renewalDate ?? null,
        notes: data.notes ?? null,
      },
    });

    revalidatePath('/dashboard/customers');
    return { success: true };
  } catch (error) {
    console.error('Error creating subscription member:', error);
    return { message: 'Failed to create subscription member. Please try again.' };
  }
}

export async function updateSubscriptionStatus(
  prevState: UpdateStatusFormState,
  formData: FormData
): Promise<UpdateStatusFormState> {
  try {
    await verifySession();

    const validatedFields = updateSubscriptionStatusSchema.safeParse({
      memberId: formData.get('memberId'),
      status: formData.get('status'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { memberId, status } = validatedFields.data;

    await db.subscriptionMember.update({
      where: { id: memberId },
      data: {
        status,
        cancelledAt: status === 'CANCELLED' ? new Date() : undefined,
      },
    });

    revalidatePath('/dashboard/customers');
    return { success: true };
  } catch (error) {
    console.error('Error updating subscription status:', error);
    return { message: 'Failed to update subscription status. Please try again.' };
  }
}

export async function sendRenewalReminders(): Promise<{ sent: number; errors: number }> {
  try {
    await verifySession();

    const now = new Date();
    const thirtyDaysFromNow = addDays(now, 30);

    const members = await db.subscriptionMember.findMany({
      where: {
        status: 'ACTIVE',
        renewalDate: {
          lte: thirtyDaysFromNow,
          gt: now,
        },
        renewalReminderSentAt: null,
      },
      include: {
        customer: {
          select: {
            email: true,
            firstName: true,
          },
        },
        plan: {
          select: {
            name: true,
          },
        },
      },
    });

    let sent = 0;
    let errors = 0;

    for (const member of members) {
      const result = await sendRenewalReminderEmail({
        customerEmail: member.customer.email,
        customerFirstName: member.customer.firstName,
        planName: member.plan.name,
        renewalDate: member.renewalDate!,
      });

      if (result.success) {
        await db.subscriptionMember.update({
          where: { id: member.id },
          data: { renewalReminderSentAt: new Date() },
        });
        sent++;
      } else {
        errors++;
      }
    }

    return { sent, errors };
  } catch (error) {
    console.error('Error sending renewal reminders:', error);
    return { sent: 0, errors: 1 };
  }
}

export async function awardLoyaltyReward(
  memberId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await verifySession();

    await db.subscriptionMember.update({
      where: { id: memberId },
      data: { loyaltyRewardAt: new Date() },
    });

    revalidatePath('/dashboard/customers');
    return { success: true };
  } catch (error) {
    console.error('Error awarding loyalty reward:', error);
    return { success: false, message: 'Failed to award loyalty reward. Please try again.' };
  }
}
