'use server';

import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  format,
} from 'date-fns';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/dal';
import { getPnLReport } from './financial-reports';

// ── Report type union ─────────────────────────────────────────────────────────

export type ReportType =
  | 'daily-sales'
  | 'weekly-production'
  | 'monthly-pnl'
  | 'inventory-valuation'
  | 'product-performance'
  | 'farmers-market'
  | 'subscription-metrics';

// Re-export getPnLReport so reports page can call it directly
export { getPnLReport };

// ── RPT-01: getDailySalesSummary ──────────────────────────────────────────────

export type DailySalesSummaryItem = {
  channel: string;
  orderCount: number;
  unitsSold: number;
  revenue: number;
};

export async function getDailySalesSummary(date: Date): Promise<DailySalesSummaryItem[]> {
  try {
    await verifySession();

    const start = startOfDay(date);
    const end = endOfDay(date);

    // Sale records grouped by channel
    const saleByChannel = await db.sale.groupBy({
      by: ['channelId'],
      where: { saleDate: { gte: start, lte: end } },
      _sum: { totalAmount: true, quantity: true },
      _count: { id: true },
    });

    // Order records for the same date grouped by channel
    const orderByChannel = await db.order.groupBy({
      by: ['channelId'],
      where: {
        orderDate: { gte: start, lte: end },
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    const channels = await db.salesChannel.findMany({ select: { id: true, name: true } });
    const channelMap = new Map(channels.map((c) => [c.id, c.name]));

    const resultMap = new Map<string, DailySalesSummaryItem>();

    for (const row of saleByChannel) {
      const channelName = channelMap.get(row.channelId) ?? row.channelId;
      const existing = resultMap.get(row.channelId) ?? {
        channel: channelName,
        orderCount: 0,
        unitsSold: 0,
        revenue: 0,
      };
      existing.orderCount += Number(row._count.id);
      existing.unitsSold += Number(row._sum.quantity ?? 0);
      existing.revenue += Number(row._sum.totalAmount ?? 0);
      resultMap.set(row.channelId, existing);
    }

    for (const row of orderByChannel) {
      const channelName = channelMap.get(row.channelId) ?? row.channelId;
      const existing = resultMap.get(row.channelId) ?? {
        channel: channelName,
        orderCount: 0,
        unitsSold: 0,
        revenue: 0,
      };
      existing.orderCount += Number(row._count.id);
      existing.revenue += Number(row._sum.totalAmount ?? 0);
      resultMap.set(row.channelId, existing);
    }

    return Array.from(resultMap.values()).sort((a, b) => b.revenue - a.revenue);
  } catch (error) {
    console.error('Error fetching daily sales summary:', error);
    return [];
  }
}

// ── RPT-02: getWeeklyProductionSummary ────────────────────────────────────────

export type WeeklyProductionSummaryItem = {
  product: string;
  batchCount: number;
  totalUnits: number;
  releasedUnits: number;
  qcPassRate: number;
};

export async function getWeeklyProductionSummary(
  weekStart: Date
): Promise<WeeklyProductionSummaryItem[]> {
  try {
    await verifySession();

    const start = startOfWeek(weekStart);
    const end = endOfWeek(weekStart);

    const batches = await db.batch.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        isActive: true,
      },
      include: { product: { select: { name: true } } },
    });

    const productMap = new Map<
      string,
      {
        product: string;
        batchCount: number;
        totalUnits: number;
        releasedUnits: number;
        releasedCount: number;
      }
    >();

    for (const batch of batches) {
      const name = batch.product.name;
      const existing = productMap.get(name) ?? {
        product: name,
        batchCount: 0,
        totalUnits: 0,
        releasedUnits: 0,
        releasedCount: 0,
      };
      existing.batchCount += 1;
      existing.totalUnits += batch.totalUnits;
      if (batch.status === 'RELEASED') {
        existing.releasedUnits += batch.totalUnits;
        existing.releasedCount += 1;
      }
      productMap.set(name, existing);
    }

    return Array.from(productMap.values()).map((item) => ({
      product: item.product,
      batchCount: item.batchCount,
      totalUnits: item.totalUnits,
      releasedUnits: item.releasedUnits,
      qcPassRate:
        item.batchCount > 0
          ? Math.round((item.releasedCount / item.batchCount) * 100 * 10) / 10
          : 0,
    }));
  } catch (error) {
    console.error('Error fetching weekly production summary:', error);
    return [];
  }
}

