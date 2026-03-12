'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/dal';
import { ExpenseCategory } from '@prisma/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export type BudgetVsActualItem = {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePct: number;
};

export type BudgetItem = {
  id: string;
  period: string;
  category: ExpenseCategory;
  budgetedAmount: number;
};

// ── Validation schema ─────────────────────────────────────────────────────────

const PERIOD_REGEX = /^\d{4}-\d{2}$/;

const setBudgetSchema = z.object({
  period: z.string().regex(PERIOD_REGEX, 'Period must be in YYYY-MM format'),
  category: z.nativeEnum(ExpenseCategory),
  amount: z.coerce.number().positive('Amount must be a positive number'),
});

// ── getBudgetVsActual ─────────────────────────────────────────────────────────

export async function getBudgetVsActual(period: string): Promise<BudgetVsActualItem[]> {
  try {
    await verifySession();

    if (!PERIOD_REGEX.test(period)) {
      return [];
    }

    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Fetch all Budget records for this period
    const budgets = await db.budget.findMany({
      where: { period },
    });

    const budgetMap = new Map<ExpenseCategory, number>(
      budgets.map((b) => [b.category, Number(b.budgetedAmount)])
    );

    // Fetch approved expenses grouped by category for the month
    const expenseRows = await db.expense.groupBy({
      by: ['category'],
      where: {
        expenseDate: { gte: startDate, lte: endDate },
        approvalStatus: { in: ['auto_approved', 'approved'] },
      },
      _sum: { amount: true },
    });

    const actualMap = new Map<ExpenseCategory, number>(
      expenseRows.map((row) => [row.category, Number(row._sum.amount ?? 0)])
    );

    // Build result for every ExpenseCategory
    const allCategories = Object.values(ExpenseCategory);
    const results: BudgetVsActualItem[] = [];

    for (const category of allCategories) {
      const budgeted = budgetMap.get(category) ?? 0;
      const actual = actualMap.get(category) ?? 0;

      // Only include categories that have either a budget or actual spend
      if (budgeted === 0 && actual === 0) continue;

      const variance = budgeted - actual;
      const variancePct = budgeted > 0 ? (variance / budgeted) * 100 : actual > 0 ? -100 : 0;

      results.push({ category, budgeted, actual, variance, variancePct });
    }

    return results.sort((a, b) => a.category.localeCompare(b.category));
  } catch (error) {
    console.error('Error fetching budget vs actual:', error);
    return [];
  }
}

// ── getBudgets ────────────────────────────────────────────────────────────────

export async function getBudgets(period: string): Promise<BudgetItem[]> {
  try {
    await verifySession();

    const budgets = await db.budget.findMany({
      where: { period },
      orderBy: { category: 'asc' },
    });

    return budgets.map((b) => ({
      id: b.id,
      period: b.period,
      category: b.category,
      budgetedAmount: Number(b.budgetedAmount),
    }));
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return [];
  }
}

// ── setBudget ─────────────────────────────────────────────────────────────────

export type SetBudgetState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function setBudget(
  prevState: SetBudgetState,
  formData: FormData
): Promise<SetBudgetState> {
  try {
    await verifySession();

    const raw = {
      period: formData.get('period'),
      category: formData.get('category'),
      amount: formData.get('amount'),
    };

    const parsed = setBudgetSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const [field, errs] of Object.entries(parsed.error.flatten().fieldErrors)) {
        fieldErrors[field] = errs as string[];
      }
      return { success: false, error: 'Validation failed', fieldErrors };
    }

    const { period, category, amount } = parsed.data;

    await db.budget.upsert({
      where: { period_category: { period, category } },
      update: { budgetedAmount: amount },
      create: { period, category, budgetedAmount: amount },
    });

    revalidatePath('/dashboard/finance/reports');

    return { success: true };
  } catch (error) {
    console.error('Error setting budget:', error);
    return { success: false, error: 'Failed to save budget. Please try again.' };
  }
}
