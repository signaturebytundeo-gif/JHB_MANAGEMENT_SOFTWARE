'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { verifyManagerOrAbove } from '@/lib/dal';
import { createShipmentSchema, type ShipmentFormState } from '@/lib/validators/shipping';
import { createEasyPostShipment, refundEasyPostShipment } from '@/lib/easypost';
import { sendShippingConfirmationEmail } from '@/lib/emails/customer-emails';
import { voidUPSShipment, trackUPSShipment, validateUPSAddress } from '@/lib/ups';
import { ShipmentStatus } from '@prisma/client';
import Stripe from 'stripe';

// ============================================================================
// Stripe Order Fetching
// ============================================================================

export type StripeOrderData = {
  paymentIntentId: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  } | null;
  items: string;
  amount: number;
  createdAt: Date;
};

export async function getRecentStripeOrders(): Promise<StripeOrderData[]> {
  await verifyManagerOrAbove();

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.warn('STRIPE_SECRET_KEY not set, returning empty orders');
    return [];
  }

  try {
    const stripe = new Stripe(stripeKey);
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 30,
    });

    // Get existing shipments to filter out already-shipped orders
    const existingShipments = await db.shipment.findMany({
      where: { stripePaymentIntentId: { not: null } },
      select: { stripePaymentIntentId: true },
    });
    const shippedPIIds = new Set(
      existingShipments.map((s) => s.stripePaymentIntentId).filter(Boolean)
    );

    const orders: StripeOrderData[] = [];

    for (const pi of paymentIntents.data) {
      // Only include succeeded payments
      if (pi.status !== 'succeeded') continue;

      // Filter to JHB website orders if metadata is available
      const source = pi.metadata?.source;
      if (source && source !== 'jamaica-house-brand-checkout') continue;

      // Skip already-shipped orders
      if (shippedPIIds.has(pi.id)) continue;

      const customerName = pi.metadata?.customer_name
        || pi.shipping?.name
        || 'Unknown Customer';

      const customerEmail = pi.metadata?.customer_email
        || (pi.receipt_email ?? '');

      let shippingAddress: StripeOrderData['shippingAddress'] = null;

      // Try shipping address from PI
      if (pi.shipping?.address) {
        const addr = pi.shipping.address;
        shippingAddress = {
          line1: addr.line1 || '',
          line2: addr.line2 || undefined,
          city: addr.city || '',
          state: addr.state || '',
          zip: addr.postal_code || '',
          country: addr.country || 'US',
        };
      }

      // Try metadata for address
      if (!shippingAddress && pi.metadata?.shipping_address) {
        try {
          const parsed = JSON.parse(pi.metadata.shipping_address);
          shippingAddress = {
            line1: parsed.line1 || parsed.address_line1 || '',
            line2: parsed.line2 || parsed.address_line2 || undefined,
            city: parsed.city || '',
            state: parsed.state || '',
            zip: parsed.zip || parsed.postal_code || '',
            country: parsed.country || 'US',
          };
        } catch {
          // ignore parse errors
        }
      }

      const items = pi.metadata?.items || pi.description || 'Jamaica House Brand Products';

      orders.push({
        paymentIntentId: pi.id,
        customerName,
        customerEmail,
        shippingAddress,
        items,
        amount: pi.amount / 100, // cents to dollars
        createdAt: new Date(pi.created * 1000),
      });
    }

    return orders;
  } catch (error) {
    console.error('Error fetching Stripe orders:', error);
    return [];
  }
}

// ============================================================================
// Shipment CRUD
// ============================================================================

