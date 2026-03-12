'use client';

import { startTransition, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { PnLReport as PnLReportType } from '@/app/actions/financial-reports';
import { getPnLReport } from '@/app/actions/financial-reports';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

type PeriodType = 'monthly' | 'quarterly' | 'annual';

type Props = {
  initialData: PnLReportType;
};

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
const currentQuarter = Math.ceil(currentMonth / 3);

export function PnLReport({ initialData }: Props) {
  const [data, setData] = useState<PnLReportType>(initialData);
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [quarter, setQuarter] = useState(currentQuarter);
  const [loading, setLoading] = useState(false);

  function fetchReport(type: PeriodType, y: number, m: number, q: number) {
    setLoading(true);
    startTransition(async () => {
      let result: PnLReportType;
      if (type === 'monthly') {
        result = await getPnLReport({ year: y, month: m });
      } else if (type === 'quarterly') {
        result = await getPnLReport({ year: y, quarter: q });
      } else {
        result = await getPnLReport({ year: y });
      }
      setData(result);
      setLoading(false);
    });
  }

  function handlePeriodTypeChange(type: PeriodType) {
    setPeriodType(type);
    fetchReport(type, year, month, quarter);
  }

  function handleYearChange(y: number) {
    setYear(y);
    fetchReport(periodType, y, month, quarter);
  }

  function handleMonthChange(m: number) {
    setMonth(m);
    fetchReport(periodType, year, m, quarter);
  }

  function handleQuarterChange(q: number) {
    setQuarter(q);
    fetchReport(periodType, year, month, q);
  }

  const netIncomeColor = data.netIncome >= 0 ? 'text-green-600' : 'text-red-600';
  const grossProfitColor = data.grossProfit >= 0 ? 'text-green-600' : 'text-red-600';

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1">
          {(['monthly', 'quarterly', 'annual'] as PeriodType[]).map((type) => (
            <Button
              key={type}
              variant={periodType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePeriodTypeChange(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>

        <select
          value={year}
          onChange={(e) => handleYearChange(Number(e.target.value))}
          className="border rounded px-2 py-1 text-sm bg-background"
        >
          {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {periodType === 'monthly' && (
          <select
            value={month}
            onChange={(e) => handleMonthChange(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm bg-background"
          >
            {months.map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>{m}</option>
            ))}
          </select>
        )}

        {periodType === 'quarterly' && (
          <select
            value={quarter}
            onChange={(e) => handleQuarterChange(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm bg-background"
          >
            <option value={1}>Q1</option>
            <option value={2}>Q2</option>
            <option value={3}>Q3</option>
            <option value={4}>Q4</option>
          </select>
        )}

        {loading && <span className="text-sm text-muted-foreground">Loading...</span>}
      </div>

      {/* P&L Statement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profit & Loss — {data.period}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Revenue */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
              Revenue
            </h3>
            <table className="w-full text-sm">
              <tbody>
                {data.revenueByChannel.map((item) => (
                  <tr key={item.channel} className="border-b last:border-0">
                    <td className="py-1 text-muted-foreground pl-4">{item.channel}</td>
                    <td className="py-1 text-right">{formatCurrency(item.revenue)}</td>
                  </tr>
                ))}
                {data.revenueByChannel.length === 0 && (
                  <tr>
                    <td className="py-1 text-muted-foreground pl-4 italic">No revenue recorded</td>
                    <td className="py-1 text-right">{formatCurrency(0)}</td>
                  </tr>
                )}
                <tr className="font-bold border-t-2">
                  <td className="py-2">Total Revenue</td>
                  <td className="py-2 text-right">{formatCurrency(data.revenue)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* COGS */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
              Cost of Goods Sold
            </h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="py-1 text-muted-foreground pl-4">Materials + Labor + Overhead</td>
                  <td className="py-1 text-right">({formatCurrency(data.cogs)})</td>
                </tr>
                <tr className="font-bold border-t-2">
                  <td className="py-2">Total COGS</td>
                  <td className="py-2 text-right">({formatCurrency(data.cogs)})</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Gross Profit */}
          <div className={`flex justify-between items-center font-bold text-base border-t-2 pt-2 ${grossProfitColor}`}>
            <span>Gross Profit</span>
            <span>
              {formatCurrency(data.grossProfit)}
              <span className="text-sm font-normal ml-2">({formatPct(data.grossMarginPct)} margin)</span>
            </span>
          </div>

          {/* Operating Expenses */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
              Operating Expenses
            </h3>
            <table className="w-full text-sm">
              <tbody>
                {data.expensesByCategory.map((item) => (
                  <tr key={item.category} className="border-b last:border-0">
                    <td className="py-1 text-muted-foreground pl-4 capitalize">
                      {item.category.replace(/_/g, ' ').toLowerCase()}
                    </td>
                    <td className="py-1 text-right">({formatCurrency(item.amount)})</td>
                  </tr>
                ))}
                {data.expensesByCategory.length === 0 && (
                  <tr>
                    <td className="py-1 text-muted-foreground pl-4 italic">No approved expenses</td>
                    <td className="py-1 text-right">{formatCurrency(0)}</td>
                  </tr>
                )}
                <tr className="font-bold border-t-2">
                  <td className="py-2">Total Operating Expenses</td>
                  <td className="py-2 text-right">({formatCurrency(data.operatingExpenses)})</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Net Income */}
          <div className={`flex justify-between items-center font-bold text-xl border-t-4 pt-3 ${netIncomeColor}`}>
            <span>Net Income</span>
            <span>
              {formatCurrency(data.netIncome)}
              <span className="text-sm font-normal ml-2">({formatPct(data.netMarginPct)} margin)</span>
            </span>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
