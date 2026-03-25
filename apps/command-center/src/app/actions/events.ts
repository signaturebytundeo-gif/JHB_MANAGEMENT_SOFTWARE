'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { verifySession, verifyManagerOrAbove } from '@/lib/dal';
import {
  createEventSchema,
  updateEventSchema,
  type EventFormState,
} from '@/lib/validators/events';

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
