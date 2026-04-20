'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { verifySession, verifyManagerOrAbove } from '@/lib/dal';
import {
  createEventSchema,
  updateEventSchema,
  type EventFormState,
} from '@/lib/validators/events';
import { getRecentSquarePayments } from '@/lib/integrations/square';
import { isPlatformConfigured } from '@/lib/integrations/config';
import { decomposeBundleInventory } from '@/lib/utils/bundle-decompose';
import { matchSquareItem } from '@/lib/utils/square-match';

export async function createEvent(
  prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  try {
    const session = await verifyManagerOrAbove();

    const validatedFields = createEventSchema.safeParse({
      name: formData.get('name'),
      eventDate: formData.get('eventDate'),
      location: formData.get('location') || undefined,
      channelId: formData.get('channelId'),
      boothFee: formData.get('boothFee') || 0,
      travelCost: formData.get('travelCost') || 0,
      supplyCost: formData.get('supplyCost') || 0,
      laborCost: formData.get('laborCost') || 0,
      otherCost: formData.get('otherCost') || 0,
      notes: formData.get('notes') || undefined,
    });

    if (!validatedFields.success) {
      return { errors: validatedFields.error.flatten().fieldErrors };
    }

    const data = validatedFields.data;

    await db.marketEvent.create({
      data: {
        name: data.name,
        eventDate: data.eventDate,
        location: data.location,
        channelId: data.channelId,
        boothFee: data.boothFee,
        travelCost: data.travelCost,
        supplyCost: data.supplyCost,
        laborCost: data.laborCost,
        otherCost: data.otherCost,
        notes: data.notes,
        createdById: session.userId,
      },
    });

    revalidatePath('/dashboard/events');
    return { success: true, message: 'Event created successfully' };
  } catch (error) {
    console.error('Error creating event:', error);
    return { message: 'Failed to create event' };
  }
}

export async function updateEvent(
  prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  try {
    await verifyManagerOrAbove();

    const validatedFields = updateEventSchema.safeParse({
      eventId: formData.get('eventId'),
      name: formData.get('name'),
      eventDate: formData.get('eventDate'),
      location: formData.get('location') || undefined,
      channelId: formData.get('channelId'),
      boothFee: formData.get('boothFee') || 0,
      travelCost: formData.get('travelCost') || 0,
      supplyCost: formData.get('supplyCost') || 0,
      laborCost: formData.get('laborCost') || 0,
      otherCost: formData.get('otherCost') || 0,
      notes: formData.get('notes') || undefined,
    });

    if (!validatedFields.success) {
      return { errors: validatedFields.error.flatten().fieldErrors };
    }

    const { eventId, ...data } = validatedFields.data;

    await db.marketEvent.update({
      where: { id: eventId },
      data,
    });

    revalidatePath('/dashboard/events');
    revalidatePath(`/dashboard/events/${eventId}`);
    return { success: true, message: 'Event updated successfully' };
  } catch (error) {
    console.error('Error updating event:', error);
    return { message: 'Failed to update event' };
  }
}

export async function deleteEvent(eventId: string) {
  try {
    await verifyManagerOrAbove();

    // Unlink all sales first
    await db.sale.updateMany({
      where: { eventId },
      data: { eventId: null },
    });

    await db.marketEvent.delete({ where: { id: eventId } });

    revalidatePath('/dashboard/events');
    return { success: true, message: 'Event deleted' };
  } catch (error) {
    console.error('Error deleting event:', error);
    return { message: 'Failed to delete event' };
  }
}