// ── RPT-04: getInventoryValuationByLocation ───────────────────────────────────

export type InventoryLocationItem = {
  product: string;
  units: number;
  unitCost: number;
  totalValue: number;
};

export type InventoryValuationLocation = {
  location: string;
  items: InventoryLocationItem[];
  locationTotal: number;
};

export async function getInventoryValuationByLocation(): Promise<InventoryValuationLocation[]> {
  try {
    await verifySession();

    // Get all batch allocations with product and location info
    const allocations = await db.batchAllocation.findMany({
      include: {
        batch: {
          include: {
            product: {
              include: {
                pricingTiers: { select: { unitPrice: true, tierName: true } },
              },
            },
          },
        },
        location: { select: { id: true, name: true } },
      },
    });

    // Get all inventory movements to compute net available units per (batch, location)
    const movements = await db.inventoryMovement.findMany({
      select: {
        batchId: true,
        fromLocationId: true,
        toLocationId: true,
        quantity: true,
        movementType: true,
      },
    });

    // Build available units per (batchId, locationId) = allocation.quantity + inbound - outbound
    type StockKey = `${string}::${string}`;
    const stockMap = new Map<StockKey, number>();

    for (const alloc of allocations) {
      const key: StockKey = `${alloc.batchId}::${alloc.locationId}`;
      const existing = stockMap.get(key) ?? 0;
      stockMap.set(key, existing + alloc.quantity);
    }

    for (const mov of movements) {
      if (mov.fromLocationId) {
        const key: StockKey = `${mov.batchId}::${mov.fromLocationId}`;
        stockMap.set(key, (stockMap.get(key) ?? 0) - mov.quantity);
      }
      if (mov.toLocationId) {
        const key: StockKey = `${mov.batchId}::${mov.toLocationId}`;
        stockMap.set(key, (stockMap.get(key) ?? 0) + mov.quantity);
      }
    }

    // Group by location, then product
    type LocationProductKey = `${string}::${string}`;
    const locationProductMap = new Map<
      LocationProductKey,
      { location: string; product: string; units: number; unitCost: number }
    >();

    for (const alloc of allocations) {
      const key: StockKey = `${alloc.batchId}::${alloc.locationId}`;
      const units = stockMap.get(key) ?? 0;
      if (units <= 0) continue;

      const locationName = alloc.location.name;
      const productName = alloc.batch.product.name;
      const lpKey: LocationProductKey = `${alloc.locationId}::${alloc.batch.productId}`;

      // Unit cost: lowest pricing tier price (40% wholesale proxy)
      const tiers = alloc.batch.product.pricingTiers;
      const wholesaleTier = tiers.find((t) =>
        t.tierName.toLowerCase().includes('wholesale')
      );
      const anyTier = tiers[0];
      const unitCost =
        Number((wholesaleTier ?? anyTier)?.unitPrice ?? 0) * 0.4;

      const existing = locationProductMap.get(lpKey);
      if (existing) {
        existing.units += units;
      } else {
        locationProductMap.set(lpKey, { location: locationName, product: productName, units, unitCost });
      }
    }

    // Group by location name
    const locationMap = new Map<string, InventoryLocationItem[]>();
    for (const item of locationProductMap.values()) {
      const items = locationMap.get(item.location) ?? [];
      items.push({
        product: item.product,
        units: item.units,
        unitCost: item.unitCost,
        totalValue: item.units * item.unitCost,
      });
      locationMap.set(item.location, items);
    }

    return Array.from(locationMap.entries()).map(([location, items]) => ({
      location,
      items,
      locationTotal: items.reduce((sum, i) => sum + i.totalValue, 0),
    }));
  } catch (error) {
    console.error('Error fetching inventory valuation:', error);
    return [];
  }
}

