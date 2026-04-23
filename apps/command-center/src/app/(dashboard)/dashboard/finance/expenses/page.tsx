import { getExpenses, getExpenseTemplates } from '@/app/actions/expenses';
import { verifySession } from '@/lib/dal';
import { db } from '@/lib/db';
import { ExpensesDashboardClient } from '@/components/finance/ExpensesDashboardClient';

export default async function ExpensesPage() {
  const [session, expenses, thresholds, templates] = await Promise.all([
    verifySession(),
    getExpenses(),
    db.approvalThreshold.findMany({ orderBy: { minAmount: 'asc' } }),
    getExpenseTemplates(),
  ]);

  const approvalThresholds = thresholds.map((t) => ({
    ...t,
    minAmount: Number(t.minAmount),
    maxAmount: t.maxAmount !== null ? Number(t.maxAmount) : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Expenses</h1>
        <p className="text-muted-foreground mt-2">
          Log business expenses, track approvals, and manage receipts.
        </p>
      </div>

      <ExpensesDashboardClient
        expenses={expenses}
        approvalThresholds={approvalThresholds}
        templates={templates}
        currentUserId={session.userId}
      />
    </div>
  );
}
