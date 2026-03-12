'use server';

import { verifySession } from '@/lib/dal';
import { db } from '@/lib/db';
import { getMonthlyRevenueTrend, getRevenueByChannel, getPnLReport } from './financial-reports';
import { getProductionMetrics } from './production';
import type { MonthlyRevenueTrendItem, RevenueByChannelItem } from './financial-reports';

// ── Projection benchmarks ──────────────────────────────────────────────────────
// Year 1 (2026): $1.2M/yr = $100K/mo
// Year 2 (2027): $3.5M/yr = ~$291.7K/mo
// Year 3 (2028+): $7.2M/yr = $600K/mo

function getMonthlyProjection(year: number): number {
  if (year <= 2026) return 100_000;
  if (year === 2027) return 291_667;
  return 600_000;
}

export type InvestorMetrics = {
  // Revenue Overview (INVST-01)
  revenueTrend: MonthlyRevenueTrendItem[];
  mtdRevenue: number;
  ytdRevenue: number;
  yoyGrowth: number | null; // null = N/A (first year or no prior year data)

  // Channel Diversification (INVST-02)
  channelRevenue: RevenueByChannelItem[];
  activeChannelCount: number;
  topChannel: string | null;

  // Production Capacity (INVST-03)
  capacityUtilization: number;
  totalUnitsProduced: number;
  capacityTarget: number;

  // Financial Health (INVST-04)
  grossMargin: number;
  netMargin: number;
  totalRevenue: number;
  totalExpenses: number;
  monthlyProjection: number;

  // Market Traction
  activeCustomerCount: number; // total customers (Customer model has no isActive flag)
};

export async function getInvestorMetrics(): Promise<InvestorMetrics> {
  await verifySession();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const priorYear = currentYear - 1;

  const [
    revenueTrend,
    priorYearTrend,
    channelRevenue,
    productionMetrics,
    pnlReport,
    activeCustomerCount,
    activeChannelCount,
  ] = await Promise.all([
    getMonthlyRevenueTrend(currentYear),
    getMonthlyRevenueTrend(priorYear),
    // Pass date as ISO string for current month — channel chart shows all-time or current year
    getRevenueByChannel(now.toISOString()),
    getProductionMetrics(),
    getPnLReport({ year: currentYear, month: currentMonth }),
    db.customer.count(),
    db.salesChannel.count({ where: { isActive: true } }),
  ]);

  // YTD revenue = sum of all months up to current month
  const ytdRevenue = revenueTrend
    .slice(0, currentMonth)
    .reduce((sum, item) => sum + item.revenue, 0);

  // MTD revenue = current month revenue
  const mtdRevenue = revenueTrend[currentMonth - 1]?.revenue ?? 0;

  // YoY growth: compare ytd this year vs same period last year
  const priorYtdRevenue = priorYearTrend
    .slice(0, currentMonth)
    .reduce((sum, item) => sum + item.revenue, 0);

  const yoyGrowth =
    priorYtdRevenue > 0
      ? ((ytdRevenue - priorYtdRevenue) / priorYtdRevenue) * 100
      : null;

  // Top channel by revenue
  const sortedChannels = [...channelRevenue].sort((a, b) => b.revenue - a.revenue);
  const topChannel = sortedChannels[0]?.channel ?? null;

  return {
    revenueTrend,
    mtdRevenue,
    ytdRevenue,
    yoyGrowth,
    channelRevenue,
    activeChannelCount,
    topChannel,
    capacityUtilization: productionMetrics.utilizationPercent,
    totalUnitsProduced: productionMetrics.totalUnits,
    capacityTarget: productionMetrics.target,
    grossMargin: pnlReport.grossMarginPct,
    netMargin: pnlReport.netMarginPct,
    totalRevenue: pnlReport.revenue,
    totalExpenses: pnlReport.operatingExpenses,
    monthlyProjection: getMonthlyProjection(currentYear),
    activeCustomerCount,
  };
}