// ── RPT-05: getProductPerformance ─────────────────────────────────────────────

export type ProductPerformanceItem = {
  product: string;
  unitsSold: number;
  revenue: number;
  avgPrice: number;
  estimatedMargin: number;
  marginPercent: number;
};

export async function getProductPerformance(
  startDate: Date,
  endDate: Date
): Promise<ProductPerformanceItem[]> {
  try {
    await verifySession();

    // Direct Sales grouped by product
    const saleByProduct = await db.sale.groupBy({
      by: ['productId'],
      where: { saleDate: { gte: startDate, lte: endDate } },
      _sum: { totalAmount: true, quantity: true },
      _avg: { unitPrice: true },
    });

    // Order line items grouped by product
    const orderLineItems = await db.orderLineItem.findMany({
      where: {
        order: {
          orderDate: { gte: startDate, lte: endDate },
          status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
        },
      },
      select: {
        productId: true,
        quantity: true,
        unitPrice: true,
        totalPrice: true,
      },
    });

    const products = await db.product.findMany({ select: { id: true, name: true } });
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    const resultMap = new Map<
      string,
      { productId: string; unitsSold: number; revenue: number; totalPriceUnits: number }
    >();

    for (const row of saleByProduct) {
      resultMap.set(row.productId, {
        productId: row.productId,
        unitsSold: Number(row._sum.quantity ?? 0),
        revenue: Number(row._sum.totalAmount ?? 0),
        totalPriceUnits: Number(row._avg.unitPrice ?? 0) * Number(row._sum.quantity ?? 0),
      });
    }

    for (const item of orderLineItems) {
      if (!item.productId) continue;
      const existing = resultMap.get(item.productId) ?? {
        productId: item.productId,
        unitsSold: 0,
        revenue: 0,
        totalPriceUnits: 0,
      };
      existing.unitsSold += item.quantity;
      existing.revenue += Number(item.totalPrice ?? 0);
      existing.totalPriceUnits += Number(item.unitPrice ?? 0) * item.quantity;
      resultMap.set(item.productId, existing);
    }

    return Array.from(resultMap.values()).map((item) => {
      const avgPrice = item.unitsSold > 0 ? item.totalPriceUnits / item.unitsSold : 0;
      // 40% wholesale proxy for COGS estimate (Phase 3 convention)
      const estimatedCOGS = item.revenue * 0.4;
      const estimatedMargin = item.revenue - estimatedCOGS;
      const marginPercent = item.revenue > 0 ? (estimatedMargin / item.revenue) * 100 : 0;

      return {
        product: productMap.get(item.productId) ?? item.productId,
        unitsSold: item.unitsSold,
        revenue: item.revenue,
        avgPrice,
        estimatedMargin,
        marginPercent: Math.round(marginPercent * 10) / 10,
      };
    });
  } catch (error) {
    console.error('Error fetching product performance:', error);
    return [];
  }
}

// ── RPT-06: getFarmersMarketPerformance ───────────────────────────────────────

export type FarmersMarketPerformanceItem = {
  market: string;
  salesCount: number;
  revenue: number;
  avgOrderValue: number;
  topProduct: string;
};

