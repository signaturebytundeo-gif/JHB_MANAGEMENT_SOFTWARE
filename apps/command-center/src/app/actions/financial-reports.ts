'use server';

import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  format,
} from 'date-fns';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/dal';

// ── Types ─────────────────────────────────────────────────────────────────────

export type RevenueByChannelItem = {
  channel: string;
  revenue: number;
};

export type MonthlyRevenueTrendItem = {
  month: string;
  revenue: number;
  projection: number;
};

export type BatchCOGSData = {
  batchId: string;
  batchCode: string;
  productName: string;
  totalUnits: number;
  materialsCost: number;
  laborCost: number;
  overheadCost: number;
  totalCOGS: number;
  cogsPerUnit: number;
  costDataIncomplete: boolean;
};

export type ProductMarginData = {
  productName: string;
  avgCOGS: number;
  avgSalePrice: number;
  grossMarginPct: number;
  batchCount: number;
};

// ── Projection benchmarks ─────────────────────────────────────────────────────
// Year 1 (2026): $1.2M/yr = $100K/mo
// Year 2 (2027): $3.5M/yr = ~$291.7K/mo
// Year 3 (2028+): $7.2M/yr = $600K/mo

function getMonthlyProjection(year: number): number {
  if (year <= 2026) return 100_000;
  if (year === 2027) return 291_667;
  return 600_000;
}

// ── getRevenueByChannel ───────────────────────────────────────────────────────

export async function getRevenueByChannel(date: string): Promise<RevenueByChannelItem[]> {
  try {
    await verifySession();

    const parsed = new Date(date);
    const start = startOfDay(parsed);
    const end = endOfDay(parsed);

    // Query Sale revenue by channel
    const saleRevenue = await db.sale.groupBy({
      by: ['channelId'],
      where: { saleDate: { gte: start, lte: end } },
      _sum: { totalAmount: true },
    });

    // Query Order revenue by channel (confirmed+ statuses only)
    const orderRevenue = await db.order.groupBy({
      by: ['channelId'],
      where: {
        createdAt: { gte: start, lte: end },
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
      },
      _sum: { totalAmount: true },
    });

    // Fetch all channel names
    const channels = await db.salesChannel.findMany({
      select: { id: true, name: true },
    });

    // Build channel id -> name map
    const channelMap = new Map<string, string>(channels.map((c) => [c.id, c.name]));

    // Merge Sale + Order revenue into per-channel map
    const revenueMap = new Map<string, number>();

    for (const row of saleRevenue) {
      const existing = revenueMap.get(row.channelId) ?? 0;
      revenueMap.set(row.channelId, existing + Number(row._sum.totalAmount ?? 0));
    }

    for (const row of orderRevenue) {
      const existing = revenueMap.get(row.channelId) ?? 0;
      revenueMap.set(row.channelId, existing + Number(row._sum.totalAmount ?? 0));
    }

    // Convert map to array with channel names
    return Array.from(revenueMap.entries()).map(([channelId, revenue]) => ({
      channel: channelMap.get(channelId) ?? channelId,
      revenue,
    }));
  } catch (error) {
    console.error('Error fetching revenue by channel:', error);
    return [];
  }
}

// ── getMonthlyRevenueTrend ────────────────────────────────────────────────────

export async function getMonthlyRevenueTrend(year: number): Promise<MonthlyRevenueTrendItem[]> {
  try {
    await verifySession();

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
    const projection = getMonthlyProjection(year);

    const results: MonthlyRevenueTrendItem[] = [];

    for (const monthDate of months) {
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);

      // Sum Sale.totalAmount for this month
      const saleAgg = await db.sale.aggregate({
        where: { saleDate: { gte: start, lte: end } },
        _sum: { totalAmount: true },
      });

      // Sum Order.totalAmount (confirmed+ statuses) for this month
      const orderAgg = await db.order.aggregate({
        where: {
          createdAt: { gte: start, lte: end },
          status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
        },
        _sum: { totalAmount: true },
      });

      const saleRevenue = Number(saleAgg._sum.totalAmount ?? 0);
      const orderRevenue = Number(orderAgg._sum.totalAmount ?? 0);

      results.push({
        month: format(monthDate, 'MMM'),
        revenue: saleRevenue + orderRevenue,
        projection,
      });
    }

    return results;
  } catch (error) {
    console.error('Error fetching monthly revenue trend:', error);
    return [];
  }
}

