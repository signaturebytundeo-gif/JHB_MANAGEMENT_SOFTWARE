'use server';

import { revalidatePath } from 'next/cache';
import { LeadStage } from '@prisma/client';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/dal';
import { createLeadSchema, updateLeadSchema } from '@/lib/validators/crm-leads';

// ─── Form state types ─────────────────────────────────────────────────────────

export type LeadFormState = {
  errors?: Record<string, string[]>;
  success?: boolean;
  message?: string;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getLeads() {
  try {
    await verifySession();

    const leads = await db.lead.findMany({
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [
        { stage: 'asc' },
        { followUpAt: 'asc' },
      ],
    });

    const now = new Date();

    return leads.map((lead) => ({
      ...lead,
      overdue:
        lead.followUpAt !== null &&
        lead.followUpAt < now &&
        lead.stage !== LeadStage.CLOSED,
    }));
  } catch (error) {
    console.error('Error fetching leads:', error);
    return [];
  }
}

export async function getLeadsByStage() {
  try {
    await verifySession();

    const stages = Object.values(LeadStage);
    const counts = await Promise.all(
      stages.map((stage) =>
        db.lead.count({ where: { stage } }).then((count) => ({ stage, count }))
      )
    );

    return Object.fromEntries(counts.map(({ stage, count }) => [stage, count])) as Record<LeadStage, number>;
  } catch (error) {
    console.error('Error fetching leads by stage:', error);
    return Object.fromEntries(
      Object.values(LeadStage).map((s) => [s, 0])
    ) as Record<LeadStage, number>;
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createLead(
  prevState: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  try {
    const session = await verifySession();

    const raw = {
      name: formData.get('name'),
      company: formData.get('company') || undefined,
      email: formData.get('email') || undefined,
      phone: formData.get('phone') || undefined,
      source: formData.get('source') || undefined,
      stage: formData.get('stage') || undefined,
      notes: formData.get('notes') || undefined,
      followUpAt: formData.get('followUpAt') || undefined,
      assignedToId: formData.get('assignedToId') || undefined,
    };

    const validated = createLeadSchema.safeParse(raw);

    if (!validated.success) {
      return {
        errors: validated.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = validated.data;

    await db.lead.create({
      data: {
        name: data.name,
        company: data.company ?? null,
        email: data.email || null,
        phone: data.phone ?? null,
        source: data.source ?? null,
        stage: data.stage ?? LeadStage.LEAD,
        notes: data.notes ?? null,
        followUpAt: data.followUpAt ?? null,
        assignedToId: data.assignedToId ?? null,
        createdById: session.userId,
      },
    });

    revalidatePath('/dashboard/customers');
    return { success: true };
  } catch (error) {
    console.error('Error creating lead:', error);
    return { message: 'Failed to create lead. Please try again.' };
  }
}

export async function updateLead(
  prevState: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  try {
    await verifySession();

    const raw = {
      id: formData.get('id'),
      name: formData.get('name') || undefined,
      company: formData.get('company') || undefined,
      email: formData.get('email') || undefined,
      phone: formData.get('phone') || undefined,
      source: formData.get('source') || undefined,
      stage: formData.get('stage') || undefined,
      notes: formData.get('notes') || undefined,
      followUpAt: formData.get('followUpAt') || undefined,
      assignedToId: formData.get('assignedToId') || undefined,
    };

    const validated = updateLeadSchema.safeParse(raw);

    if (!validated.success) {
      return {
        errors: validated.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { id, ...rest } = validated.data;

    // Build the update payload
    const { email, stage, ...otherFields } = rest;

    // Normalize empty string email to null
    const emailValue = email === '' ? null : email;

    // If stage changes to CLOSED, record closedAt; reopening clears it
    let closedAt: Date | null | undefined;
    if (stage === LeadStage.CLOSED) {
      closedAt = new Date();
    } else if (stage !== undefined) {
      closedAt = null;
    }

    await db.lead.update({
      where: { id },
      data: {
        ...otherFields,
        ...(email !== undefined ? { email: emailValue } : {}),
        ...(stage !== undefined ? { stage } : {}),
        ...(closedAt !== undefined ? { closedAt } : {}),
      },
    });

    revalidatePath('/dashboard/customers');
    return { success: true };
  } catch (error) {
    console.error('Error updating lead:', error);
    return { message: 'Failed to update lead. Please try again.' };
  }
}

export async function updateLeadStage(
  prevState: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  try {
    await verifySession();

    const leadId = formData.get('leadId') as string;
    const newStage = formData.get('newStage') as string;

    if (!leadId || !newStage) {
      return { message: 'Missing lead ID or stage.' };
    }

    const validStages = Object.values(LeadStage) as string[];
    if (!validStages.includes(newStage)) {
      return { message: `Invalid stage: ${newStage}` };
    }

    const stage = newStage as LeadStage;

    await db.lead.update({
      where: { id: leadId },
      data: {
        stage,
        closedAt: stage === LeadStage.CLOSED ? new Date() : null,
      },
    });

    revalidatePath('/dashboard/customers');
    return { success: true };
  } catch (error) {
    console.error('Error updating lead stage:', error);
    return { message: 'Failed to update stage. Please try again.' };
  }
}
