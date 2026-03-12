'use client';

import { useActionState, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { setBudget, type SetBudgetState, type BudgetItem } from '@/app/actions/budgets';
import { ExpenseCategory } from '@prisma/client';

const ALL_CATEGORIES = Object.values(ExpenseCategory);

function formatCategoryLabel(cat: string): string {
  return cat.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

type Props = {
  period: string;          // "YYYY-MM"
  existingBudgets: BudgetItem[];
};

const initialState: SetBudgetState = { success: false };

// Single-category budget row with its own form state
function BudgetRow({
  period,
  category,
  currentAmount,
}: {
  period: string;
  category: ExpenseCategory;
  currentAmount: number;
}) {
  const [state, formAction, pending] = useActionState(setBudget, initialState);
  const [amount, setAmount] = useState(currentAmount > 0 ? String(currentAmount) : '');

  // Reset success flash
  const [showSuccess, setShowSuccess] = useState(false);
  useEffect(() => {
    if (state.success) {
      setShowSuccess(true);
      const t = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-4 capitalize">{formatCategoryLabel(category)}</td>
      <td className="py-2">
        <form action={formAction} className="flex gap-2 items-center">
          <input type="hidden" name="period" value={period} />
          <input type="hidden" name="category" value={category} />
          <div className="relative flex items-center">
            <span className="absolute left-2 text-muted-foreground text-sm">$</span>
            <Input
              type="number"
              name="amount"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-6 w-32 h-8 text-sm"
              placeholder="0.00"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" disabled={pending} className="h-8">
            {pending ? 'Saving...' : 'Save'}
          </Button>
          {showSuccess && (
            <span className="text-xs text-green-600">Saved</span>
          )}
          {state.error && !state.success && (
            <span className="text-xs text-red-600">{state.error}</span>
          )}
        </form>
      </td>
    </tr>
  );
}

export function BudgetEntryForm({ period, existingBudgets }: Props) {
  const budgetMap = new Map(existingBudgets.map((b) => [b.category, b.budgetedAmount]));

  // Parse period for display
  const [year, month] = period.split('-').map(Number);
  const periodLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Set Monthly Budgets</CardTitle>
        <p className="text-sm text-muted-foreground">
          Budget amounts for {periodLabel}. Enter 0 to clear.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2">Category</th>
                <th className="text-left py-2">Budget Amount</th>
              </tr>
            </thead>
            <tbody>
              {ALL_CATEGORIES.map((category) => (
                <BudgetRow
                  key={category}
                  period={period}
                  category={category}
                  currentAmount={budgetMap.get(category) ?? 0}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
