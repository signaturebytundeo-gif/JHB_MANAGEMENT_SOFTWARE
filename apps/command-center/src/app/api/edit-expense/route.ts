import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/dal';
import { z } from 'zod';
import { ExpenseCategory, PaymentMethod } from '@prisma/client';

const editExpenseSchema = z.object({
  expenseId: z.string().min(1),
  description: z.string().min(1).max(200),
  amount: z.number().positive(),
  category: z.nativeEnum(ExpenseCategory),
  expenseDate: z.string().transform(str => new Date(str)),
  vendorName: z.string().optional(),
  notes: z.string().max(500).optional(),
  subcategory: z.string().max(100).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  isRecurring: z.boolean().optional(),
  recurrenceFrequency: z.enum(['Weekly', 'Monthly', 'Quarterly', 'Annually']).optional(),
  nextDueDate: z.string().transform(str => str ? new Date(str) : null).optional(),
  editReason: z.string().min(1).max(500), // Required reason for edit
});

export async function POST(req: Request) {
  try {
    const session = await verifySession();
    const body = await req.json();

    const validated = editExpenseSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validated.data;

    // Find the original expense
    const originalExpense = await prisma.expense.findUnique({
      where: { id: data.expenseId },
    });

    if (!originalExpense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Check permissions - only the creator or admins can edit
    if (originalExpense.createdById !== session.userId && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You can only edit your own expenses' },
        { status: 403 }
      );
    }

    // Can't edit rejected expenses
    if (originalExpense.approvalStatus === 'rejected') {
      return NextResponse.json(
        { error: 'Cannot edit rejected expenses' },
        { status: 400 }
      );
    }

    // Build audit trail entry
    const editEntry = {
      editedAt: new Date().toISOString(),
      editedBy: session.userId,
      editedByName: session.user.name,
      editReason: data.editReason,
      changes: [] as Array<{field: string; oldValue: any; newValue: any}>,
    };

    // Track changes
    const fieldsToTrack = [
      { field: 'description', oldValue: originalExpense.description, newValue: data.description },
      { field: 'amount', oldValue: Number(originalExpense.amount), newValue: data.amount },
      { field: 'category', oldValue: originalExpense.category, newValue: data.category },
      { field: 'expenseDate', oldValue: originalExpense.expenseDate.toISOString().split('T')[0], newValue: data.expenseDate.toISOString().split('T')[0] },
      { field: 'vendorName', oldValue: originalExpense.vendorName, newValue: data.vendorName || null },
      { field: 'notes', oldValue: originalExpense.notes, newValue: data.notes || null },
      { field: 'subcategory', oldValue: originalExpense.subcategory, newValue: data.subcategory || null },
      { field: 'paymentMethod', oldValue: originalExpense.paymentMethod, newValue: data.paymentMethod || null },
      { field: 'isRecurring', oldValue: originalExpense.isRecurring, newValue: data.isRecurring || false },
      { field: 'recurrenceFrequency', oldValue: originalExpense.recurrenceFrequency, newValue: data.recurrenceFrequency || null },
      { field: 'nextDueDate', oldValue: originalExpense.nextDueDate?.toISOString().split('T')[0] || null, newValue: data.nextDueDate?.toISOString().split('T')[0] || null },
    ];

    for (const { field, oldValue, newValue } of fieldsToTrack) {
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        editEntry.changes.push({ field, oldValue, newValue });
      }
    }

    // If no changes, return early
    if (editEntry.changes.length === 0) {
      return NextResponse.json(
        { error: 'No changes detected' },
        { status: 400 }
      );
    }

    // Get existing edit history
    const existingHistory = originalExpense.editHistory as any[] || [];
    const newEditHistory = [...existingHistory, editEntry];

    // If this is an approved expense that's being edited, reset approval status
    let updateData: any = {
      description: data.description,
      amount: data.amount,
      category: data.category,
      expenseDate: data.expenseDate,
      vendorName: data.vendorName || null,
      notes: data.notes || null,
      subcategory: data.subcategory || null,
      paymentMethod: data.paymentMethod || null,
      isRecurring: data.isRecurring || false,
      recurrenceFrequency: data.recurrenceFrequency || null,
      nextDueDate: data.nextDueDate || null,
      editHistory: newEditHistory,
      updatedAt: new Date(),
    };

    // Reset approval if expense was previously approved and non-trivial changes made
    const significantChanges = editEntry.changes.some(change =>
      ['amount', 'category', 'description'].includes(change.field)
    );

    if (originalExpense.approvalStatus === 'approved' && significantChanges) {
      // Recurring expenses remain auto-approved even after edits
      if (data.isRecurring) {
        updateData.approvalStatus = 'auto_approved';
        updateData.approvedAt = new Date();
      } else {
        // One-time expenses need re-approval after significant changes
        updateData.approvalStatus = 'pending_single';
        updateData.approvedById = null;
        updateData.secondApprovedById = null;
        updateData.approvedAt = null;
      }
    }

    // Update the expense
    const updatedExpense = await prisma.expense.update({
      where: { id: data.expenseId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Expense updated successfully',
      changesCount: editEntry.changes.length,
      needsReapproval: updateData.approvalStatus === 'pending_single',
      expense: {
        id: updatedExpense.id,
        approvalStatus: updatedExpense.approvalStatus,
      },
    });
  } catch (error) {
    console.error('[edit-expense] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update expense' },
      { status: 500 }
    );
  }
}