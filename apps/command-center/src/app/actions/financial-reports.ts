'use server';

import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  startOfWeek,
  endOfWeek,
  subDays,
  addDays,
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

// ── P&L Types ─────────────────────────────────────────────────────────────────

export type PnLRevenueItem = { channel: string; revenue: number };

export type PnLExpenseItem = { category: string; amount: number };

export type PnLReport = {
  period: string;
  revenue: number;
  revenueByChannel: PnLRevenueItem[];
  cogs: number;
  grossProfit: number;
  grossMarginPct: number;
  operatingExpenses: number;
  expensesByCategory: PnLExpenseItem[];
  netIncome: number;
  netMarginPct: number;
};

// ── Cash Flow Types ───────────────────────────────────────────────────────────

export type CashFlowInflow = { source: string; amount: number };
export type CashFlowOutflow = { category: string; amount: number };

export type CashFlowStatement = {
  period: string;
  operatingInflows: CashFlowInflow[];
  totalInflows: number;
  operatingOutflows: CashFlowOutflow[];
  totalOutflows: number;
  netOperating: number;
  netChange: number;
  openingBalance: number | null;
  closingBalance: number | null;
};

// ── Projection + Weekly Types ─────────────────────────────────────────────────

export type CashFlowProjectionWeek = {
  weekStart: string;
  projectedInflow: number;
  projectedOutflow: number;
  netCashFlow: number;
  cumulativeNet: number;
};

export type WeeklyCashPositionItem = {
  weekStart: string;
  weekEnd: string;
  inflows: number;
  outflows: number;
  netPosition: number;
};

// ── Helper: compute date range from period params ─────────────────────────────

function getPeriodRange(period: { year: number; month?: number; quarter?: number }): {
  start: Date;
  end: Date;
  label: string;
} {
  if (period.month !== undefined) {
    const ref = new Date(period.year, period.month - 1, 1);
    return {
      start: startOfMonth(ref),
      end: endOfMonth(ref),
      label: format(ref, 'MMMM yyyy'),
    };
  }
  if (period.quarter !== undefined) {
    const ref = new Date(period.year, (period.quarter - 1) * 3, 1);
    return {
      start: startOfQuarter(ref),
      end: endOfQuarter(ref),
      label: `Q${period.quarter} ${period.year}`,
    };
  }
  const ref = new Date(period.year, 0, 1);
  return {
    start: startOfYear(ref),
    end: endOfYear(ref),
    label: String(period.year),
  };
}

// ── getPnLReport ──────────────────────────────────────────────────────────────

export async function getPnLReport(period: {
  year: number;
  month?: number;
  quarter?: number;
}): Promise<PnLReport> {
  try {
    await verifySession();

    const { start, end, label } = getPeriodRange(period);

    // Revenue: Sale + Order (confirmed+)
    const saleByChannel = await db.sale.groupBy({
      by: ['channelId'],
      where: { saleDate: { gte: start, lte: end } },
      _sum: { totalAmount: true },
    });

    const orderByChannel = await db.order.groupBy({
      by: ['channelId'],
      where: {
        orderDate: { gte: start, lte: end },
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
      },
      _sum: { totalAmount: true },
    });

    const channels = await db.salesChannel.findMany({ select: { id: true, name: true } });
    const channelMap = new Map(channels.map((c) => [c.id, c.name]));

    const revenueMap = new Map<string, number>();
    for (const row of saleByChannel) {
      revenueMap.set(row.channelId, (revenueMap.get(row.channelId) ?? 0) + Number(row._sum.totalAmount ?? 0));
    }
    for (const row of orderByChannel) {
      revenueMap.set(row.channelId, (revenueMap.get(row.channelId) ?? 0) + Number(row._sum.totalAmount ?? 0));
    }

    const revenueByChannel: PnLRevenueItem[] = Array.from(revenueMap.entries()).map(
      ([channelId, revenue]) => ({ channel: channelMap.get(channelId) ?? channelId, revenue })
    );
    const revenue = revenueByChannel.reduce((sum, c) => sum + c.revenue, 0);

    // COGS: batches produced in period
    const batches = await db.batch.findMany({
      where: {
        productionDate: { gte: start, lte: end },
        isActive: true,
      },
      include: { materials: { include: { rawMaterial: true } } },
    });

    let cogs = 0;
    for (const batch of batches) {
      let materialsCost = 0;
      for (const bm of batch.materials) {
        if (bm.rawMaterial.costPerUnit !== null) {
          materialsCost += Number(bm.quantityUsed) * Number(bm.rawMaterial.costPerUnit);
        }
      }
      cogs += materialsCost + Number(batch.laborCostTotal ?? 0) + Number(batch.overheadCostTotal ?? 0);
    }

    const grossProfit = revenue - cogs;
    const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    // Operating Expenses: approved expenses grouped by category
    const expenseRows = await db.expense.groupBy({
      by: ['category'],
      where: {
        expenseDate: { gte: start, lte: end },
        approvalStatus: { in: ['auto_approved', 'approved'] },
      },
      _sum: { amount: true },
    });

    const expensesByCategory: PnLExpenseItem[] = expenseRows.map((row) => ({
      category: row.category,
      amount: Number(row._sum.amount ?? 0),
    }));
    const operatingExpenses = expensesByCategory.reduce((sum, e) => sum + e.amount, 0);

    const netIncome = grossProfit - operatingExpenses;
    const netMarginPct = revenue > 0 ? (netIncome / revenue) * 100 : 0;

    return {
      period: label,
      revenue,
      revenueByChannel,
      cogs,
      grossProfit,
      grossMarginPct,
      operatingExpenses,
      expensesByCategory,
      netIncome,
      netMarginPct,
    };
  } catch (error) {
    console.error('Error fetching P&L report:', error);
    return {
      period: '',
      revenue: 0,
      revenueByChannel: [],
      cogs: 0,
      grossProfit: 0,
      grossMarginPct: 0,
      operatingExpenses: 0,
      expensesByCategory: [],
      netIncome: 0,
      netMarginPct: 0,
    };
  }
}

