'use server';

import { put } from '@vercel/blob';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/dal';
import {
  logExpenseSchema,
  approveExpenseSchema,
  type LogExpenseFormState,
  type ApproveExpenseFormState,
} from '@/lib/validators/expenses';
import { ExpenseCategory } from '@prisma/client';

// ── Log Expense ─────────────────────────────────────────────────────────────

export async function logExpense(
  prevState: LogExpenseFormState,
  formData: FormData
): Promise<LogExpenseFormState> {
  try {
    const session = await verifySession();

    const validatedFields = logExpenseSchema.safeParse({
      description: formData.get('description'),
      amount: formData.get('amount'),
      category: formData.get('category'),
      expenseDate: formData.get('expenseDate'),
      vendorName: formData.get('vendorName') || undefined,
      notes: formData.get('notes') || undefined,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = validatedFields.data;

    // Handle receipt upload — skip gracefully if BLOB_READ_WRITE_TOKEN is not set
    let receiptUrl: string | null = null;
    const receiptFile = formData.get('receipt') as File | null;
    if (receiptFile && receiptFile.size > 0) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.warn('[expenses] BLOB_READ_WRITE_TOKEN not set — skipping receipt upload in development');
      } else {
        const blob = await put(`receipts/${Date.now()}-${receiptFile.name}`, receiptFile, {
          access: 'public',
        });
        receiptUrl = blob.url;
      }
    }

    // Look up approval threshold
    const thresholds = await db.approvalThreshold.findMany({
      orderBy: { minAmount: 'asc' },
    });

    const amount = data.amount;
    const matchingThreshold = thresholds.find((t) => {
      const min = Number(t.minAmount);
      const max = t.maxAmount !== null ? Number(t.maxAmount) : Infinity;
      return amount >= min && amount <= max;
    });

    let approvalStatus: string;
    let approvedAt: Date | null = null;

    if (matchingThreshold) {
      switch (matchingThreshold.approvalType) {
        case 'auto':
          approvalStatus = 'auto_approved';
          approvedAt = new Date();
          break;
        case 'single_member':
          approvalStatus = 'pending_single';
          break;
        case 'dual_member':
          approvalStatus = 'pending_dual';
          break;
        case 'dual_bank':
          approvalStatus = 'pending_bank';
          break;
        default:
          approvalStatus = 'auto_approved';
          approvedAt = new Date();
      }
    } else {
      // No matching threshold: auto-approve
      approvalStatus = 'auto_approved';
      approvedAt = new Date();
    }

    await db.expense.create({
      data: {
        description: data.description,
        amount: data.amount,
        category: data.category,
        expenseDate: data.expenseDate,
        vendorName: data.vendorName ?? null,
        notes: data.notes ?? null,
        receiptUrl,
        approvalStatus,
        approvedAt,
        createdById: session.userId,
      },
    });

    revalidatePath('/dashboard/finance/expenses');

    return {
      success: true,
      message: `Expense logged successfully. Status: ${approvalStatus.replace(/_/g, ' ')}.`,
    };
  } catch (error) {
    console.error('Error logging expense:', error);
    return { message: 'Failed to log expense' };
  }
}

// ── Approve / Reject Expense ─────────────────────────────────────────────────

export async function approveExpense(
  prevState: ApproveExpenseFormState,
  formData: FormData
): Promise<ApproveExpenseFormState> {
  try {
    const session = await verifySession();

    const validatedFields = approveExpenseSchema.safeParse({
      expenseId: formData.get('expenseId'),
      action: formData.get('action'),
      bankAuthorizationRef: formData.get('bankAuthorizationRef') || undefined,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { expenseId, action, bankAuthorizationRef } = validatedFields.data;

    const expense = await db.expense.findUnique({ where: { id: expenseId } });
    if (!expense) return { message: 'Expense not found' };

    // Cannot self-approve
    if (expense.createdById === session.userId) {
      return { message: 'You cannot approve your own expense' };
    }

    if (action === 'reject') {
      await db.expense.update({
        where: { id: expenseId },
        data: { approvalStatus: 'rejected' },
      });
      revalidatePath('/dashboard/finance/expenses');
      return { success: true, message: 'Expense rejected' };
    }

    // Approve logic by status
    const status = expense.approvalStatus;

    if (status === 'pending_single') {
      await db.expense.update({
        where: { id: expenseId },
        data: {
          approvedById: session.userId,
          approvalStatus: 'approved',
          approvedAt: new Date(),
        },
      });
    } else if (status === 'pending_dual') {
      if (!expense.approvedById) {
        // First approver
        await db.expense.update({
          where: { id: expenseId },
          data: { approvedById: session.userId, approvedAt: new Date() },
        });
        revalidatePath('/dashboard/finance/expenses');
        return { success: true, message: 'First approval recorded. Awaiting second approver.' };
      } else {
        // Second approver — must be different
        if (expense.approvedById === session.userId) {
          return { message: 'Dual control: second approver must be a different user' };
        }
        await db.expense.update({
          where: { id: expenseId },
          data: {
            secondApprovedById: session.userId,
            approvalStatus: 'approved',
            approvedAt: new Date(),
          },
        });
      }
    } else if (status === 'pending_bank') {
      if (!bankAuthorizationRef) {
        return { message: 'Bank authorization reference number is required for this expense' };
      }
      if (!expense.approvedById) {
        // First approver
        await db.expense.update({
          where: { id: expenseId },
          data: {
            approvedById: session.userId,
            approvedAt: new Date(),
            bankAuthorizationRef,
          },
        });
        revalidatePath('/dashboard/finance/expenses');
        return { success: true, message: 'First approval recorded. Awaiting second approver.' };
      } else {
        if (expense.approvedById === session.userId) {
          return { message: 'Dual control: second approver must be a different user' };
        }
        await db.expense.update({
          where: { id: expenseId },
          data: {
            secondApprovedById: session.userId,
            approvalStatus: 'approved',
            approvedAt: new Date(),
            bankAuthorizationRef,
          },
        });
      }
    } else {
      return { message: 'Expense is not pending approval' };
    }

    revalidatePath('/dashboard/finance/expenses');
    return { success: true, message: 'Expense approved successfully' };
  } catch (error) {
    console.error('Error approving expense:', error);
    return { message: 'Failed to approve expense' };
  }
}

// ── Get Expenses ─────────────────────────────────────────────────────────────

export type ExpenseFilters = {
  category?: ExpenseCategory;
  approvalStatus?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

export async function getExpenses(filters?: ExpenseFilters) {
  try {
    await verifySession();

    const where: Record<string, unknown> = {};
    if (filters?.category) where.category = filters.category;
    if (filters?.approvalStatus) where.approvalStatus = filters.approvalStatus;
    if (filters?.dateFrom || filters?.dateTo) {
      where.expenseDate = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {}),
      };
    }

    const expenses = await db.expense.findMany({
      where,
      include: {
        createdBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        secondApprovedBy: { select: { name: true } },
      },
      orderBy: { expenseDate: 'desc' },
    });

    return expenses.map((expense) => ({
      ...expense,
      amount: Number(expense.amount),
    }));
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }
}

export type ExpenseListItem = Awaited<ReturnType<typeof getExpenses>>[number];
