import { format } from 'date-fns';
import {
  getPnLReport,
  getCashFlowStatement,
  getCashFlowProjection,
  getWeeklyCashPosition,
} from '@/app/actions/financial-reports';
import { getBudgetVsActual, getBudgets } from '@/app/actions/budgets';
import { PnLReport } from '@/components/finance/PnLReport';
import { CashFlowStatement } from '@/components/finance/CashFlowStatement';
import { CashFlowProjectionChart } from '@/components/finance/CashFlowProjectionChart';
import { BudgetVsActualTable } from '@/components/finance/BudgetVsActualTable';
import { BudgetEntryForm } from '@/components/finance/BudgetEntryForm';
import { WeeklyCashPositionTable } from '@/components/finance/WeeklyCashPositionTable';

export default async function FinanceReportsPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentPeriod = format(now, 'yyyy-MM');

  const [
    pnlData,
    cashFlowData,
    projectionData,
    budgetVsActualData,
    budgetsData,
    weeklyData,
  ] = await Promise.all([
    getPnLReport({ year: currentYear, month: currentMonth }),
    getCashFlowStatement({ year: currentYear, month: currentMonth }),
    getCashFlowProjection(),
    getBudgetVsActual(currentPeriod),
    getBudgets(currentPeriod),
    getWeeklyCashPosition(8),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Financial Reports</h1>
        <p className="text-muted-foreground mt-2">
          P&L, cash flow statements, projections, budget tracking, and weekly cash position.
        </p>
      </div>

      {/* P&L Report */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Profit & Loss Report</h2>
        <PnLReport initialData={pnlData} />
      </section>

      {/* Cash Flow Statement */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Cash Flow Statement</h2>
        <CashFlowStatement data={cashFlowData} />
      </section>

      {/* 90-Day Projection */}
      <section>
        <h2 className="text-xl font-semibold mb-4">90-Day Cash Flow Projection</h2>
        <CashFlowProjectionChart data={projectionData} />
      </section>

      {/* Budget vs Actual + Entry */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Budget Management</h2>
        <div className="space-y-6">
          <BudgetVsActualTable data={budgetVsActualData} />
          <BudgetEntryForm period={currentPeriod} existingBudgets={budgetsData} />
        </div>
      </section>

      {/* Weekly Cash Position */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Weekly Cash Position</h2>
        <WeeklyCashPositionTable data={weeklyData} />
      </section>
    </div>
  );
}