// ── getBatchCOGS ──────────────────────────────────────────────────────────────

export async function getBatchCOGS(): Promise<BatchCOGSData[]> {
  try {
    await verifySession();

    const batches = await db.batch.findMany({
      where: {
        status: { in: ['PLANNED', 'IN_PROGRESS', 'QC_REVIEW', 'RELEASED', 'HOLD'] },
        isActive: true,
      },
      include: {
        materials: { include: { rawMaterial: true } },
        product: { select: { name: true } },
      },
      orderBy: { productionDate: 'desc' },
    });

    return batches.map((batch) => {
      let materialsCost = 0;
      let costDataIncomplete = false;

      for (const bm of batch.materials) {
        if (bm.rawMaterial.costPerUnit === null) {
          costDataIncomplete = true;
        } else {
          materialsCost += Number(bm.quantityUsed) * Number(bm.rawMaterial.costPerUnit);
        }
      }

      const laborCost = Number(batch.laborCostTotal ?? 0);
      const overheadCost = Number(batch.overheadCostTotal ?? 0);
      const totalCOGS = materialsCost + laborCost + overheadCost;
      const cogsPerUnit = batch.totalUnits > 0 ? totalCOGS / batch.totalUnits : 0;

      return {
        batchId: batch.id,
        batchCode: batch.batchCode,
        productName: batch.product.name,
        totalUnits: batch.totalUnits,
        materialsCost,
        laborCost,
        overheadCost,
        totalCOGS,
        cogsPerUnit,
        costDataIncomplete,
      };
    });
  } catch (error) {
    console.error('Error fetching batch COGS:', error);
    return [];
  }
}

// ── getGrossMarginByProduct ───────────────────────────────────────────────────

export async function getGrossMarginByProduct(): Promise<ProductMarginData[]> {
  try {
    await verifySession();

    const batches = await getBatchCOGS();

    // Group by productName
    const productMap = new Map<
      string,
      { totalCOGSPerUnit: number; batchCount: number }
    >();

    for (const batch of batches) {
      const existing = productMap.get(batch.productName);
      if (existing) {
        existing.totalCOGSPerUnit += batch.cogsPerUnit;
        existing.batchCount += 1;
      } else {
        productMap.set(batch.productName, {
          totalCOGSPerUnit: batch.cogsPerUnit,
          batchCount: 1,
        });
      }
    }

    // Fetch all products with their pricing tiers to get avg sale price
    const products = await db.product.findMany({
      select: {
        name: true,
        pricingTiers: { select: { unitPrice: true, tierName: true } },
        sales: { select: { unitPrice: true } },
      },
    });

    const productPriceMap = new Map<string, number>();
    for (const product of products) {
      // Prefer average of actual sale prices if available
      if (product.sales.length > 0) {
        const avgSalePrice =
          product.sales.reduce((sum, s) => sum + Number(s.unitPrice), 0) / product.sales.length;
        productPriceMap.set(product.name, avgSalePrice);
      } else {
        // Fallback: wholesale cash price from pricing tiers
        const wholesaleTier = product.pricingTiers.find((t) =>
          t.tierName.toLowerCase().includes('wholesale')
        );
        const anyTier = product.pricingTiers[0];
        const tier = wholesaleTier ?? anyTier;
        if (tier) {
          productPriceMap.set(product.name, Number(tier.unitPrice));
        }
      }
    }

    const results: ProductMarginData[] = [];

    for (const [productName, data] of productMap.entries()) {
      const avgCOGS = data.totalCOGSPerUnit / data.batchCount;
      const avgSalePrice = productPriceMap.get(productName) ?? 0;
      const grossMarginPct =
        avgSalePrice > 0 ? ((avgSalePrice - avgCOGS) / avgSalePrice) * 100 : 0;

      results.push({
        productName,
        avgCOGS,
        avgSalePrice,
        grossMarginPct,
        batchCount: data.batchCount,
      });
    }

    // Sort by gross margin descending
    return results.sort((a, b) => b.grossMarginPct - a.grossMarginPct);
  } catch (error) {
    console.error('Error fetching gross margin by product:', error);
    return [];
  }
}
