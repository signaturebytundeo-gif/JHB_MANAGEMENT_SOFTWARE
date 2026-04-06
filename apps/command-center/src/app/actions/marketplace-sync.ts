'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { verifyManagerOrAbove } from '@/lib/dal';
import { isPlatformConfigured, getMissingEnvVars } from '@/lib/integrations/config';
import { getRecentSquarePayments } from '@/lib/integrations/square';
import { getRecentAmazonOrders, getAmazonOrderStatuses } from '@/lib/integrations/amazon';
import { getRecentEtsyOrders, getEtsyFulfillmentData } from '@/lib/integrations/etsy';
import { getTrackingStatus } from '@/lib/easypost';
import { decomposeBundleInventory } from '@/lib/utils/bundle-decompose';
import type { SyncPlatform, SyncStatus, OrderStatus } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface PlatformStatus {
  platform: SyncPlatform;
  configured: boolean;
  missingVars: string[];
  lastSync?: {
    status: SyncStatus;
    startedAt: Date;
    completedAt: Date | null;
    recordsFound: number;
    recordsCreated: number;
    recordsSkipped: number;
    errorMessage: string | null;
  };
}

export interface SyncResult {
  success: boolean;
  message: string;
  recordsFound: number;
  recordsCreated: number;
  recordsSkipped: number;
}

// ============================================================================
// Status & History
// ============================================================================

export async function getMarketplaceStatus(): Promise<PlatformStatus[]> {
  const platforms: SyncPlatform[] = ['SQUARE', 'AMAZON', 'ETSY'];

  const statuses: PlatformStatus[] = [];

  for (const platform of platforms) {
    const configured = isPlatformConfigured(platform);
    const missingVars = getMissingEnvVars(platform);

    let lastSync: PlatformStatus['lastSync'];
    try {
      const sync = await db.marketplaceSync.findFirst({
        where: { platform },
        orderBy: { startedAt: 'desc' },
      });
      if (sync) {
        lastSync = {
          status: sync.status,
          startedAt: sync.startedAt,
          completedAt: sync.completedAt,
          recordsFound: sync.recordsFound,
          recordsCreated: sync.recordsCreated,
          recordsSkipped: sync.recordsSkipped,
          errorMessage: sync.errorMessage,
        };
      }
    } catch (err) {
      console.error(`[marketplace-sync] getMarketplaceStatus DB error for ${platform}:`, err);
    }

    statuses.push({ platform, configured, missingVars, lastSync });
  }

  return statuses;
}

export async function getSyncHistory(platform?: SyncPlatform) {
  try {
    const where = platform ? { platform } : undefined;

    const syncs = await db.marketplaceSync.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: 20,
      include: {
        triggeredBy: {
          select: { id: true, name: true },
        },
      },
    });

    return syncs;
  } catch (err) {
    console.error('[marketplace-sync] getSyncHistory error:', err);
    return [];
  }
}

// ============================================================================
// Helpers
// ============================================================================

async function getLastSuccessfulSyncDate(platform: SyncPlatform): Promise<Date> {
  // FIX: Only count SUCCESS (not PARTIAL) and use completedAt (not startedAt).
  // PARTIAL syncs from failed runs set a bad cursor that skips real orders.
  // 10-minute safety buffer catches orders in-flight during last sync.
  const lastSync = await db.marketplaceSync.findFirst({
    where: { platform, status: 'SUCCESS' },
    orderBy: { completedAt: 'desc' },
  });

  if (lastSync?.completedAt) {
    return new Date(lastSync.completedAt.getTime() - 10 * 60 * 1000);
  }

  // First sync: pull ALL historical orders
  return new Date('2020-01-01');
}

async function createSyncRecord(platform: SyncPlatform, userId: string) {
  return db.marketplaceSync.create({
    data: {
      platform,
      status: 'RUNNING',
      triggeredById: userId,
    },
  });
}

async function completeSyncRecord(
  syncId: string,
  status: SyncStatus,
  found: number,
  created: number,
  skipped: number,
  errorMessage?: string,
  errorDetails?: string
) {
  return db.marketplaceSync.update({
    where: { id: syncId },
    data: {
      status,
      completedAt: new Date(),
      recordsFound: found,
      recordsCreated: created,
      recordsSkipped: skipped,
      errorMessage,
      errorDetails,
    },
  });
}

