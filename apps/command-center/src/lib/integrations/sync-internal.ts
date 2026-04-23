/**
 * sync-internal.ts
 *
 * Cron-safe variants of the three marketplace sync functions.
 * These are identical to the server action logic in marketplace-sync.ts EXCEPT:
 *   - No verifyManagerOrAbove() or verifySession() call
 *   - Accept userId: string | null — passed to triggeredById (and createdById where required)
 *   - No revalidatePath() calls (no-op in cron context, omitted entirely)
 *
 * Used exclusively by /api/cron/sync-* route handlers.
 */

import { db } from '@/lib/db';
import { isPlatformConfigured } from './config';
import { getAmazonConfig } from './config';
import { getRecentSquarePayments } from './square';
import { getRecentEtsyOrders } from './etsy';
import { autoCreateProductFromSquareItem } from '@/lib/utils/auto-create-product';
import type { SyncStatus } from '@prisma/client';

export type { SyncResult } from '@/app/actions/marketplace-sync';

// Re-import the SyncResult interface locally to avoid circular dep issues
interface SyncResult {
  success: boolean;
  message: string;
  recordsFound: number;
  recordsCreated: number;
  recordsSkipped: number;
}

// ============================================================================
// Amazon SP-API helpers (local — spApiGet is not exported from amazon.ts)
// ============================================================================

const SP_API_BASE = 'https://sellingpartnerapi-na.amazon.com';
const TOKEN_URL = 'https://api.amazon.com/auth/o2/token';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const config = getAmazonConfig();
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Amazon OAuth failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