export async function getEvents(filters?: { dateFrom?: string; dateTo?: string }) {
  try {
    await verifySession();

    const where: any = {};
    if (filters?.dateFrom || filters?.dateTo) {
      where.eventDate = {};
      if (filters.dateFrom) where.eventDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.eventDate.lte = new Date(filters.dateTo);
    }

    const events = await db.marketEvent.findMany({
      where,
      include: {
        channel: true,
        sales: {
          select: { totalAmount: true },
        },
      },
      orderBy: { eventDate: 'desc' },
    });

    return events.map((e) => {
      const revenue = e.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
      const costs =
        Number(e.boothFee) +
        Number(e.travelCost) +
        Number(e.supplyCost) +
        Number(e.laborCost) +
        Number(e.otherCost);
      return {
        id: e.id,
        name: e.name,
        eventDate: e.eventDate,
        location: e.location,
        channelName: e.channel.name,
        channelId: e.channelId,
        salesCount: e.sales.length,
        revenue,
        costs,
        netPnL: revenue - costs,
        boothFee: Number(e.boothFee),
        travelCost: Number(e.travelCost),
        supplyCost: Number(e.supplyCost),
        laborCost: Number(e.laborCost),
        otherCost: Number(e.otherCost),
        notes: e.notes,
      };
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

export async function getEventById(id: string) {
  try {
    await verifySession();

    const event = await db.marketEvent.findUnique({
      where: { id },
      include: {
        channel: true,
        createdBy: { select: { id: true, name: true } },
        sales: {
          include: {
            product: { select: { id: true, name: true } },
          },
          orderBy: { saleDate: 'desc' },
        },
      },
    });

    if (!event) return null;

    const revenue = event.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const costs =
      Number(event.boothFee) +
      Number(event.travelCost) +
      Number(event.supplyCost) +
      Number(event.laborCost) +
      Number(event.otherCost);

    // Aggregate items sold by product
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const sale of event.sales) {
      const key = sale.product.id;
      const existing = productMap.get(key);
      if (existing) {
        existing.quantity += sale.quantity;
        existing.revenue += Number(sale.totalAmount);
      } else {
        productMap.set(key, {
          name: sale.product.name,
          quantity: sale.quantity,
          revenue: Number(sale.totalAmount),
        });
      }
    }
    const itemsSold = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);
    const totalItemsSold = itemsSold.reduce((sum, i) => sum + i.quantity, 0);

    return {
      ...event,
      boothFee: Number(event.boothFee),
      travelCost: Number(event.travelCost),
      supplyCost: Number(event.supplyCost),
      laborCost: Number(event.laborCost),
      otherCost: Number(event.otherCost),
      sales: event.sales.map((s) => ({
        ...s,
        unitPrice: Number(s.unitPrice),
        totalAmount: Number(s.totalAmount),
      })),
      revenue,
      costs,
      netPnL: revenue - costs,
      itemsSold,
      totalItemsSold,
    };
  } catch (error) {
    console.error('Error fetching event:', error);
    return null;
  }
}

export async function getUnassignedSquareSales(dateFrom?: string, dateTo?: string) {
  try {
    await verifySession();

    const where: any = {
      paymentMethod: 'SQUARE',
      eventId: null,
    };

    if (dateFrom || dateTo) {
      where.saleDate = {};
      if (dateFrom) where.saleDate.gte = new Date(dateFrom);
      if (dateTo) where.saleDate.lte = new Date(dateTo);
    }

    const sales = await db.sale.findMany({
      where,
      include: {
        product: { select: { id: true, name: true } },
      },
      orderBy: { saleDate: 'desc' },
    });

    return sales.map((s) => ({
      ...s,
      unitPrice: Number(s.unitPrice),
      totalAmount: Number(s.totalAmount),
    }));
  } catch (error) {
    console.error('Error fetching unassigned sales:', error);
    return [];
  }
}

export async function getUnassignedSalesCount() {
  try {
    return await db.sale.count({
      where: { paymentMethod: 'SQUARE', eventId: null },
    });
  } catch {
    return 0;
  }
}

export async function assignSalesToEvent(eventId: string, saleIds: string[]) {
  try {
    await verifyManagerOrAbove();

    await db.sale.updateMany({
      where: { id: { in: saleIds } },
      data: { eventId },
    });

    revalidatePath('/dashboard/events');
    revalidatePath(`/dashboard/events/${eventId}`);
    return { success: true, message: `${saleIds.length} sale(s) assigned` };
  } catch (error) {
    console.error('Error assigning sales:', error);
    return { message: 'Failed to assign sales' };
  }
}

export async function addManualSaleToEvent(
  eventId: string,
  productId: string,
  quantity: number,
  unitPrice: number,
  notes?: string
) {
  try {
    const session = await verifyManagerOrAbove();

    const event = await db.marketEvent.findUnique({
      where: { id: eventId },
      select: { channelId: true, eventDate: true },
    });
    if (!event) return { message: 'Event not found' };

    const totalAmount = quantity * unitPrice;

    await db.sale.create({
      data: {
        saleDate: event.eventDate,
        channelId: event.channelId,
        productId,
        eventId,
        quantity,
        unitPrice,
        totalAmount,
        paymentMethod: 'CASH',
        notes: notes || 'Manual event sale',
        createdById: session.userId,
      },
    });

    revalidatePath(`/dashboard/events/${eventId}`);
    revalidatePath('/dashboard/events');
    revalidatePath('/dashboard/orders');
    return { success: true, message: 'Sale added to event' };
  } catch (error) {
    console.error('Error adding manual sale:', error);
    return { message: 'Failed to add sale' };
  }
}

export async function unassignSalesFromEvent(saleIds: string[]) {
  try {
    await verifyManagerOrAbove();

    await db.sale.updateMany({
      where: { id: { in: saleIds } },
      data: { eventId: null },
    });

    revalidatePath('/dashboard/events');
    return { success: true, message: `${saleIds.length} sale(s) unassigned` };
  } catch (error) {
    console.error('Error unassigning sales:', error);
    return { message: 'Failed to unassign sales' };
  }
}

// ============================================================================
// Square ↔ Event Reconciliation
// ============================================================================

export interface EventSquareSyncResult {
  success: boolean;
  message: string;
  squarePayments: number;
  salesCreated: number;
  salesNeedReview: number;
  duplicatesSkipped: number;
  unmatchedItems: string[];
  squareTotal: number;    // dollars (gross, tax-inclusive)
  squareTax: number;      // dollars (tax collected)
  squareNetSales: number; // dollars (gross - tax)
  eventTotal: number;     // dollars
}

export interface GlobalSquareSyncResult {
  success: boolean;
  message: string;
  totalPayments: number;
  eventsMatched: number;
  salesCreated: number;
  duplicatesSkipped: number;
  unmatchedPayments: number;
  totalSquareAmount: number;
  dateRange: string;
  eventDetails: Array<{
    eventName: string;
    eventDate: string;
    salesCreated: number;
    squareAmount: number;
  }>;
}

/**
 * Pull Square payments for a specific event date, match to products,
 * and create Sale records linked directly to the event.
 */
export async function syncSquareForEvent(eventId: string): Promise<EventSquareSyncResult> {
  try {
    const session = await verifyManagerOrAbove();

    if (!isPlatformConfigured('SQUARE')) {
      return {
        success: false,
        message: 'Square is not configured — add SQUARE_ACCESS_TOKEN to env',
        squarePayments: 0, salesCreated: 0, salesNeedReview: 0, duplicatesSkipped: 0, unmatchedItems: [], squareTotal: 0, squareTax: 0, squareNetSales: 0, eventTotal: 0,
      };
    }

    const event = await db.marketEvent.findUnique({
      where: { id: eventId },
      include: {
        channel: true,
        sales: { select: { totalAmount: true } },
      },
    });
    if (!event) return { success: false, message: 'Event not found', squarePayments: 0, salesCreated: 0, salesNeedReview: 0, duplicatesSkipped: 0, unmatchedItems: [], squareTotal: 0, squareTax: 0, squareNetSales: 0, eventTotal: 0 };

    // Fetch Square payments for the event date (start of day → end of day UTC).
    // Event dates are stored as midnight UTC (e.g., 2026-04-04T00:00:00Z).
    // Use UTC methods so local timezone doesn't shift the date window.
    const dayStart = new Date(event.eventDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(event.eventDate);
    dayEnd.setUTCHours(23, 59, 59, 999);
    console.log(`[event-sync] ${event.name}: querying Square ${dayStart.toISOString()} → ${dayEnd.toISOString()}`);

    const payments = await getRecentSquarePayments(dayStart, dayEnd);
    const squareTotal = payments.reduce((s, p) => s + p.amount, 0) / 100;
    const squareTax = payments.reduce((s, p) => s + p.taxAmount, 0) / 100;
    const squareNetSales = squareTotal - squareTax;

    // Load products for name matching
    const products = await db.product.findMany({ where: { isActive: true } });

    // Catch-all product for unknown/custom amounts — ensures totals always reconcile
    let customProduct = products.find((p) => p.sku === 'JHB-CUSTOM');
    if (!customProduct) {
      customProduct = await db.product.upsert({
        where: { sku: 'JHB-CUSTOM' },
        update: {},
        create: {
          name: 'Custom Sale',
          sku: 'JHB-CUSTOM',
          size: 'misc',
          description: 'Catch-all for custom amounts',
          reorderPoint: 0,
          leadTimeDays: 0,
          isActive: true,
        },
      });
    }

    // Find Farmers Markets location for bundle decomposition
    const farmersLocation = await db.location.findFirst({
      where: { name: { contains: 'Farmers Market', mode: 'insensitive' }, isActive: true },
    });

    let salesCreated = 0;
    let salesNeedReview = 0;
    let duplicatesSkipped = 0;
    const unmatchedItems: string[] = [];

    for (const payment of payments) {
      // Dedup by Square payment ID
      const existing = await db.sale.findFirst({
        where: { referenceNumber: payment.paymentId },
      });
      if (existing) {
        // If already exists but not assigned to this event, assign it
        if (!existing.eventId || existing.eventId !== eventId) {
          await db.sale.update({
            where: { id: existing.id },
            data: { eventId },
          });
        }
        duplicatesSkipped++;
        continue;
      }

      for (const lineItem of payment.lineItems) {
        const match = matchSquareItem(
          lineItem.name,
          lineItem.sku,
          lineItem.variationName,
          products
        );

        const unitPrice = lineItem.amount / 100 / lineItem.quantity;
        const totalAmount = lineItem.amount / 100;

        // Determine product + note based on match result
        let productId: string;
        let saleNote = '';

        if (match) {
          productId = match.product.id;
          if (match.confidence === 'medium') {
            saleNote = `⚠ Review: "${lineItem.name}" auto-matched to ${match.product.name}`;
            salesNeedReview++;
          }
        } else {
          // No match — log under "Custom Sale" so dollar totals always reconcile.
          // This covers "Unknown Item", custom amounts, and truly new products.
          productId = customProduct.id;
          saleNote = `⚠ Custom: "${lineItem.name}" ($${totalAmount.toFixed(2)}) — no product match`;
          salesNeedReview++;
        }

        if (payment.note) {
          saleNote = saleNote ? `${saleNote} | Square: ${payment.note}` : `Square: ${payment.note}`;
        }
        if (!saleNote) {
          saleNote = 'Synced from Square';
        }

        await db.sale.create({
          data: {
            saleDate: payment.saleDate,
            channelId: event.channelId,
            productId,
            eventId,
            quantity: lineItem.quantity,
            unitPrice,
            totalAmount,
            paymentMethod: 'SQUARE',
            referenceNumber: payment.paymentId,
            notes: saleNote,
            createdById: session.userId,
          },
        });

        // Bundle inventory decomposition (skip for custom sales)
        if (match && farmersLocation) {
          await decomposeBundleInventory(
            match.product.id,
            farmersLocation.id,
            lineItem.quantity,
            session.userId,
            `Square event sync: ${payment.paymentId}`
          );
        }

        salesCreated++;
      }
    }

    // Compute post-sync event total
    const updatedSales = await db.sale.findMany({
      where: { eventId },
      select: { totalAmount: true },
    });
    const eventTotal = updatedSales.reduce((s, sale) => s + Number(sale.totalAmount), 0);

    revalidatePath(`/dashboard/events/${eventId}`);
    revalidatePath('/dashboard/events');
    revalidatePath('/dashboard/orders');

    return {
      success: true,
      message: `Synced ${salesCreated} sales from ${payments.length} Square payments for ${event.name}` +
        (salesNeedReview > 0 ? ` — ${salesNeedReview} need review (⚠ items)` : '') +
        (duplicatesSkipped > 0 ? ` (${duplicatesSkipped} already synced)` : ''),
      squarePayments: payments.length,
      salesCreated,
      salesNeedReview,
      duplicatesSkipped,
      unmatchedItems,
      squareTotal,
      squareTax,
      squareNetSales,
      eventTotal,
    };
  } catch (error: any) {
    console.error('Error syncing Square for event:', error);
    return {
      success: false,
      message: `Sync failed: ${error.message}`,
      squarePayments: 0, salesCreated: 0, salesNeedReview: 0, duplicatesSkipped: 0,
      unmatchedItems: [], squareTotal: 0, squareTax: 0, squareNetSales: 0, eventTotal: 0,
    };
  }
}

/**
 * Global Square sync - automatically matches Square transactions to events by date
 */
export async function globalSquareSync(
  dateFrom?: string, // YYYY-MM-DD
  dateTo?: string    // YYYY-MM-DD
): Promise<GlobalSquareSyncResult> {
  try {
    const session = await verifyManagerOrAbove();

    if (!isPlatformConfigured('SQUARE')) {
      return {
        success: false,
        message: 'Square is not configured — add SQUARE_ACCESS_TOKEN to env',
        totalPayments: 0,
        eventsMatched: 0,
        salesCreated: 0,
        duplicatesSkipped: 0,
        unmatchedPayments: 0,
        totalSquareAmount: 0,
        dateRange: '',
        eventDetails: [],
      };
    }

    // Default to last 30 days if no date range provided
    const endDate = dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : new Date();
    const startDate = dateFrom
      ? new Date(`${dateFrom}T00:00:00.000Z`)
      : new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days ago

    console.log(`[global-square-sync] Syncing ${startDate.toISOString()} → ${endDate.toISOString()}`);

    // Get all Square payments in date range
    const payments = await getRecentSquarePayments(startDate, endDate);

    if (payments.length === 0) {
      return {
        success: true,
        message: 'No Square payments found in date range',
        totalPayments: 0,
        eventsMatched: 0,
        salesCreated: 0,
        duplicatesSkipped: 0,
        unmatchedPayments: 0,
        totalSquareAmount: 0,
        dateRange: `${startDate.toDateString()} to ${endDate.toDateString()}`,
        eventDetails: [],
      };
    }

    // Get all events in the same date range
    const events = await db.marketEvent.findMany({
      where: {
        eventDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        channel: true,
        sales: { select: { totalAmount: true } },
      },
      orderBy: { eventDate: 'asc' },
    });

    // Group payments by date (YYYY-MM-DD)
    const paymentsByDate = new Map<string, typeof payments>();
    for (const payment of payments) {
      const dateKey = payment.saleDate.toISOString().split('T')[0];
      if (!paymentsByDate.has(dateKey)) {
        paymentsByDate.set(dateKey, []);
      }
      paymentsByDate.get(dateKey)!.push(payment);
    }

    // Group events by date
    const eventsByDate = new Map<string, typeof events[0]>();
    for (const event of events) {
      const dateKey = event.eventDate.toISOString().split('T')[0];
      eventsByDate.set(dateKey, event);
    }

    let totalSalesCreated = 0;
    let totalDuplicatesSkipped = 0;
    let eventsMatched = 0;
    let unmatchedPayments = 0;
    const eventDetails: GlobalSquareSyncResult['eventDetails'] = [];

    // Process each date
    for (const [dateKey, datePayments] of paymentsByDate) {
      const event = eventsByDate.get(dateKey);

      if (!event) {
        console.log(`[global-sync] No event found for date ${dateKey}, skipping ${datePayments.length} payments`);
        unmatchedPayments += datePayments.length;
        continue;
      }

      console.log(`[global-sync] Processing ${datePayments.length} payments for event "${event.name}" on ${dateKey}`);

      // Use the existing sync logic for this event
      const result = await syncSquareForEvent(event.id);

      if (result.success) {
        eventsMatched++;
        totalSalesCreated += result.salesCreated;
        totalDuplicatesSkipped += result.duplicatesSkipped;

        eventDetails.push({
          eventName: event.name,
          eventDate: event.eventDate.toISOString().split('T')[0],
          salesCreated: result.salesCreated,
          squareAmount: result.squareTotal,
        });
      } else {
        console.error(`[global-sync] Failed to sync event ${event.name}: ${result.message}`);
        unmatchedPayments += datePayments.length;
      }
    }

    const totalSquareAmount = payments.reduce((sum, p) => sum + p.amount, 0) / 100;

    return {
      success: true,
      message: `Synced ${totalSalesCreated} sales across ${eventsMatched} events`,
      totalPayments: payments.length,
      eventsMatched,
      salesCreated: totalSalesCreated,
      duplicatesSkipped: totalDuplicatesSkipped,
      unmatchedPayments,
      totalSquareAmount,
      dateRange: `${startDate.toDateString()} to ${endDate.toDateString()}`,
      eventDetails,
    };

  } catch (error: any) {
    console.error('Error in global Square sync:', error);
    return {
      success: false,
      message: `Global sync failed: ${error.message}`,
      totalPayments: 0,
      eventsMatched: 0,
      salesCreated: 0,
      duplicatesSkipped: 0,
      unmatchedPayments: 0,
      totalSquareAmount: 0,
      dateRange: '',
      eventDetails: [],
    };
  }
}
