'use client';

import { useState, useTransition, useCallback } from 'react';
import { ReportSelector, getDefaultParams } from '@/components/reports/ReportSelector';
import { ReportTable } from '@/components/reports/ReportTable';
import { ExportButtons } from '@/components/reports/ExportButtons';
import type { ReportType } from '@/app/actions/reports';
import type { Column } from '@/components/reports/ReportTable';
import type { ReportParams } from '@/components/reports/ReportSelector';
import {
  getDailySalesSummary,
  getWeeklyProductionSummary,
  getInventoryValuationByLocation,
  getProductPerformance,
  getFarmersMarketPerformance,
  getSubscriptionMetrics,
} from '@/app/actions/reports';
import { getPnLReport } from '@/app/actions/financial-reports';

// ── Column configuration for each report type ─────────────────────────────────

const REPORT_COLUMNS: Record<ReportType, Column[]> = {
  'daily-sales': [
    { key: 'channel', header: 'Channel' },
    { key: 'orderCount', header: 'Orders', format: 'number' },
    { key: 'unitsSold', header: 'Units', format: 'number' },
    { key: 'revenue', header: 'Revenue', format: 'currency' },
  ],
  'weekly-production': [
    { key: 'product', header: 'Product' },
    { key: 'batchCount', header: 'Batches', format: 'number' },
    { key: 'totalUnits', header: 'Total Units', format: 'number' },
    { key: 'releasedUnits', header: 'Released Units', format: 'number' },
    { key: 'qcPassRate', header: 'QC Pass Rate', format: 'percent' },
  ],
  'monthly-pnl': [
    { key: 'label', header: 'Metric' },
    { key: 'value', header: 'Amount', format: 'currency' },
  ],
  'inventory-valuation': [
    { key: 'location', header: 'Location' },
    { key: 'product', header: 'Product' },
    { key: 'units', header: 'Units', format: 'number' },
    { key: 'unitCost', header: 'Unit Cost', format: 'currency' },
    { key: 'totalValue', header: 'Total Value', format: 'currency' },
  ],
  'product-performance': [
    { key: 'product', header: 'Product' },
    { key: 'unitsSold', header: 'Units Sold', format: 'number' },
    { key: 'revenue', header: 'Revenue', format: 'currency' },
    { key: 'avgPrice', header: 'Avg Price', format: 'currency' },
    { key: 'estimatedMargin', header: 'Est. Margin', format: 'currency' },
    { key: 'marginPercent', header: 'Margin %', format: 'percent' },
  ],
  'farmers-market': [
    { key: 'market', header: 'Market' },
    { key: 'salesCount', header: 'Sales', format: 'number' },
    { key: 'revenue', header: 'Revenue', format: 'currency' },
    { key: 'avgOrderValue', header: 'Avg Order Value', format: 'currency' },
    { key: 'topProduct', header: 'Top Product' },
  ],
  'subscription-metrics': [
    { key: 'name', header: 'Name / Metric' },
    { key: 'plan', header: 'Plan' },
    { key: 'status', header: 'Status' },
    { key: 'monthlyValue', header: 'Monthly Value', format: 'currency' },
  ],
};

// ── Report display names ───────────────────────────────────────────────────────

const REPORT_LABELS: Record<ReportType, string> = {
  'daily-sales': 'Daily Sales Summary',
  'weekly-production': 'Weekly Production Summary',
  'monthly-pnl': 'Monthly P&L',
  'inventory-valuation': 'Inventory Valuation by Location',
  'product-performance': 'Product Performance',
  'farmers-market': 'Farmers Market Performance',
  'subscription-metrics': 'Subscription Metrics',
};

// ── Fetch function ─────────────────────────────────────────────────────────────

