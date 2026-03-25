import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { verifySession } from '@/lib/dal';
import {
  getDailySalesSummary,
  getWeeklyProductionSummary,
  getInventoryValuationByLocation,
  getProductPerformance,
  getFarmersMarketPerformance,
  getSubscriptionMetrics,
  type ReportType,
} from '@/app/actions/reports';
import { getPnLReport } from '@/app/actions/financial-reports';

export async function GET(request: NextRequest) {
  // Auth gate (research pitfall 3)
  try {
    await verifySession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const report = searchParams.get('report') as ReportType | null;
  const dateParam = searchParams.get('date');
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');

  if (!report) {
    return NextResponse.json({ error: 'Missing report parameter' }, { status: 400 });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'JHB Command Center';
  workbook.created = new Date();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: Record<string, any>[] = [];
    let sheetName: string = report;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let columns: { header: string; key: string; width: number; numFmt?: string }[] = [];

    switch (report) {
      case 'daily-sales': {
        const date = dateParam ? new Date(dateParam) : new Date();
        data = await getDailySalesSummary(date);
        sheetName = 'Daily Sales Summary';
        columns = [
          { header: 'Channel', key: 'channel', width: 25 },
          { header: 'Orders', key: 'orderCount', width: 12 },
          { header: 'Units Sold', key: 'unitsSold', width: 12 },
          { header: 'Revenue', key: 'revenue', width: 16, numFmt: '$#,##0.00' },
        ];
        break;
      }

      case 'weekly-production': {
        const weekStart = dateParam ? new Date(dateParam) : new Date();
        data = await getWeeklyProductionSummary(weekStart);
        sheetName = 'Weekly Production';
        columns = [
          { header: 'Product', key: 'product', width: 30 },
          { header: 'Batch Count', key: 'batchCount', width: 14 },
          { header: 'Total Units', key: 'totalUnits', width: 14 },
          { header: 'Released Units', key: 'releasedUnits', width: 16 },
          { header: 'QC Pass Rate (%)', key: 'qcPassRate', width: 18, numFmt: '0.0' },
        ];
        break;
      }

      case 'monthly-pnl': {
        const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();
        const quarterParam = searchParams.get('quarter');
        const quarter = quarterParam ? parseInt(quarterParam) : undefined;
        const month = monthParam ? parseInt(monthParam) : undefined;

        // Resolve period: month takes priority, then quarter, then annual
        const pnl = month
          ? await getPnLReport({ year, month })
          : quarter
            ? await getPnLReport({ year, quarter })
            : await getPnLReport({ year });

        data = [
          { label: 'Period', value: pnl.period },
          { label: 'Revenue', value: pnl.revenue },
          { label: 'COGS', value: pnl.cogs },
          { label: 'Gross Profit', value: pnl.grossProfit },
          { label: 'Gross Margin %', value: pnl.grossMarginPct },
          { label: 'Operating Expenses', value: pnl.operatingExpenses },
          { label: 'Net Income', value: pnl.netIncome },
          { label: 'Net Margin %', value: pnl.netMarginPct },
        ];
        sheetName = 'P&L Report';
        columns = [
          { header: 'Metric', key: 'label', width: 25 },
          { header: 'Value', key: 'value', width: 20, numFmt: '$#,##0.00' },
        ];
        break;
      }

      case 'inventory-valuation': {
        const locations = await getInventoryValuationByLocation();
        for (const loc of locations) {
          for (const item of loc.items) {
            data.push({ location: loc.location, ...item });
          }
        }
        sheetName = 'Inventory Valuation';
        columns = [
          { header: 'Location', key: 'location', width: 25 },
          { header: 'Product', key: 'product', width: 30 },
          { header: 'Units', key: 'units', width: 12 },
          { header: 'Unit Cost', key: 'unitCost', width: 14, numFmt: '$#,##0.00' },
          { header: 'Total Value', key: 'totalValue', width: 16, numFmt: '$#,##0.00' },
        ];
        break;
      }

      case 'product-performance': {
        const start = startDateParam ? new Date(startDateParam) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDateParam ? new Date(endDateParam) : new Date();
        data = await getProductPerformance(start, end);
        sheetName = 'Product Performance';
        columns = [
          { header: 'Product', key: 'product', width: 30 },
          { header: 'Units Sold', key: 'unitsSold', width: 14 },
          { header: 'Revenue', key: 'revenue', width: 16, numFmt: '$#,##0.00' },
          { header: 'Avg Price', key: 'avgPrice', width: 14, numFmt: '$#,##0.00' },
          { header: 'Est. Margin', key: 'estimatedMargin', width: 16, numFmt: '$#,##0.00' },
          { header: 'Margin %', key: 'marginPercent', width: 12, numFmt: '0.0' },
        ];
        break;
      }

      case 'farmers-market': {
        const start = startDateParam ? new Date(startDateParam) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDateParam ? new Date(endDateParam) : new Date();
        data = await getFarmersMarketPerformance(start, end);
        sheetName = 'Farmers Market';
        columns = [
          { header: 'Market', key: 'market', width: 30 },
          { header: 'Sales Count', key: 'salesCount', width: 14 },
          { header: 'Revenue', key: 'revenue', width: 16, numFmt: '$#,##0.00' },
          { header: 'Avg Order Value', key: 'avgOrderValue', width: 18, numFmt: '$#,##0.00' },
          { header: 'Top Product', key: 'topProduct', width: 30 },
        ];
        break;
      }

      case 'subscription-metrics': {
        const metrics = await getSubscriptionMetrics();
        data = metrics.memberDetails.map((m) => ({ ...m }));
        // Add summary rows at top
        data = [
          { name: 'MRR', plan: '', status: '', monthlyValue: metrics.mrr },
          { name: 'Active Members', plan: '', status: '', monthlyValue: metrics.activeCount },
          { name: 'Churn Rate (%)', plan: '', status: '', monthlyValue: metrics.churnRate },
          { name: 'Est. LTV', plan: '', status: '', monthlyValue: metrics.ltv },
          { name: '---', plan: '', status: '', monthlyValue: 0 },
          ...data,
        ];
        sheetName = 'Subscription Metrics';
        columns = [
          { header: 'Name / Metric', key: 'name', width: 30 },
          { header: 'Plan', key: 'plan', width: 25 },
          { header: 'Status', key: 'status', width: 14 },
          { header: 'Monthly Value', key: 'monthlyValue', width: 18, numFmt: '$#,##0.00' },
        ];
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });
    }

    const worksheet = workbook.addWorksheet(sheetName);
    worksheet.columns = columns;

    // Bold header row
    worksheet.getRow(1).font = { bold: true };

    // Add data rows
    for (const row of data) {
      worksheet.addRow(row);
    }

    // Apply number formatting to currency/number columns
    for (const col of columns) {
      if (col.numFmt) {
        worksheet.getColumn(col.key).numFmt = col.numFmt;
      }
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    const filename = `${report}-${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating Excel export:', error);
    return NextResponse.json({ error: 'Failed to generate Excel file' }, { status: 500 });
  }
}