// ============================================================================
// Square Sync
// ============================================================================

export async function syncSquarePayments(): Promise<SyncResult> {
  const session = await verifyManagerOrAbove();
  const syncRecord = await createSyncRecord('SQUARE', session.userId);

  try {
    if (!isPlatformConfigured('SQUARE')) {
      await completeSyncRecord(syncRecord.id, 'FAILED', 0, 0, 0, 'Square is not configured');
      return { success: false, message: 'Square is not configured', recordsFound: 0, recordsCreated: 0, recordsSkipped: 0 };
    }

    const sinceDate = await getLastSuccessfulSyncDate('SQUARE');
    const payments = await getRecentSquarePayments(sinceDate);

    // Find "Farmers Markets" channel
    const farmersChannel = await db.salesChannel.findFirst({
      where: { name: { contains: 'Farmers Market', mode: 'insensitive' } },
    });

    if (!farmersChannel) {
      await completeSyncRecord(syncRecord.id, 'FAILED', payments.length, 0, 0,
        'No "Farmers Markets" sales channel found. Please create one first.');
      return {
        success: false,
        message: 'No "Farmers Markets" sales channel found',
        recordsFound: payments.length, recordsCreated: 0, recordsSkipped: 0,
      };
    }

    // Load products for name matching
    const products = await db.product.findMany({ where: { isActive: true } });

    // Find Farmers Markets location for bundle component deduction
    const farmersLocation = await db.location.findFirst({
      where: { name: { contains: 'Farmers Market', mode: 'insensitive' }, isActive: true },
    });

    let created = 0;
    let skipped = 0;
    const unmatchedItems: string[] = [];

    for (const payment of payments) {
      // Dedup: check if we already have a sale with this referenceNumber
      const existing = await db.sale.findFirst({
        where: { referenceNumber: payment.paymentId },
      });
      if (existing) {
        skipped++;
        continue;
      }

      for (const lineItem of payment.lineItems) {
        // Matching strategy (in priority order):
        // 1. SKU exact match (best — unambiguous)
        // 2. Name + size combined match (e.g., "Original Jerk Sauce 2oz")
        // 3. Name + variation name (e.g., "Original Jerk Sauce" variation "2oz")
        // 4. Fallback to legacy name substring match
        const liName = lineItem.name.toLowerCase();
        const liSku = lineItem.sku?.toLowerCase();
        const liVariation = lineItem.variationName?.toLowerCase();

        let matchedProduct = liSku
          ? products.find((p) => p.sku.toLowerCase() === liSku)
          : undefined;

        if (!matchedProduct) {
          // Try matching with size/variation to disambiguate "Original Jerk Sauce 2oz" etc.
          matchedProduct = products.find((p) => {
            const pName = p.name.toLowerCase();
            const pSize = (p.size || '').toLowerCase();
            const combined = `${pName} ${pSize}`.trim();
            return (
              liName.includes(combined) ||
              combined.includes(liName) ||
              (liVariation && pSize && liVariation.includes(pSize)) ||
              (liName.includes(pName) && pSize && liName.includes(pSize))
            );
          });
        }

        if (!matchedProduct) {
          // Last resort: name substring match (original behavior)
          matchedProduct = products.find(
            (p) =>
              p.name.toLowerCase().includes(liName) ||
              liName.includes(p.name.toLowerCase())
          );
        }

        if (!matchedProduct) {
          unmatchedItems.push(`${lineItem.name} (payment ${payment.paymentId})`);
          continue;
        }

        const unitPrice = lineItem.amount / 100 / lineItem.quantity;
        const totalAmount = lineItem.amount / 100;

        await db.sale.create({
          data: {
            saleDate: payment.saleDate,
            channelId: farmersChannel.id,
            productId: matchedProduct.id,
            quantity: lineItem.quantity,
            unitPrice,
            totalAmount,
            paymentMethod: 'SQUARE',
            referenceNumber: payment.paymentId,
            notes: payment.note ? `Square: ${payment.note}` : 'Synced from Square',
            createdById: session.userId,
          },
        });

        // If product is a bundle, decompose inventory into components
        if (farmersLocation) {
          await decomposeBundleInventory(
            matchedProduct.id,
            farmersLocation.id,
            lineItem.quantity,
            session.userId,
            `Square ${payment.paymentId}`
          );
        }

        created++;
      }
    }

    const status: SyncStatus = unmatchedItems.length > 0 ? 'PARTIAL' : 'SUCCESS';
    const errorDetails = unmatchedItems.length > 0
      ? JSON.stringify({ unmatchedItems: unmatchedItems.slice(0, 50) })
      : undefined;

    await completeSyncRecord(
      syncRecord.id, status, payments.length, created, skipped,
      unmatchedItems.length > 0 ? `${unmatchedItems.length} unmatched line items` : undefined,
      errorDetails
    );

    revalidatePath('/dashboard/orders');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/events');

    return {
      success: true,
      message: `Synced ${created} sales from ${payments.length} Square payments` +
        (skipped > 0 ? ` (${skipped} duplicates skipped)` : '') +
        (unmatchedItems.length > 0 ? ` — ${unmatchedItems.length} items couldn't be matched to products` : ''),
      recordsFound: payments.length,
      recordsCreated: created,
      recordsSkipped: skipped,
    };
  } catch (error: any) {
    await completeSyncRecord(syncRecord.id, 'FAILED', 0, 0, 0, error.message);
    return { success: false, message: `Square sync failed: ${error.message}`, recordsFound: 0, recordsCreated: 0, recordsSkipped: 0 };
  }
}

