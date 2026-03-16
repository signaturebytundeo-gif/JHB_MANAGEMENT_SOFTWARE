'use server';

import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/dal';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DashboardKPIs = {
  todayRevenue: number;
  todayOrderCount: number;
  mtdRevenue: number;
  mtdOrderCount: number;
  targetRevenue: number;
  mtdRevenuePercent: number;
  unitsProduced: number;
  batchCount: number;
  capacityTarget: number;
  capacityPercent: number;
  inventoryValue: number;
  openOrderCount: number;
  openOrderValue: number;
  totalAR: number;
  overdueAmount: number;
  overdueCount: number;
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

// ── getDashboardKPIs ──────────────────────────────────────────────────────────

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  await verifySession();

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const targetRevenue = getMonthlyProjection(now.getFullYear());
  const capacityTarget = 15_000;

  const [
    // DASH-01 / DASH-02: Today's + MTD revenue from Sale
    saleTodayAgg,
    saleMTDAgg,
    // DASH-01 / DASH-02: Today's + MTD revenue from operator Order
    orderTodayAgg,
    orderMTDAgg,
    // DASH-03: Units produced MTD (RELEASED batches)
    releasedBatches,
    // DASH-04: Products with pricing tiers for inventory value
    productsWithTiers,
    // DASH-04: BatchAllocations for available stock
    batchAllocations,
    // DASH-05: Open website orders
    websiteOrderCount,
    websiteOrderValueAgg,
    // DASH-05: Open operator orders
    operatorOrderCount,
    operatorOrderValueAgg,
    // DASH-01 / DASH-02: WebsiteOrder revenue — today
    websiteOrderTodayRevenueAgg,
    // DASH-01 / DASH-02: WebsiteOrder revenue — MTD
    websiteOrderMTDRevenueAgg,
    // DASH-06: Accounts receivable
    arInvoices,
  ] = await Promise.all([
    // Sale totals — today
    db.sale.aggregate({
      where: { saleDate: { gte: todayStart, lte: todayEnd } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    // Sale totals — MTD
    db.sale.aggregate({
      where: { saleDate: { gte: monthStart, lte: monthEnd } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    // Operator Order totals — today (not CANCELLED)
    db.order.aggregate({
      where: {
        createdAt: { gte: todayStart, lte: todayEnd },
        status: { not: 'CANCELLED' },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    // Operator Order totals — MTD (not CANCELLED)
    db.order.aggregate({
      where: {
        createdAt: { gte: monthStart, lte: monthEnd },
        status: { not: 'CANCELLED' },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    // RELEASED batches this month
    db.batch.findMany({
      where: {
        status: 'RELEASED',
        createdAt: { gte: monthStart, lte: monthEnd },
        isActive: true,
      },
      select: { totalUnits: true },
    }),
    // Products with pricing tiers
    db.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        pricingTiers: {
          select: { unitPrice: true },
          orderBy: { unitPrice: 'asc' },
          take: 1,
        },
      },
    }),
    // BatchAllocations (initial stock at each location)
    db.batchAllocation.findMany({
      select: { batchId: true, quantity: true },
    }),
    // Open website orders count
    db.websiteOrder.count({
      where: { status: { in: ['NEW', 'PROCESSING'] } },
    }),
    // Open website orders value
    db.websiteOrder.aggregate({
      where: { status: { in: ['NEW', 'PROCESSING'] } },
      _sum: { orderTotal: true },
    }),
    // Open operator orders count
    db.order.count({
      where: { status: { in: ['DRAFT', 'CONFIRMED', 'PROCESSING'] } },
    }),
    // Open operator orders value
    db.order.aggregate({
      where: { status: { in: ['DRAFT', 'CONFIRMED', 'PROCESSING'] } },
      _sum: { totalAmount: true },
    }),
    // WebsiteOrder revenue — today (all statuses except CANCELLED count as revenue)
    db.websiteOrder.aggregate({
      where: {
        createdAt: { gte: todayStart, lte: todayEnd },
        status: { not: 'CANCELLED' },
      },
      _sum: { orderTotal: true },
      _count: { _all: true },
    }),
    // WebsiteOrder revenue — MTD
    db.websiteOrder.aggregate({
      where: {
        createdAt: { gte: monthStart, lte: monthEnd },
        status: { not: 'CANCELLED' },
      },
      _sum: { orderTotal: true },
      _count: { _all: true },
    }),
    // AR invoices (SENT, VIEWED, PARTIAL, OVERDUE)
    db.invoice.findMany({
      where: { status: { in: ['SENT', 'VIEWED', 'PARTIAL', 'OVERDUE'] } },
      select: {
        totalAmount: true,
        paidAmount: true,
        lateFeeAmount: true,
        status: true,
        dueDate: true,
      },
    }),
  ]);

  // ── DASH-01: Today's Revenue ──────────────────────────────────────────────
  const todaySaleRevenue = Number(saleTodayAgg._sum.totalAmount ?? 0);
  const todayOrderRevenue = Number(orderTodayAgg._sum.totalAmount ?? 0);
  const todayWebsiteRevenue = Number(websiteOrderTodayRevenueAgg._sum?.orderTotal ?? 0);
  const todayRevenue = todaySaleRevenue + todayOrderRevenue + todayWebsiteRevenue;
  const todayOrderCount = saleTodayAgg._count.id + orderTodayAgg._count.id + (websiteOrderTodayRevenueAgg._count._all ?? 0);

  // ── DASH-02: MTD Revenue ──────────────────────────────────────────────────
  const mtdSaleRevenue = Number(saleMTDAgg._sum.totalAmount ?? 0);
  const mtdOrderRevenue = Number(orderMTDAgg._sum.totalAmount ?? 0);
  const mtdWebsiteRevenue = Number(websiteOrderMTDRevenueAgg._sum?.orderTotal ?? 0);
  const mtdRevenue = mtdSaleRevenue + mtdOrderRevenue + mtdWebsiteRevenue;
  const mtdOrderCount = saleMTDAgg._count.id + orderMTDAgg._count.id + (websiteOrderMTDRevenueAgg._count._all ?? 0);
  const mtdRevenuePercent = targetRevenue > 0 ? (mtdRevenue / targetRevenue) * 100 : 0;

  // ── DASH-03: Units Produced ───────────────────────────────────────────────
  const unitsProduced = releasedBatches.reduce((sum, b) => sum + b.totalUnits, 0);
  const batchCount = releasedBatches.length;
  const capacityPercent = capacityTarget > 0 ? (unitsProduced / capacityTarget) * 100 : 0;

  // ── DASH-04: Inventory Value ──────────────────────────────────────────────
  // Build map: batchId -> total allocated quantity
  const allocMap = new Map<string, number>();
  for (const alloc of batchAllocations) {
    allocMap.set(alloc.batchId, (allocMap.get(alloc.batchId) ?? 0) + alloc.quantity);
  }

  // Build map: productId -> lowest unit price
  const priceMap = new Map<string, number>();
  for (const product of productsWithTiers) {
    const lowestTier = product.pricingTiers[0];
    if (lowestTier) {
      priceMap.set(product.id, Number(lowestTier.unitPrice));
    }
  }

  // For inventory value, get released batches with productId
  const releasedBatchesWithProduct = await db.batch.findMany({
    where: { status: 'RELEASED', isActive: true },
    select: { id: true, productId: true },
  });

  let inventoryValue = 0;
  for (const batch of releasedBatchesWithProduct) {
    const allocQty = allocMap.get(batch.id) ?? 0;
    const unitPrice = priceMap.get(batch.productId) ?? 0;
    inventoryValue += allocQty * unitPrice;
  }

  // ── DASH-05: Open Orders (FIXED — both WebsiteOrder + operator Order) ─────
  const websiteValue = Number(websiteOrderValueAgg._sum.orderTotal ?? 0);
  const operatorValue = Number(operatorOrderValueAgg._sum.totalAmount ?? 0);
  const openOrderCount = websiteOrderCount + operatorOrderCount;
  const openOrderValue = websiteValue + operatorValue;

  // ── DASH-06: Accounts Receivable ─────────────────────────────────────────
  let totalAR = 0;
  let overdueAmount = 0;
  let overdueCount = 0;

  for (const inv of arInvoices) {
    const outstanding = Number(inv.totalAmount) - Number(inv.paidAmount ?? 0);
    totalAR += outstanding;

    const isOverdue = inv.status === 'OVERDUE' || (inv.dueDate !== null && inv.dueDate < now);
    if (isOverdue) {
      overdueAmount += outstanding;
      overdueCount += 1;
    }
  }

  return {
    todayRevenue,
    todayOrderCount,
    mtdRevenue,
    mtdOrderCount,
    targetRevenue,
    mtdRevenuePercent,
    unitsProduced,
    batchCount,
    capacityTarget,
    capacityPercent,
    inventoryValue,
    openOrderCount,
    openOrderValue,
    totalAR,
    overdueAmount,
    overdueCount,
  };
}
