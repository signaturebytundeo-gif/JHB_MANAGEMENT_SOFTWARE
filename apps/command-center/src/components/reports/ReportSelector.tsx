'use client';

import { startOfWeek, startOfMonth, format } from 'date-fns';
import type { ReportType } from '@/app/actions/reports';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReportParams = {
  date?: string;
  startDate?: string;
  endDate?: string;
  month?: number;
  year?: number;
};

interface ReportSelectorProps {
  selectedReport: ReportType;
  params: ReportParams;
  onReportChange: (reportType: ReportType, params: ReportParams) => void;
  disabled?: boolean;
}

// ── Report option config ──────────────────────────────────────────────────────

const REPORT_OPTIONS: { value: ReportType; label: string }[] = [
  { value: 'daily-sales', label: 'Daily Sales Summary' },
  { value: 'weekly-production', label: 'Weekly Production Summary' },
  { value: 'monthly-pnl', label: 'Monthly P&L' },
  { value: 'inventory-valuation', label: 'Inventory Valuation by Location' },
  { value: 'product-performance', label: 'Product Performance' },
  { value: 'farmers-market', label: 'Farmers Market Performance' },
  { value: 'subscription-metrics', label: 'Subscription Metrics' },
];

// ── Default params per report ─────────────────────────────────────────────────

export function getDefaultParams(reportType: ReportType): ReportParams {
  const today = new Date();
  switch (reportType) {
    case 'daily-sales':
      return { date: format(today, 'yyyy-MM-dd') };
    case 'weekly-production':
      return { date: format(startOfWeek(today), 'yyyy-MM-dd') };
    case 'monthly-pnl':
      return { month: today.getMonth() + 1, year: today.getFullYear() };
    case 'inventory-valuation':
      return {};
    case 'product-performance':
    case 'farmers-market':
      return {
        startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd'),
      };
    case 'subscription-metrics':
      return {};
    default:
      return {};
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReportSelector({
  selectedReport,
  params,
  onReportChange,
  disabled = false,
}: ReportSelectorProps) {
  const handleReportTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as ReportType;
    onReportChange(newType, getDefaultParams(newType));
  };

  const handleDateChange = (field: keyof ReportParams, value: string | number) => {
    onReportChange(selectedReport, { ...params, [field]: value });
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
      {/* Report type selector */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="report-type" className="text-sm font-medium text-foreground">
          Report
        </label>
        <select
          id="report-type"
          value={selectedReport}
          onChange={handleReportTypeChange}
          disabled={disabled}
          className="h-10 min-w-[260px] rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {REPORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Date controls based on report type */}
      {selectedReport === 'daily-sales' && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="report-date" className="text-sm font-medium text-foreground">
            Date
          </label>
          <input
            id="report-date"
            type="date"
            value={params.date ?? ''}
            onChange={(e) => handleDateChange('date', e.target.value)}
            disabled={disabled}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      )}

      {selectedReport === 'weekly-production' && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="report-week" className="text-sm font-medium text-foreground">
            Week Starting
          </label>
          <input
            id="report-week"
            type="date"
            value={params.date ?? ''}
            onChange={(e) => handleDateChange('date', e.target.value)}
            disabled={disabled}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      )}

      {selectedReport === 'monthly-pnl' && (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-month" className="text-sm font-medium text-foreground">
              Month
            </label>
            <select
              id="report-month"
              value={params.month ?? new Date().getMonth() + 1}
              onChange={(e) => handleDateChange('month', parseInt(e.target.value))}
              disabled={disabled}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {[
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December',
              ].map((month, idx) => (
                <option key={month} value={idx + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-year" className="text-sm font-medium text-foreground">
              Year
            </label>
            <input
              id="report-year"
              type="number"
              min="2020"
              max="2030"
              value={params.year ?? new Date().getFullYear()}
              onChange={(e) => handleDateChange('year', parseInt(e.target.value))}
              disabled={disabled}
              className="h-10 w-28 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </>
      )}

      {(selectedReport === 'product-performance' || selectedReport === 'farmers-market') && (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-start" className="text-sm font-medium text-foreground">
              Start Date
            </label>
            <input
              id="report-start"
              type="date"
              value={params.startDate ?? ''}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              disabled={disabled}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-end" className="text-sm font-medium text-foreground">
              End Date
            </label>
            <input
              id="report-end"
              type="date"
              value={params.endDate ?? ''}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              disabled={disabled}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </>
      )}
    </div>
  );
}