async function spApiGet(path: string, params?: Record<string, string>): Promise<any> {
  const token = await getAccessToken();

  const url = new URL(path, SP_API_BASE);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-amz-access-token': token,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Amazon SP-API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// ============================================================================
// Helpers
// ============================================================================

async function getLastSuccessfulSyncDate(platform: 'SQUARE' | 'AMAZON' | 'ETSY'): Promise<Date> {
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

/**
 * Resolve a fallback userId for Sale.createdById (non-nullable FK).
 * When userId is null (cron context), find the first admin user.
 * Returns null if no user exists — caller must handle.
 */
async function resolveCreatedById(userId: string | null): Promise<string | null> {
  if (userId) return userId;
  const admin = await db.user.findFirst({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  return admin?.id ?? null;
}

// ============================================================================
// Square Sync (internal, no session)
// ============================================================================

export async function runSquareSyncInternal(userId: string | null): Promise<SyncResult> {
  const syncRecord = await db.marketplaceSync.create({
    data: {
      platform: 'SQUARE',
      status: 'RUNNING',
      triggeredById: null,
    },
  });

  try {
    if (!isPlatformConfigured('SQUARE')) {
      await completeSyncRecord(syncRecord.id, 'FAILED', 0, 0, 0, 'Square is not configured');
      return { success: false, message: 'Square is not configured', recordsFound: 0, recordsCreated: 0, recordsSkipped: 0 };
    }

    // Resolve createdById — Sale.createdById is required
    const createdById = await resolveCreatedById(userId);
    if (!createdById) {
      await completeSyncRecord(syncRecord.id, 'FAILED', 0, 0, 0, 'No admin user found for createdById');
      return { success: false, message: 'No admin user found for createdById', recordsFound: 0, recordsCreated: 0, recordsSkipped: 0 };
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

        const unitPrice = lineItem.amount / 100 / lineItem.quantity;
        const totalAmount = lineItem.amount / 100;
        let productId: string;
        let saleNote = payment.note ? `Square: ${payment.note}` : 'Synced from Square';

        if (matchedProduct) {
          productId = matchedProduct.id;
        } else {
          // Try to auto-create a new product
          const newProduct = await autoCreateProductFromSquareItem(
            {
              name: lineItem.name,
              sku: lineItem.sku,
              variationName: lineItem.variationName,
              unitPrice,
            },
            createdById
          );

          if (newProduct) {
            productId = newProduct.id;
            saleNote = `Auto-created product from Square: ${lineItem.name} → ${newProduct.name}`;
          } else {
            // Still couldn't create product - log as unmatched and skip
            unmatchedItems.push(`${lineItem.name} (payment ${payment.paymentId})`);
            continue;
          }
        }

        await db.sale.create({
          data: {
            saleDate: payment.saleDate,
            channelId: farmersChannel.id,
            productId,
            quantity: lineItem.quantity,
            unitPrice,
            totalAmount,
            paymentMethod: 'SQUARE',
            referenceNumber: payment.paymentId,
            notes: saleNote,
            createdById,
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
// Amazon Sync (internal, cursor-based micro-batching, no session)
// ============================================================================

export async function runAmazonSyncInternal(userId: string | null): Promise<SyncResult> {
  // Check for an existing RUNNING record with a non-null cursorData (resumed batch run)
  const existingRunning = await db.marketplaceSync.findFirst({
    where: {
      platform: 'AMAZON',
      status: 'RUNNING',
      cursorData: { not: null },
    },
    orderBy: { startedAt: 'desc' },
  });

  let syncRecord: { id: string };
  let nextToken: string | undefined;

  if (existingRunning) {
    // Resume existing batch run
    syncRecord = existingRunning;
    try {
      const cursor = JSON.parse(existingRunning.cursorData!);
      nextToken = cursor.nextToken;
    } catch {
      nextToken = undefined;
    }
  } else {
    // Start a new sync run
    syncRecord = await db.marketplaceSync.create({
      data: {
        platform: 'AMAZON',
        status: 'RUNNING',
        triggeredById: null,
      },
    });
  }

  try {
    if (!isPlatformConfigured('AMAZON')) {
      await db.marketplaceSync.update({
        where: { id: syncRecord.id },
        data: { status: 'FAILED', completedAt: new Date(), errorMessage: 'Amazon is not configured', cursorData: null },
      });
      return { success: false, message: 'Amazon is not configured', recordsFound: 0, recordsCreated: 0, recordsSkipped: 0 };
    }

    const config = getAmazonConfig();
    const sinceDate = await getLastSuccessfulSyncDate('AMAZON');

    // Fetch ONE PAGE from the Amazon SP-API
    const params: Record<string, string> = {
      MarketplaceIds: config.marketplaceId,
      CreatedAfter: sinceDate.toISOString(),
      OrderStatuses: 'Unshipped,PartiallyShipped,Shipped',
    };
    if (nextToken) params.NextToken = nextToken;

    const data = await spApiGet('/orders/v0/orders', params);
    const rawOrders = data.payload?.Orders ?? [];

    let created = 0;
    let skipped = 0;

    for (const order of rawOrders) {
      // Get line items
      let items: Array<{ name: string; quantity: number; price: number; sku?: string }> = [];
      try {
        await new Promise((r) => setTimeout(r, 500)); // Rate limiting
        const itemsData = await spApiGet(`/orders/v0/orders/${order.AmazonOrderId}/orderItems`);
        const rawItems = itemsData.payload?.OrderItems ?? [];
        items = rawItems.map((item: any) => ({
          name: item.Title || 'Unknown Item',
          quantity: item.QuantityOrdered || 1,
          price: parseFloat(item.ItemPrice?.Amount ?? '0'),
          sku: item.SellerSKU,
        }));
      } catch {
        // Continue with empty items
      }

      const buyerName = order.BuyerInfo?.BuyerName || 'Amazon Customer';
      const nameParts = buyerName.split(' ');
      const firstName = nameParts[0] || 'Amazon';
      const lastName = nameParts.slice(1).join(' ') || 'Customer';
      const shippingAddr = order.ShippingAddress;

      // Upsert customer
      const customer = await db.customer.upsert({
        where: { email: order.BuyerInfo?.BuyerEmail || `${order.AmazonOrderId}@marketplace.amazon.com` },
        create: {
          email: order.BuyerInfo?.BuyerEmail || `${order.AmazonOrderId}@marketplace.amazon.com`,
          firstName,
          lastName,
        },
        update: { firstName, lastName },
      });

      // Create WebsiteOrder with dedup via P2002
      try {
        const itemTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const orderTotal = parseFloat(order.OrderTotal?.Amount ?? '0');

        await db.websiteOrder.create({
          data: {
            orderId: `AMZ-${order.AmazonOrderId}`,
            customerId: customer.id,
            items: JSON.stringify(items.map((i) => ({ name: i.name, qty: i.quantity, price: i.price, sku: i.sku }))),
            shippingCost: Math.max(orderTotal - itemTotal, 0),
            orderTotal,
            status: 'NEW',
            source: 'AMAZON',
            orderDate: new Date(order.PurchaseDate),
            shippingAddressLine1: shippingAddr?.AddressLine1 ?? null,
            shippingAddressLine2: shippingAddr?.AddressLine2 ?? null,
            shippingCity: shippingAddr?.City ?? null,
            shippingState: shippingAddr?.StateOrRegion ?? null,
            shippingZip: shippingAddr?.PostalCode ?? null,
            shippingCountry: shippingAddr?.CountryCode ?? null,
          },
        });

        // Update customer aggregates
        await db.customer.update({
          where: { id: customer.id },
          data: {
            orderCount: { increment: 1 },
            totalSpent: { increment: parseFloat(order.OrderTotal?.Amount ?? '0') },
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

    const hasMorePages = !!data.payload?.NextToken;

    if (hasMorePages) {
      // Store cursor and leave status as RUNNING for next invocation
      await db.marketplaceSync.update({
        where: { id: syncRecord.id },
        data: {
          status: 'RUNNING',
          cursorData: JSON.stringify({ nextToken: data.payload.NextToken }),
          recordsFound: { increment: rawOrders.length },
          recordsCreated: { increment: created },
          recordsSkipped: { increment: skipped },
        },
      });

      return {
        success: true,
        message: `Page processed (${rawOrders.length} orders), more pages remain`,
        recordsFound: rawOrders.length,
        recordsCreated: created,
        recordsSkipped: skipped,
      };
    } else {
      // Last page — finalize the sync record
      const existingRecord = await db.marketplaceSync.findUnique({ where: { id: syncRecord.id } });
      const totalFound = (existingRecord?.recordsFound ?? 0) + rawOrders.length;
      const totalCreated = (existingRecord?.recordsCreated ?? 0) + created;
      const totalSkipped = (existingRecord?.recordsSkipped ?? 0) + skipped;

      await db.marketplaceSync.update({
        where: { id: syncRecord.id },
        data: {
          status: 'SUCCESS',
          completedAt: new Date(),
          cursorData: null,
          recordsFound: totalFound,
          recordsCreated: totalCreated,
          recordsSkipped: totalSkipped,
        },
      });

      return {
        success: true,
        message: `Synced ${totalCreated} Amazon orders` +
          (totalSkipped > 0 ? ` (${totalSkipped} duplicates skipped)` : ''),
        recordsFound: totalFound,
        recordsCreated: totalCreated,
        recordsSkipped: totalSkipped,
      };
    }
  } catch (error: any) {
    await db.marketplaceSync.update({
      where: { id: syncRecord.id },
      data: { status: 'FAILED', completedAt: new Date(), errorMessage: error.message, cursorData: null },
    });
    return { success: false, message: `Amazon sync failed: ${error.message}`, recordsFound: 0, recordsCreated: 0, recordsSkipped: 0 };
  }
}

// ============================================================================
// Etsy Sync (internal, no session)
// ============================================================================

export async function runEtsySyncInternal(userId: string | null): Promise<SyncResult> {
  const syncRecord = await db.marketplaceSync.create({
    data: {
      platform: 'ETSY',
      status: 'RUNNING',
      triggeredById: null,
    },
  });

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
