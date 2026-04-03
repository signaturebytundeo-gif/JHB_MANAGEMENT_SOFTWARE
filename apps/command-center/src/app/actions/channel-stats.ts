'use server';

import { startOfMonth, endOfMonth } from 'date-fns';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/dal';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChannelStatItem = {
  channel: string;
  revenue: number;
  orderCount: number;
};

// ── Source name map for WebsiteOrder.source enum values ───────────────────────

const sourceNames: Record<string, string> = {
  WEBSITE: 'Website (DTC)',
  AMAZON: 'Amazon',
  ETSY: 'Etsy',
};

// ── getUnifiedChannelStats ────────────────────────────────────────────────────

export async function getUnifiedChannelStats(): Promise<ChannelStatItem[]> {
  await verifySession();

  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);

  const [saleRows, orderRows, websiteOrderRows, channels] = await Promise.all([
    // Sale records grouped by channel (e.g. Farmers Market / Square)
    db.sale.groupBy({
      by: ['channelId'],
      where: { saleDate: { gte: start, lte: end } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    // Operator Order records grouped by channel (wholesale / B2B)
    db.order.groupBy({
      by: ['channelId'],
      where: {
        createdAt: { gte: start, lte: end },
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    // Website/Amazon/Etsy orders grouped by source enum
    db.websiteOrder.groupBy({
      by: ['source'],
      where: {
        orderDate: { gte: start, lte: end },
        status: { not: 'CANCELLED' },
      },
      _sum: { orderTotal: true },
      _count: { id: true },
    }),
    // Channel lookup table
    db.salesChannel.findMany({
      select: { id: true, name: true },
    }),
  ]);

  // Build channelId -> channel name lookup
  const channelMap = new Map<string, string>(
    channels.map((c) => [c.id, c.name])
  );

  // Merge all three result sets into statMap keyed by display name
  const statMap = new Map<string, ChannelStatItem>();

  const upsert = (key: string, revenue: number, count: number) => {
    const existing = statMap.get(key);
    if (existing) {
      existing.revenue += revenue;
      existing.orderCount += count;
    } else {
      statMap.set(key, { channel: key, revenue, orderCount: count });
    }
  };

  for (const row of saleRows) {
    const name = channelMap.get(row.channelId) ?? row.channelId;
    upsert(name, Number(row._sum.totalAmount ?? 0), row._count.id);
  }

  for (const row of orderRows) {
    const name = channelMap.get(row.channelId) ?? row.channelId;
    upsert(name, Number(row._sum.totalAmount ?? 0), row._count.id);
  }

  for (const row of websiteOrderRows) {
    const name = sourceNames[row.source] ?? row.source;
    upsert(name, Number(row._sum.orderTotal ?? 0), row._count.id);
  }

  return Array.from(statMap.values()).sort((a, b) => b.revenue - a.revenue);
}