export async function getFarmersMarketPerformance(
  startDate: Date,
  endDate: Date
): Promise<FarmersMarketPerformanceItem[]> {
  try {
    await verifySession();

    // Filter by EVENT or MARKETPLACE channel types (research pitfall 6)
    const marketChannels = await db.salesChannel.findMany({
      where: { type: { in: ['EVENT', 'MARKETPLACE'] } },
      select: { id: true, name: true },
    });

    if (marketChannels.length === 0) return [];

    const channelIds = marketChannels.map((c) => c.id);
    const channelMap = new Map(marketChannels.map((c) => [c.id, c.name]));

    // Sales within date range for market channels
    const sales = await db.sale.findMany({
      where: {
        channelId: { in: channelIds },
        saleDate: { gte: startDate, lte: endDate },
      },
      include: { product: { select: { name: true } } },
    });

    // Orders within date range for market channels
    const orders = await db.order.findMany({
      where: {
        channelId: { in: channelIds },
        orderDate: { gte: startDate, lte: endDate },
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
      },
      select: { channelId: true, totalAmount: true },
    });

    // Aggregate by channel
    type ChannelAgg = {
      market: string;
      salesCount: number;
      revenue: number;
      productCounts: Map<string, number>;
    };

    const channelAgg = new Map<string, ChannelAgg>();

    for (const sale of sales) {
      const name = channelMap.get(sale.channelId) ?? sale.channelId;
      const agg = channelAgg.get(sale.channelId) ?? {
        market: name,
        salesCount: 0,
        revenue: 0,
        productCounts: new Map(),
      };
      agg.salesCount += 1;
      agg.revenue += Number(sale.totalAmount);
      agg.productCounts.set(
        sale.product.name,
        (agg.productCounts.get(sale.product.name) ?? 0) + sale.quantity
      );
      channelAgg.set(sale.channelId, agg);
    }

    for (const order of orders) {
      const name = channelMap.get(order.channelId) ?? order.channelId;
      const agg = channelAgg.get(order.channelId) ?? {
        market: name,
        salesCount: 0,
        revenue: 0,
        productCounts: new Map(),
      };
      agg.salesCount += 1;
      agg.revenue += Number(order.totalAmount ?? 0);
      channelAgg.set(order.channelId, agg);
    }

    return Array.from(channelAgg.values()).map((agg) => {
      let topProduct = 'N/A';
      let maxQty = 0;
      for (const [product, qty] of agg.productCounts.entries()) {
        if (qty > maxQty) {
          maxQty = qty;
          topProduct = product;
        }
      }
      return {
        market: agg.market,
        salesCount: agg.salesCount,
        revenue: agg.revenue,
        avgOrderValue: agg.salesCount > 0 ? agg.revenue / agg.salesCount : 0,
        topProduct,
      };
    });
  } catch (error) {
    console.error('Error fetching farmers market performance:', error);
    return [];
  }
}

// ── RPT-07: getSubscriptionMetrics ────────────────────────────────────────────

export type SubscriptionMemberDetail = {
  name: string;
  plan: string;
  status: string;
  monthlyValue: number;
};

export type SubscriptionMetrics = {
  mrr: number;
  activeCount: number;
  churnRate: number;
  ltv: number;
  memberDetails: SubscriptionMemberDetail[];
};

export async function getSubscriptionMetrics(): Promise<SubscriptionMetrics> {
  try {
    await verifySession();

    const members = await db.subscriptionMember.findMany({
      include: {
        customer: { select: { firstName: true, lastName: true } },
        plan: { select: { name: true, billingCycle: true, price: true } },
      },
    });

    let mrr = 0;
    let activeCount = 0;
    let cancelledCount = 0;
    const memberDetails: SubscriptionMemberDetail[] = [];

    for (const member of members) {
      // MRR: normalize annual plans by dividing by 12 (research pitfall 5)
      const monthlyValue =
        member.plan.billingCycle === 'annual'
          ? Number(member.plan.price) / 12
          : Number(member.plan.price);

      if (member.status === 'ACTIVE') {
        mrr += monthlyValue;
        activeCount += 1;
      } else if (member.status === 'CANCELLED') {
        cancelledCount += 1;
      }

      memberDetails.push({
        name: `${member.customer.firstName} ${member.customer.lastName}`,
        plan: member.plan.name,
        status: member.status,
        monthlyValue,
      });
    }

    const totalKnown = activeCount + cancelledCount;
    const churnRate = totalKnown > 0 ? (cancelledCount / totalKnown) * 100 : 0;
    const ltv = mrr * 12; // Simple annual LTV estimate

    return {
      mrr,
      activeCount,
      churnRate: Math.round(churnRate * 10) / 10,
      ltv,
      memberDetails,
    };
  } catch (error) {
    console.error('Error fetching subscription metrics:', error);
    return {
      mrr: 0,
      activeCount: 0,
      churnRate: 0,
      ltv: 0,
      memberDetails: [],
    };
  }
}