// ============================================================================
// Amazon Sync
// ============================================================================

export async function syncAmazonOrders(): Promise<SyncResult> {
  const session = await verifyManagerOrAbove();
  const syncRecord = await createSyncRecord('AMAZON', session.userId);

  try {
    if (!isPlatformConfigured('AMAZON')) {
      await completeSyncRecord(syncRecord.id, 'FAILED', 0, 0, 0, 'Amazon is not configured');
      return { success: false, message: 'Amazon is not configured', recordsFound: 0, recordsCreated: 0, recordsSkipped: 0 };
    }

    const sinceDate = await getLastSuccessfulSyncDate('AMAZON');
    const amazonOrders = await getRecentAmazonOrders(sinceDate);

    let created = 0;
    let skipped = 0;

    for (const order of amazonOrders) {
      // Upsert customer
      const customer = await db.customer.upsert({
        where: { email: order.customerEmail },
        create: {
          email: order.customerEmail,
          firstName: order.firstName,
          lastName: order.lastName,
        },
        update: {
          firstName: order.firstName,
          lastName: order.lastName,
        },
      });

      // Create WebsiteOrder with dedup via P2002
      try {
        await db.websiteOrder.create({
          data: {
            orderId: `AMZ-${order.orderId}`,
            customerId: customer.id,
            items: JSON.stringify(
              order.items.map((i) => ({
                name: i.name,
                qty: i.quantity,
                price: i.price,
                sku: i.sku,
              }))
            ),
            shippingCost: Math.max(order.shippingCost, 0),
            orderTotal: order.orderTotal,
            status: 'NEW',
            source: 'AMAZON',
            orderDate: order.orderDate,
            shippingAddressLine1: order.shippingAddressLine1,
            shippingAddressLine2: order.shippingAddressLine2,
            shippingCity: order.shippingCity,
            shippingState: order.shippingState,
            shippingZip: order.shippingZip,
            shippingCountry: order.shippingCountry,
          },
        });

        // Update customer aggregates
        await db.customer.update({
          where: { id: customer.id },
          data: {
            orderCount: { increment: 1 },
            totalSpent: { increment: order.orderTotal },
          },
        });

        created++;
      } catch (error: any) {
        if (error?.code === 'P2002') {
          skipped++;
        } else {
          throw error;
        }
      }
    }

    await completeSyncRecord(syncRecord.id, 'SUCCESS', amazonOrders.length, created, skipped);

    revalidatePath('/dashboard/orders');
    revalidatePath('/dashboard/customers');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: `Synced ${created} Amazon orders` +
        (skipped > 0 ? ` (${skipped} duplicates skipped)` : ''),
      recordsFound: amazonOrders.length,
      recordsCreated: created,
      recordsSkipped: skipped,
    };
  } catch (error: any) {
    await completeSyncRecord(syncRecord.id, 'FAILED', 0, 0, 0, error.message);
    return { success: false, message: `Amazon sync failed: ${error.message}`, recordsFound: 0, recordsCreated: 0, recordsSkipped: 0 };
  }
}

