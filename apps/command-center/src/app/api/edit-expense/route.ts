import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/dal';
import { put } from '@vercel/blob';
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

    // Handle both JSON and FormData
    let data: any;
    let receiptFile: File | null = null;

    const contentType = req.headers.get('content-type');

    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData (with file upload)
      const formData = await req.formData();
      receiptFile = formData.get('receipt') as File | null;

      const formDataObj: any = {};
      for (const [key, value] of formData.entries()) {
        if (key !== 'receipt') {
          if (key === 'isRecurring') {
            formDataObj[key] = value === 'true' || value === 'on';
          } else if (key === 'amount') {
            formDataObj[key] = parseFloat(value as string);
          } else {
            formDataObj[key] = value;
          }
        }
      }

      const validated = editExpenseSchema.safeParse(formDataObj);
      if (!validated.success) {
        return NextResponse.json(
          { error: 'Invalid input', details: validated.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      data = validated.data;
    } else {
      // Handle JSON
      const body = await req.json();
      const validated = editExpenseSchema.safeParse(body);
      if (!validated.success) {
        return NextResponse.json(
          { error: 'Invalid input', details: validated.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      data = validated.data;
    }

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

    // Allow all users to edit expenses (business requirement for collaborative expense management)
    // Only restriction: can't edit rejected expenses

    // Can't edit rejected expenses
    if (originalExpense.approvalStatus === 'rejected') {
      return NextResponse.json(
        { error: 'Cannot edit rejected expenses' },
        { status: 400 }
      );
    }

    // Handle receipt upload
    let newReceiptUrl = originalExpense.receiptUrl;
    if (receiptFile && receiptFile.size > 0) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.warn('[edit-expense] BLOB_READ_WRITE_TOKEN not set — skipping receipt upload');
      } else {
        const ext = receiptFile.name.includes('.') ? receiptFile.name.split('.').pop() : 'jpg';
        const blobPath = `receipts/edited/${session.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

        const blob = await put(blobPath, receiptFile, {
          access: 'public',
          contentType: receiptFile.type
        });
        newReceiptUrl = blob.url;
      }
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
      { field: 'receiptUrl', oldValue: originalExpense.receiptUrl, newValue: newReceiptUrl },
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
      receiptUrl: newReceiptUrl,
      editHistory: newEditHistory,
      updatedAt: new Date(),
    };

    // Handle approval status for edits
    const significantChanges = editEntry.changes.some(change =>
      ['amount', 'category', 'description'].includes(change.field)
    );

    // If expense is now marked as recurring, auto-approve it
    if (data.isRecurring) {
      updateData.approvalStatus = 'auto_approved';
      updateData.approvedAt = new Date();
      updateData.approvedById = session.userId;
    }
    // If expense was previously approved and has significant changes (and not recurring)
    else if (originalExpense.approvalStatus === 'approved' && significantChanges) {
      // One-time expenses need re-approval after significant changes
      updateData.approvalStatus = 'pending_single';
      updateData.approvedById = null;
      updateData.secondApprovedById = null;
      updateData.approvedAt = null;
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