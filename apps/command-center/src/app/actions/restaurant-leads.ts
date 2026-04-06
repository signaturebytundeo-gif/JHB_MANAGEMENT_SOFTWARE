'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { verifyManagerOrAbove } from '@/lib/dal';

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUOTED' | 'CLOSED_WON' | 'CLOSED_LOST';

// ============================================================================
// READ
// ============================================================================

export async function getRestaurantLeads() {
  try {
    const leads = await db.restaurantLead.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });
    return leads.map((l) => ({
      ...l,
      orderTotal: Number(l.orderTotal),
      convertedValue: l.convertedValue ? Number(l.convertedValue) : null,
    }));
  } catch (err) {
    console.error('[restaurant-leads] getRestaurantLeads error:', err);
    return [];
  }
}

export async function getLeadMetrics() {
  try {
    const all = await db.restaurantLead.findMany({
      select: { status: true, orderTotal: true, convertedValue: true },
    });

    const metrics = {
      total: all.length,
      newCount: 0,
      contactedCount: 0,
      quotedCount: 0,
      wonCount: 0,
      lostCount: 0,
      pipelineValue: 0, // sum of orderTotal for NEW/CONTACTED/QUOTED
      wonValue: 0, // sum of convertedValue for CLOSED_WON
    };

    for (const lead of all) {
      const ot = Number(lead.orderTotal);
      const cv = lead.convertedValue ? Number(lead.convertedValue) : 0;
      switch (lead.status) {
        case 'NEW':
          metrics.newCount++;
          metrics.pipelineValue += ot;
          break;
        case 'CONTACTED':
          metrics.contactedCount++;
          metrics.pipelineValue += ot;
          break;
        case 'QUOTED':
          metrics.quotedCount++;
          metrics.pipelineValue += ot;
          break;
        case 'CLOSED_WON':
          metrics.wonCount++;
          metrics.wonValue += cv || ot;
          break;
        case 'CLOSED_LOST':
          metrics.lostCount++;
          break;
      }
    }

    return metrics;
  } catch (err) {
    console.error('[restaurant-leads] getLeadMetrics error:', err);
    return {
      total: 0,
      newCount: 0,
      contactedCount: 0,
      quotedCount: 0,
      wonCount: 0,
      lostCount: 0,
      pipelineValue: 0,
      wonValue: 0,
    };
  }
}

// ============================================================================
// WRITE
// ============================================================================

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  extra?: { convertedValue?: number; lostReason?: string; internalNotes?: string }
): Promise<{ success: boolean; message: string }> {
  try {
    await verifyManagerOrAbove();

    const data: Record<string, unknown> = { status };
    if (extra?.convertedValue != null) data.convertedValue = extra.convertedValue;
    if (extra?.lostReason) data.lostReason = extra.lostReason;
    if (extra?.internalNotes) data.internalNotes = extra.internalNotes;

    await db.restaurantLead.update({
      where: { id: leadId },
      data,
    });

    revalidatePath('/dashboard/restaurant-leads');
    return { success: true, message: 'Lead updated' };
  } catch (err) {
    console.error('[restaurant-leads] updateLeadStatus error:', err);
    return { success: false, message: 'Failed to update lead' };
  }
}

export async function updateLeadNotes(
  leadId: string,
  internalNotes: string
): Promise<{ success: boolean; message: string }> {
  try {
    await verifyManagerOrAbove();
    await db.restaurantLead.update({
      where: { id: leadId },
      data: { internalNotes },
    });
    revalidatePath('/dashboard/restaurant-leads');
    return { success: true, message: 'Notes saved' };
  } catch {
    return { success: false, message: 'Failed to save notes' };
  }
}

export async function deleteLead(
  leadId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await verifyManagerOrAbove();
    await db.restaurantLead.delete({ where: { id: leadId } });
    revalidatePath('/dashboard/restaurant-leads');
    return { success: true, message: 'Lead deleted' };
  } catch {
    return { success: false, message: 'Failed to delete lead' };
  }
}