export async function getShipments(filters?: {
  status?: ShipmentStatus;
  page?: number;
  limit?: number;
}) {
  await verifyManagerOrAbove();

  const page = filters?.page || 1;
  const limit = filters?.limit || 25;
  const skip = (page - 1) * limit;

  const where = filters?.status ? { status: filters.status } : {};

  const [shipments, total] = await Promise.all([
    db.shipment.findMany({
      where,
      include: {
        createdBy: { select: { name: true } },
        shipFromLocation: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    db.shipment.count({ where }),
  ]);

  return {
    shipments: shipments.map((s) => ({
      ...s,
      weight: Number(s.weight),
      length: s.length ? Number(s.length) : null,
      width: s.width ? Number(s.width) : null,
      height: s.height ? Number(s.height) : null,
      shippingCost: s.shippingCost ? Number(s.shippingCost) : null,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getShipmentById(id: string) {
  await verifyManagerOrAbove();

  const shipment = await db.shipment.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      shipFromLocation: { select: { name: true } },
    },
  });

  if (!shipment) return null;

  return {
    ...shipment,
    weight: Number(shipment.weight),
    length: shipment.length ? Number(shipment.length) : null,
    width: shipment.width ? Number(shipment.width) : null,
    height: shipment.height ? Number(shipment.height) : null,
    shippingCost: shipment.shippingCost ? Number(shipment.shippingCost) : null,
  };
}

// ============================================================================
// Create Label
// ============================================================================

export async function createAndShipLabel(
  prevState: ShipmentFormState,
  formData: FormData
): Promise<ShipmentFormState> {
  try {
    const session = await verifyManagerOrAbove();

    const rawData = {
      recipientName: formData.get('recipientName') as string,
      recipientEmail: formData.get('recipientEmail') as string,
      recipientPhone: formData.get('recipientPhone') as string,
      addressLine1: formData.get('addressLine1') as string,
      addressLine2: formData.get('addressLine2') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zip: formData.get('zip') as string,
      country: (formData.get('country') as string) || 'US',
      weight: formData.get('weight') as string,
      length: formData.get('length') as string,
      width: formData.get('width') as string,
      height: formData.get('height') as string,
      serviceCode: (formData.get('serviceCode') as string) || 'Ground',
      carrier: (formData.get('carrier') as string) || 'UPS',
      websiteOrderId: (formData.get('websiteOrderId') as string) || undefined,
      shipFromLocationId: formData.get('shipFromLocationId') as string,
      stripePaymentIntentId: formData.get('stripePaymentIntentId') as string,
      orderNotes: formData.get('orderNotes') as string,
      items: formData.get('items') as string,
    };

    const validatedFields = createShipmentSchema.safeParse(rawData);

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const data = validatedFields.data;

    // Get ship-from location
    const location = await db.location.findUnique({
      where: { id: data.shipFromLocationId },
    });

    if (!location || !location.address) {
      return { message: 'Ship-from location not found or has no address' };
    }

    // Call EasyPost to create shipment and purchase label
    const easypostResult = await createEasyPostShipment({
      shipFrom: {
        name: process.env.SHIP_FROM_NAME ?? location.name,
        street1: process.env.SHIP_FROM_ADDRESS ?? (location.address || '12345 Main St'),
        city: process.env.SHIP_FROM_CITY ?? 'Miami',
        state: process.env.SHIP_FROM_STATE ?? 'FL',
        zip: process.env.SHIP_FROM_ZIP ?? '33101',
      },
      shipTo: {
        name: data.recipientName,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 || undefined,
        city: data.city,
        state: data.state.toUpperCase(),
        zip: data.zip,
        country: data.country || 'US',
        phone: data.recipientPhone || undefined,
      },
      packageWeightLbs: data.weight,  // DB stores lbs — easypost.ts converts to oz internally
      dimensions:
        data.length && data.width && data.height &&
        typeof data.length === 'number' && typeof data.width === 'number' && typeof data.height === 'number'
          ? { length: data.length, width: data.width, height: data.height }
          : undefined,
      carrier: (data.carrier as 'UPS' | 'USPS') ?? 'UPS',
    });

    // Create shipment record with EasyPost response data
    const shipment = await db.shipment.create({
      data: {
        recipientName: data.recipientName,
        recipientEmail: data.recipientEmail || null,
        recipientPhone: data.recipientPhone || null,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 || null,
        city: data.city,
        state: data.state.toUpperCase(),
        zip: data.zip,
        country: data.country || 'US',
        weight: data.weight,
        length: data.length && typeof data.length === 'number' ? data.length : null,
        width: data.width && typeof data.width === 'number' ? data.width : null,
        height: data.height && typeof data.height === 'number' ? data.height : null,
        serviceCode: data.serviceCode || 'Ground',
        shipFromLocationId: data.shipFromLocationId,
        stripePaymentIntentId: data.stripePaymentIntentId || null,
        orderNotes: data.orderNotes || null,
        items: data.items || null,
        easypostShipmentId: easypostResult.easypostShipmentId,
        websiteOrderId: data.websiteOrderId ?? null,
        trackingNumber: easypostResult.trackingNumber,
        labelData: easypostResult.labelData,
        labelFormat: easypostResult.labelFormat,
        shippingCost: easypostResult.shippingCost,
        status: ShipmentStatus.LABEL_CREATED,
        createdById: session.userId,
      },
    });

    // If linked to a WebsiteOrder, update its status to SHIPPED
    if (data.websiteOrderId) {
      await db.websiteOrder.update({
        where: { id: data.websiteOrderId },
        data: {
          status: 'SHIPPED',
          trackingNumber: easypostResult.trackingNumber,
          carrier: easypostResult.carrier,
          shippedAt: new Date(),
        },
      });
    }

    // Send shipping confirmation email when email address is available
    if (data.websiteOrderId && data.recipientEmail) {
      try {
        await sendShippingConfirmationEmail({
          customerFirstName: data.recipientName.split(' ')[0],
          customerEmail: data.recipientEmail,
          orderId: data.websiteOrderId,
          carrier: easypostResult.carrier,
          trackingNumber: easypostResult.trackingNumber,
        });
      } catch (emailError) {
        // Non-critical — label was created successfully; log and continue
        console.error('[createAndShipLabel] Shipping confirmation email failed:', emailError);
      }
    }

    revalidatePath('/dashboard/shipping');

    return {
      success: true,
      message: 'Label created successfully',
      shipmentId: shipment.id,
      trackingNumber: easypostResult.trackingNumber,
      labelData: easypostResult.labelData,
    };
  } catch (error) {
    console.error('Error creating shipment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create label';
    return { message: errorMessage };
  }
}

// ============================================================================
// Void Label
// ============================================================================

export async function voidShipmentLabel(shipmentId: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    await verifyManagerOrAbove();

    const shipment = await db.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) {
      return { success: false, message: 'Shipment not found' };
    }

    if (shipment.status !== ShipmentStatus.LABEL_CREATED) {
      return { success: false, message: 'Only labels with LABEL_CREATED status can be voided' };
    }

    if (!shipment.trackingNumber && !shipment.easypostShipmentId) {
      return { success: false, message: 'No tracking number to void' };
    }

    // EasyPost labels (new): refund via EasyPost API using shp_... ID
    // Legacy UPS labels (pre-migration): void via UPS direct API using tracking number
    if (shipment.easypostShipmentId) {
      await refundEasyPostShipment(shipment.easypostShipmentId);
    } else if (shipment.trackingNumber) {
      await voidUPSShipment(shipment.trackingNumber);
    }

    await db.shipment.update({
      where: { id: shipmentId },
      data: { status: ShipmentStatus.VOIDED },
    });

    revalidatePath('/dashboard/shipping');

    return { success: true, message: 'Label voided successfully' };
  } catch (error) {
    console.error('Error voiding shipment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to void label';
    return { success: false, message: errorMessage };
  }
}

// ============================================================================
// Refresh Tracking
// ============================================================================

export async function refreshTracking(shipmentId: string): Promise<{
  success: boolean;
  message: string;
  status?: string;
}> {
  try {
    await verifyManagerOrAbove();

    const shipment = await db.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment || !shipment.trackingNumber) {
      return { success: false, message: 'Shipment or tracking number not found' };
    }

    const tracking = await trackUPSShipment(shipment.trackingNumber);

    let newStatus = shipment.status;
    if (tracking.status === 'D' || tracking.statusDescription.toLowerCase().includes('delivered')) {
      newStatus = ShipmentStatus.DELIVERED;
    } else if (tracking.status === 'I' || tracking.status === 'P') {
      newStatus = ShipmentStatus.SHIPPED;
    }

    if (newStatus !== shipment.status) {
      await db.shipment.update({
        where: { id: shipmentId },
        data: {
          status: newStatus,
          shippedAt: newStatus === ShipmentStatus.SHIPPED ? new Date() : shipment.shippedAt,
        },
      });
    }

    revalidatePath('/dashboard/shipping');

    return {
      success: true,
      message: tracking.statusDescription,
      status: newStatus,
    };
  } catch (error) {
    console.error('Error refreshing tracking:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to refresh tracking';
    return { success: false, message: errorMessage };
  }
}

// ============================================================================
// Get Locations (for the ship-from dropdown)
// ============================================================================

export async function getShippingLocations() {
  await verifyManagerOrAbove();

  return db.location.findMany({
    where: { isActive: true },
    select: { id: true, name: true, type: true, address: true },
    orderBy: { name: 'asc' },
  });
}