async function fetchReportData(
  reportType: ReportType,
  params: ReportParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any>[]> {
  switch (reportType) {
    case 'daily-sales': {
      const date = params.date ? new Date(params.date) : new Date();
      return getDailySalesSummary(date);
    }
    case 'weekly-production': {
      const weekStart = params.date ? new Date(params.date) : new Date();
      return getWeeklyProductionSummary(weekStart);
    }
    case 'monthly-pnl': {
      const pnl = await getPnLReport({
        year: params.year ?? new Date().getFullYear(),
        month: params.month ?? new Date().getMonth() + 1,
      });
      return [
        { label: 'Period', value: pnl.period },
        { label: 'Revenue', value: pnl.revenue },
        { label: 'COGS', value: pnl.cogs },
        { label: 'Gross Profit', value: pnl.grossProfit },
        { label: 'Gross Margin %', value: pnl.grossMarginPct },
        { label: 'Operating Expenses', value: pnl.operatingExpenses },
        { label: 'Net Income', value: pnl.netIncome },
        { label: 'Net Margin %', value: pnl.netMarginPct },
      ];
    }
    case 'inventory-valuation': {
      const locations = await getInventoryValuationByLocation();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: Record<string, any>[] = [];
      for (const loc of locations) {
        for (const item of loc.items) {
          rows.push({ location: loc.location, ...item });
        }
      }
      return rows;
    }
    case 'product-performance': {
      const start = params.startDate
        ? new Date(params.startDate)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const end = params.endDate ? new Date(params.endDate) : new Date();
      return getProductPerformance(start, end);
    }
    case 'farmers-market': {
      const start = params.startDate
        ? new Date(params.startDate)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const end = params.endDate ? new Date(params.endDate) : new Date();
      return getFarmersMarketPerformance(start, end);
    }
    case 'subscription-metrics': {
      const metrics = await getSubscriptionMetrics();
      return [
        { name: 'MRR', plan: '', status: '', monthlyValue: metrics.mrr },
        { name: 'Active Members', plan: '', status: String(metrics.activeCount), monthlyValue: 0 },
        {
          name: 'Churn Rate',
          plan: '',
          status: `${metrics.churnRate.toFixed(1)}%`,
          monthlyValue: 0,
        },
        { name: 'Est. Annual LTV', plan: '', status: '', monthlyValue: metrics.ltv },
        ...metrics.memberDetails.map((m) => ({
          name: m.name,
          plan: m.plan,
          status: m.status,
          monthlyValue: m.monthlyValue,
        })),
      ];
    }
    default:
      return [];
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ReportsPageClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData: Record<string, any>[];
  defaultParams: ReportParams;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReportsPageClient({ initialData, defaultParams }: ReportsPageClientProps) {
  const [isPending, startTransition] = useTransition();
  const [currentReport, setCurrentReport] = useState<ReportType>('daily-sales');
  const [currentParams, setCurrentParams] = useState<ReportParams>(defaultParams);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reportData, setReportData] = useState<Record<string, any>[]>(initialData);

  const handleReportChange = useCallback(
    (reportType: ReportType, params: ReportParams) => {
      setCurrentReport(reportType);
      setCurrentParams(params);
      startTransition(async () => {
        const data = await fetchReportData(reportType, params);
        setReportData(data);
      });
    },
    []
  );

  // Build date params for export (string values only)
  const dateParamsForExport: Record<string, string> = {};
  if (currentParams.date) dateParamsForExport.date = currentParams.date;
  if (currentParams.startDate) dateParamsForExport.startDate = currentParams.startDate;
  if (currentParams.endDate) dateParamsForExport.endDate = currentParams.endDate;
  if (currentParams.month) dateParamsForExport.month = String(currentParams.month);
  if (currentParams.year) dateParamsForExport.year = String(currentParams.year);

  const columns = REPORT_COLUMNS[currentReport];
  const reportTitle = REPORT_LABELS[currentReport];

  return (
    <div className="space-y-4">
      {/* Report selector */}
      <ReportSelector
        selectedReport={currentReport}
        params={currentParams}
        onReportChange={handleReportChange}
        disabled={isPending}
      />

      {/* Export buttons + loading indicator */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ExportButtons
            reportType={currentReport}
            data={reportData}
            columns={columns}
            dateParams={dateParamsForExport}
          />
          {isPending && (
            <span className="text-xs text-muted-foreground animate-pulse ml-2">Loading...</span>
          )}
        </div>
      </div>

      {/* Report title */}
      <div>
        <h2 className="text-base font-semibold text-foreground">{reportTitle}</h2>
      </div>

      {/* Report table */}
      <ReportTable
        title={reportTitle}
        columns={columns}
        data={reportData}
      />
    </div>
  );
}