// ============================================================================
// Etsy Sync
// ============================================================================

export async function syncEtsyOrders(): Promise<SyncResult> {
  const session = await verifyManagerOrAbove();
  const syncRecord = await createSyncRecord('ETSY', session.userId);

  try {
    if (!isPlatformConfigured('ETSY')) {
      await completeSyncRecord(syncRecord.id, 'FAILED', 0, 0, 0, 'Etsy is not configured');
      return { success: false, message: 'Etsy is not configured', recordsFound: 0, recordsCreated: 0, recordsSkipped: 0 };
    }

    const sinceDate = await getLastSuccessfulSyncDate('ETSY');
    const etsyOrders = await getRecentEtsyOrders(sinceDate);

    let created = 0;
    let skipped = 0;

    for (const order of etsyOrders) {
      // FIX (Bug 6): Etsy masks buyer emails as {id}@marketplace.etsy.com.
      // Use synthetic email for masked addresses to avoid bad customer dedup.
      const isRealEmail = order.customerEmail && !order.customerEmail.includes('@marketplace.etsy.com');
      const emailKey = isRealEmail
        ? order.customerEmail
        : `etsy-buyer-${order.orderId}@noreply.jhb.internal`;

      const customer = await db.customer.upsert({
        where: { email: emailKey },
        create: {
          email: emailKey,
          firstName: order.firstName,
          lastName: order.lastName,
        },
        update: {
          firstName: order.firstName,
          lastName: order.lastName,
        },
      });

      // Create WebsiteOrder with dedup via P2002
      try {
        await db.websiteOrder.create({
          data: {
            orderId: `ETSY-${order.orderId}`,
            customerId: customer.id,
            items: JSON.stringify(
              order.items.map((i) => ({
                name: i.name,
                qty: i.quantity,
                price: i.price,
                sku: i.sku,
              }))
            ),
            shippingCost: order.shippingCost,
            orderTotal: order.orderTotal,
            status: 'NEW',
            source: 'ETSY',
            orderDate: order.orderDate,
            shippingAddressLine1: order.shippingAddressLine1,
            shippingAddressLine2: order.shippingAddressLine2,
            shippingCity: order.shippingCity,
            shippingState: order.shippingState,
            shippingZip: order.shippingZip,
            shippingCountry: order.shippingCountry,
          },
        });

        // Update customer aggregates
        await db.customer.update({
          where: { id: customer.id },
          data: {
            orderCount: { increment: 1 },
            totalSpent: { increment: order.orderTotal },
          },
        });

        created++;
      } catch (error: any) {
        if (error?.code === 'P2002') {
          skipped++;
        } else {
          throw error;
        }
      }
    }

    await completeSyncRecord(syncRecord.id, 'SUCCESS', etsyOrders.length, created, skipped);

    revalidatePath('/dashboard/orders');
    revalidatePath('/dashboard/customers');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: `Synced ${created} Etsy orders` +
        (skipped > 0 ? ` (${skipped} duplicates skipped)` : ''),
      recordsFound: etsyOrders.length,
      recordsCreated: created,
      recordsSkipped: skipped,
    };
  } catch (error: any) {
    await completeSyncRecord(syncRecord.id, 'FAILED', 0, 0, 0, error.message);
    return { success: false, message: `Etsy sync failed: ${error.message}`, recordsFound: 0, recordsCreated: 0, recordsSkipped: 0 };
  }
}

// ============================================================================
// Fulfillment Status Sync — update order statuses + tracking from marketplaces
// ============================================================================

