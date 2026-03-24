'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { verifyManagerOrAbove } from '@/lib/dal';
import { isPlatformConfigured, getMissingEnvVars } from '@/lib/integrations/config';
import { getRecentSquarePayments } from '@/lib/integrations/square';
import { getRecentAmazonOrders } from '@/lib/integrations/amazon';
import { getRecentEtsyOrders } from '@/lib/integrations/etsy';
import type { SyncPlatform, SyncStatus } from '@prisma/client';

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
    } catch {
      // DB not migrated yet — leave undefined
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
  } catch {
    return [];
  }
}

// ============================================================================
// Helpers
// ============================================================================

async function getLastSuccessfulSyncDate(platform: SyncPlatform): Promise<Date> {
  const lastSync = await db.marketplaceSync.findFirst({
    where: { platform, status: { in: ['SUCCESS', 'PARTIAL'] } },
    orderBy: { startedAt: 'desc' },
  });

  if (lastSync?.startedAt) {
    return lastSync.startedAt;
  }

  // First sync: pull ALL historical orders
  return new Date('2010-01-01');
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
        // Try to match product by name (case-insensitive partial match)
        const matchedProduct = products.find(
          (p) =>
            p.name.toLowerCase().includes(lineItem.name.toLowerCase()) ||
            lineItem.name.toLowerCase().includes(p.name.toLowerCase())
        );

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