// ── getCashFlowStatement ──────────────────────────────────────────────────────

export async function getCashFlowStatement(period: {
  year: number;
  month: number;
}): Promise<CashFlowStatement> {
  try {
    await verifySession();

    const ref = new Date(period.year, period.month - 1, 1);
    const start = startOfMonth(ref);
    const end = endOfMonth(ref);
    const label = format(ref, 'MMMM yyyy');

    // Inflow 1: Invoice payments received in period
    const invoicePaymentAgg = await db.invoicePayment.aggregate({
      where: { paidAt: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    const invoicePaymentTotal = Number(invoicePaymentAgg._sum.amount ?? 0);

    // Inflow 2: Cash/card sale payments (immediate cash)
    const cashSaleAgg = await db.sale.aggregate({
      where: {
        saleDate: { gte: start, lte: end },
        paymentMethod: { in: ['CASH', 'CREDIT_CARD', 'SQUARE', 'STRIPE', 'ZELLE'] },
      },
      _sum: { totalAmount: true },
    });
    const cashSaleTotal = Number(cashSaleAgg._sum.totalAmount ?? 0);

    const operatingInflows: CashFlowInflow[] = [];
    if (invoicePaymentTotal > 0) {
      operatingInflows.push({ source: 'Invoice Payments', amount: invoicePaymentTotal });
    }
    if (cashSaleTotal > 0) {
      operatingInflows.push({ source: 'Cash & Card Sales', amount: cashSaleTotal });
    }
    const totalInflows = operatingInflows.reduce((sum, i) => sum + i.amount, 0);

    // Outflows: approved expenses by category
    const expenseRows = await db.expense.groupBy({
      by: ['category'],
      where: {
        expenseDate: { gte: start, lte: end },
        approvalStatus: { in: ['auto_approved', 'approved'] },
      },
      _sum: { amount: true },
    });

    const operatingOutflows: CashFlowOutflow[] = expenseRows.map((row) => ({
      category: row.category,
      amount: Number(row._sum.amount ?? 0),
    }));
    const totalOutflows = operatingOutflows.reduce((sum, o) => sum + o.amount, 0);

    const netOperating = totalInflows - totalOutflows;

    return {
      period: label,
      operatingInflows,
      totalInflows,
      operatingOutflows,
      totalOutflows,
      netOperating,
      netChange: netOperating,
      openingBalance: null,
      closingBalance: null,
    };
  } catch (error) {
    console.error('Error fetching cash flow statement:', error);
    return {
      period: '',
      operatingInflows: [],
      totalInflows: 0,
      operatingOutflows: [],
      totalOutflows: 0,
      netOperating: 0,
      netChange: 0,
      openingBalance: null,
      closingBalance: null,
    };
  }
}

// ── getCashFlowProjection ─────────────────────────────────────────────────────

export async function getCashFlowProjection(): Promise<CashFlowProjectionWeek[]> {
  try {
    await verifySession();

    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);

    // Average daily revenue (last 30 days)
    const saleAgg = await db.sale.aggregate({
      where: { saleDate: { gte: thirtyDaysAgo, lte: today } },
      _sum: { totalAmount: true },
    });
    const orderAgg = await db.order.aggregate({
      where: {
        orderDate: { gte: thirtyDaysAgo, lte: today },
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
      },
      _sum: { totalAmount: true },
    });
    const totalRevenue30 =
      Number(saleAgg._sum.totalAmount ?? 0) + Number(orderAgg._sum.totalAmount ?? 0);
    const avgDailyRevenue = totalRevenue30 / 30;

    // Average daily expenses (last 30 days)
    const expenseAgg = await db.expense.aggregate({
      where: {
        expenseDate: { gte: thirtyDaysAgo, lte: today },
        approvalStatus: { in: ['auto_approved', 'approved'] },
      },
      _sum: { amount: true },
    });
    const avgDailyExpenses = Number(expenseAgg._sum.amount ?? 0) / 30;

    // Fetch outstanding invoices with due dates in the next 90 days
    const ninetyDaysOut = addDays(today, 90);
    const outstandingInvoices = await db.invoice.findMany({
      where: {
        status: { notIn: ['PAID', 'VOID'] },
        dueDate: { gte: today, lte: ninetyDaysOut },
      },
      select: { dueDate: true, totalAmount: true, paidAmount: true },
    });

    // Build 13 weekly buckets
    const weeks: CashFlowProjectionWeek[] = [];
    let cumulativeNet = 0;

    for (let i = 0; i < 13; i++) {
      const weekStart = addDays(today, i * 7);
      const weekEnd = addDays(weekStart, 6);

      const projectedInflow = avgDailyRevenue * 7;
      const projectedOutflow = avgDailyExpenses * 7;

      // Add outstanding invoice amounts due this week
      let invoiceDueThisWeek = 0;
      for (const inv of outstandingInvoices) {
        if (inv.dueDate && inv.dueDate >= weekStart && inv.dueDate <= weekEnd) {
          invoiceDueThisWeek += Number(inv.totalAmount) - Number(inv.paidAmount ?? 0);
        }
      }

      const netCashFlow = projectedInflow + invoiceDueThisWeek - projectedOutflow;
      cumulativeNet += netCashFlow;

      weeks.push({
        weekStart: format(weekStart, 'MMM d'),
        projectedInflow: projectedInflow + invoiceDueThisWeek,
        projectedOutflow,
        netCashFlow,
        cumulativeNet,
      });
    }

    return weeks;
  } catch (error) {
    console.error('Error computing cash flow projection:', error);
    return [];
  }
}

// ── getWeeklyCashPosition ─────────────────────────────────────────────────────

export async function getWeeklyCashPosition(
  weeksBack: number = 8
): Promise<WeeklyCashPositionItem[]> {
  try {
    await verifySession();

    const results: WeeklyCashPositionItem[] = [];
    const today = new Date();

    for (let i = weeksBack - 1; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(today, i * 7));
      const weekEnd = endOfWeek(subDays(today, i * 7));

      // Inflows: invoice payments + cash/card sales
      const paymentAgg = await db.invoicePayment.aggregate({
        where: { paidAt: { gte: weekStart, lte: weekEnd } },
        _sum: { amount: true },
      });
      const saleAgg = await db.sale.aggregate({
        where: {
          saleDate: { gte: weekStart, lte: weekEnd },
          paymentMethod: { in: ['CASH', 'CREDIT_CARD', 'SQUARE', 'STRIPE', 'ZELLE'] },
        },
        _sum: { totalAmount: true },
      });

      const inflows =
        Number(paymentAgg._sum.amount ?? 0) + Number(saleAgg._sum.totalAmount ?? 0);

      // Outflows: approved expenses
      const expenseAgg = await db.expense.aggregate({
        where: {
          expenseDate: { gte: weekStart, lte: weekEnd },
          approvalStatus: { in: ['auto_approved', 'approved'] },
        },
        _sum: { amount: true },
      });
      const outflows = Number(expenseAgg._sum.amount ?? 0);

      results.push({
        weekStart: format(weekStart, 'MMM d'),
        weekEnd: format(weekEnd, 'MMM d, yyyy'),
        inflows,
        outflows,
        netPosition: inflows - outflows,
      });
    }

    return results;
  } catch (error) {
    console.error('Error fetching weekly cash position:', error);
    return [];
  }
}