export async function syncFulfillmentStatuses(): Promise<SyncResult> {
  await verifyManagerOrAbove();

  let updated = 0;
  let found = 0;
  const errors: string[] = [];

  // ── Amazon: update order statuses ──────────────────────────────────
  try {
    const amazonOrders = await db.websiteOrder.findMany({
      where: { source: 'AMAZON', status: { in: ['NEW', 'PROCESSING'] } },
      select: { id: true, orderId: true },
    });

    if (amazonOrders.length > 0) {
      // Strip "AMZ-" prefix to get real Amazon order IDs
      const amazonIds = amazonOrders.map((o) => o.orderId.replace('AMZ-', ''));
      const statuses = await getAmazonOrderStatuses(amazonIds);

      for (const status of statuses) {
        const dbOrder = amazonOrders.find(
          (o) => o.orderId === `AMZ-${status.orderId}`
        );
        if (!dbOrder) continue;

        const STATUS_MAP: Record<string, OrderStatus> = {
          Shipped: 'SHIPPED',
          Delivered: 'DELIVERED',
          Cancelled: 'CANCELLED',
        };
        const newStatus = STATUS_MAP[status.orderStatus];

        if (newStatus) {
          await db.websiteOrder.update({
            where: { id: dbOrder.id },
            data: {
              status: newStatus,
              ...(newStatus === 'SHIPPED' ? { shippedAt: new Date() } : {}),
            },
          });
          updated++;
        }
        found++;
      }
    }
  } catch (err: any) {
    errors.push(`Amazon: ${err.message}`);
  }

  // ── Etsy: update statuses + tracking ───────────────────────────────
  try {
    const etsyOrders = await db.websiteOrder.findMany({
      where: { source: 'ETSY', status: { in: ['NEW', 'PROCESSING'] } },
      select: { id: true, orderId: true },
    });

    if (etsyOrders.length > 0) {
      // Strip "ETSY-" prefix to get real receipt IDs
      const receiptIds = etsyOrders.map((o) => o.orderId.replace('ETSY-', ''));
      const fulfillments = await getEtsyFulfillmentData(receiptIds);

      for (const f of fulfillments) {
        const dbOrder = etsyOrders.find(
          (o) => o.orderId === `ETSY-${f.receiptId}`
        );
        if (!dbOrder) continue;

        if (f.isShipped) {
          await db.websiteOrder.update({
            where: { id: dbOrder.id },
            data: {
              status: 'SHIPPED' as OrderStatus,
              trackingNumber: f.trackingCode,
              carrier: f.carrierName,
              shippedAt: f.shippedTimestamp || new Date(),
            },
          });
          updated++;
        }
        found++;
      }
    }
  } catch (err: any) {
    errors.push(`Etsy: ${err.message}`);
  }

  // ── Tracking check: update SHIPPED → DELIVERED via carrier tracking ──
  try {
    const shippedOrders = await db.websiteOrder.findMany({
      where: {
        status: 'SHIPPED',
        trackingNumber: { not: null },
      },
      select: { id: true, trackingNumber: true, carrier: true },
    });

    if (shippedOrders.length > 0) {
      // Check tracking in batches of 10 to avoid rate limits
      for (let i = 0; i < shippedOrders.length; i += 10) {
        const batch = shippedOrders.slice(i, i + 10);

        for (const order of batch) {
          if (!order.trackingNumber) continue;

          const tracking = await getTrackingStatus(
            order.trackingNumber,
            order.carrier
          );

          if (tracking?.status === 'delivered') {
            await db.websiteOrder.update({
              where: { id: order.id },
              data: {
                status: 'DELIVERED' as OrderStatus,
              },
            });
            updated++;
          }
          found++;
        }
      }
    }
  } catch (err: any) {
    errors.push(`Tracking: ${err.message}`);
  }

  revalidatePath('/dashboard/orders');
  revalidatePath('/dashboard');

  const message = `Updated ${updated} order statuses` +
    (found > 0 ? ` (${found} checked)` : '') +
    (errors.length > 0 ? ` — Errors: ${errors.join('; ')}` : '');

  return {
    success: errors.length === 0,
    message,
    recordsFound: found,
    recordsCreated: updated,
    recordsSkipped: 0,
  };
}
