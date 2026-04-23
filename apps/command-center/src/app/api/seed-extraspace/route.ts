import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/dal';

/**
 * Seed the ExtraSpace Storage recurring expense
 * This is a one-time setup endpoint for the recurring ExtraSpace storage expense
 */
export async function POST(req: Request) {
  try {
    // Verify admin access
    const session = await verifySession();
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // Check if ExtraSpace expense already exists
    const existingExpense = await prisma.expense.findFirst({
      where: {
        vendorName: 'ExtraSpace Storage',
        isRecurring: true,
      },
    });

    if (existingExpense) {
      return NextResponse.json({
        success: true,
        message: 'ExtraSpace Storage recurring expense already exists',
        expenseId: existingExpense.id,
      });
    }

    // Calculate next due date (1st of next month)
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Create the recurring ExtraSpace Storage expense
    const extraspaceExpense = await prisma.expense.create({
      data: {
        description: 'Monthly storage unit rental for business inventory and supplies',
        amount: 150.00, // Typical storage unit cost, can be edited later
        category: 'STORAGE_RENT',
        expenseDate: new Date(), // Initial date for the template
        vendorName: 'ExtraSpace Storage',
        notes: 'Monthly recurring expense for business storage needs',
        subcategory: 'Storage Unit Rental',
        paymentMethod: 'BUSINESS_CARD',
        isRecurring: true,
        recurrenceFrequency: 'Monthly',
        nextDueDate: nextMonth,
        approvalStatus: 'auto_approved', // Recurring expenses are auto-approved
        approvedAt: new Date(),
        source: 'seeded',
        createdById: session.userId,
      },
    });

    // Also create a corresponding expense template
    await prisma.expenseTemplate.create({
      data: {
        vendor: 'ExtraSpace Storage',
        category: 'STORAGE_RENT',
        subcategory: 'Storage Unit Rental',
        description: 'Monthly storage unit rental for business inventory and supplies',
        paymentMethod: 'BUSINESS_CARD',
        isRecurring: true,
        recurrenceFrequency: 'Monthly',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'ExtraSpace Storage recurring expense created successfully',
      expense: {
        id: extraspaceExpense.id,
        description: extraspaceExpense.description,
        amount: Number(extraspaceExpense.amount),
        vendor: extraspaceExpense.vendorName,
        nextDueDate: extraspaceExpense.nextDueDate?.toISOString().split('T')[0],
        frequency: extraspaceExpense.recurrenceFrequency,
      },
    });
  } catch (error) {
    console.error('[seed-extraspace] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create ExtraSpace Storage expense',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}