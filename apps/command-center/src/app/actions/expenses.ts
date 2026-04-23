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
import { sendApprovalEmails } from '@/lib/send-approval-emails';

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
      subcategory: formData.get('subcategory') || undefined,
      paymentMethod: formData.get('paymentMethod') || undefined,
      isRecurring: formData.get('isRecurring') === 'on' || formData.get('isRecurring') === 'true',
      recurrenceFrequency: formData.get('recurrenceFrequency') || undefined,
      nextDueDate: formData.get('nextDueDate') || undefined,
      prefilledReceiptUrl: formData.get('prefilledReceiptUrl') || undefined,
      lineItems: formData.get('lineItems') || undefined,
      scanConfidence: formData.get('scanConfidence') || undefined,
      documentType: formData.get('documentType') || undefined,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = validatedFields.data;

    // Handle receipt:
    //   1. If the scanner already uploaded the file (prefilledReceiptUrl), reuse it.
    //   2. Otherwise upload the manual file picker's file via Vercel Blob.
    let receiptUrl: string | null = data.prefilledReceiptUrl ?? null;
    if (!receiptUrl) {
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
    }

    // Parse line items JSON if provided by scanner
    let lineItemsJson: unknown = undefined;
    if (data.lineItems) {
      try {
        lineItemsJson = JSON.parse(data.lineItems);
      } catch {
        // ignore malformed payload from client
      }
    }

    let approvalStatus: string;
    let approvedAt: Date | null = null;

    // Recurring expenses are automatically approved per requirements
    if (data.isRecurring) {
      approvalStatus = 'auto_approved';
      approvedAt = new Date();
    } else {
      // Look up approval threshold for one-time expenses
      const thresholds = await db.approvalThreshold.findMany({
        orderBy: { minAmount: 'asc' },
      });

      const amount = data.amount;
      const matchingThreshold = thresholds.find((t) => {
        const min = Number(t.minAmount);
        const max = t.maxAmount !== null ? Number(t.maxAmount) : Infinity;
        return amount >= min && amount <= max;
      });

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
    }

    const newExpense = await db.expense.create({
      data: {
        description: data.description,
        amount: data.amount,
        category: data.category,
        expenseDate: data.expenseDate,
        vendorName: data.vendorName ?? null,
        notes: data.notes ?? null,
        subcategory: data.subcategory ?? null,
        paymentMethod: data.paymentMethod ?? null,
        isRecurring: data.isRecurring ?? false,
        recurrenceFrequency: data.recurrenceFrequency ?? null,
        nextDueDate: data.nextDueDate ?? null,
        receiptUrl,
        lineItems: lineItemsJson as never,
        scanConfidence: data.scanConfidence ?? null,
        documentType: data.documentType ?? null,
        approvalStatus,
        approvedAt,
        createdById: session.userId,
        source: 'manual', // Explicitly set source for manual expenses
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Send approval emails if required
    if (approvalStatus.startsWith('pending_')) {
      try {
        await sendApprovalEmails({
          id: newExpense.id,
          description: newExpense.description,
          amount: Number(newExpense.amount),
          category: newExpense.category,
          expenseDate: newExpense.expenseDate,
          vendorName: newExpense.vendorName,
          createdBy: newExpense.createdBy,
        });
      } catch (emailError) {
        console.error('[logExpense] Failed to send approval emails:', emailError);
        // Continue with success response even if email fails
      }
    }

    // Auto-save expense template for manual expenses
    if (data.vendorName && data.description) {
      await saveExpenseTemplate(
        data.vendorName,
        data.category,
        data.description,
        data.paymentMethod,
        data.subcategory,
        data.isRecurring,
        data.recurrenceFrequency
      );
    }

    revalidatePath('/dashboard/finance/expenses');

    const statusMessage = approvalStatus.startsWith('pending_')
      ? `${approvalStatus.replace(/_/g, ' ')}. Approval emails have been sent to the designated approvers.`
      : approvalStatus.replace(/_/g, ' ');

    return {
      success: true,
      message: `Expense logged successfully. Status: ${statusMessage}`,
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
        event: {
          select: {
            id: true,
            name: true,
            eventDate: true,
          },
        },
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

// ── Auto-Create Expense from Event ───────────────────────────────────────────

export async function createOrUpdateAutoExpenseFromEvent(
  eventId: string,
  eventName: string,
  eventDate: Date,
  totalCost: number,
  userId: string
) {
  if (totalCost <= 0) {
    // No cost, delete any existing auto-expense for this event
    await db.expense.deleteMany({
      where: {
        eventId,
        source: 'auto-event',
      },
    });
    return null;
  }

  // Look for existing auto-expense for this event
  const existingExpense = await db.expense.findFirst({
    where: {
      eventId,
      source: 'auto-event',
    },
  });

  const expenseData = {
    description: `Market booth fees and overhead - ${eventName}`,
    amount: totalCost,
    category: 'OVERHEAD' as const,
    expenseDate: eventDate,
    vendorName: eventName,
    notes: `Auto-imported from Events: ${eventName} on ${eventDate.toLocaleDateString()}`,
    paymentMethod: null,
    source: 'auto-event',
    eventId,
    approvalStatus: 'auto_approved', // Market fees are pre-agreed operational costs
    approvedAt: new Date(),
    createdById: userId,
  };

  if (existingExpense) {
    // Update existing auto-expense
    await db.expense.update({
      where: { id: existingExpense.id },
      data: {
        ...expenseData,
        updatedAt: new Date(),
      },
    });
    return existingExpense.id;
  } else {
    // Create new auto-expense
    const newExpense = await db.expense.create({
      data: expenseData,
    });
    return newExpense.id;
  }
}

// ── Template Management ───────────────────────────────────────────────────────

export async function saveExpenseTemplate(
  vendor: string,
  category: string,
  description: string,
  paymentMethod?: string | null,
  subcategory?: string | null,
  isRecurring?: boolean | null,
  recurrenceFrequency?: string | null
) {
  try {
    // Check if template already exists
    const existing = await db.expenseTemplate.findFirst({
      where: {
        vendor,
        category,
        description,
      },
    });

    if (existing) {
      return null; // Don't create duplicates
    }

    const template = await db.expenseTemplate.create({
      data: {
        vendor,
        category,
        description,
        paymentMethod: paymentMethod || null,
        subcategory: subcategory || null,
        isRecurring: isRecurring || false,
        recurrenceFrequency: recurrenceFrequency || null,
      },
    });

    return template;
  } catch (error) {
    console.error('Error saving expense template:', error);
    return null;
  }
}

export async function getExpenseTemplates() {
  try {
    const templates = await db.expenseTemplate.findMany({
      orderBy: [
        { category: 'asc' },
        { vendor: 'asc' },
        { description: 'asc' },
      ],
    });

    return templates;
  } catch (error) {
    console.error('Error fetching expense templates:', error);
    return [];
  }
}

export async function deleteExpenseTemplate(templateId: string) {
  try {
    await verifySession();

    await db.expenseTemplate.delete({
      where: { id: templateId },
    });

    return { success: true, message: 'Template deleted successfully' };
  } catch (error) {
    console.error('Error deleting expense template:', error);
    return { message: 'Failed to delete template' };
  }
}
