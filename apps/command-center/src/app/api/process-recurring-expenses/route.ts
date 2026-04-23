import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/dal';

// Helper function to calculate next due date
function calculateNextDueDate(currentDate: Date, frequency: string): Date {
  const nextDate = new Date(currentDate);

  switch (frequency) {
    case 'Weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'Monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'Quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'Annually':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      throw new Error(`Unknown recurrence frequency: ${frequency}`);
  }

  return nextDate;
}

export async function POST(req: Request) {
  try {
    // Verify this is an internal system call (could be enhanced with API key)
    const session = await verifySession();
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day

    // Find all recurring expenses that are due
    const dueExpenses = await prisma.expense.findMany({
      where: {
        isRecurring: true,
        nextDueDate: {
          lte: today,
        },
        recurrenceFrequency: {
          not: null,
        },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const results = [];

    for (const expense of dueExpenses) {
      if (!expense.recurrenceFrequency) {
        continue; // Skip if no recurrence frequency
      }

      try {
        // Create new expense record based on the recurring template
        const newExpense = await prisma.expense.create({
          data: {
            description: expense.description,
            amount: expense.amount,
            category: expense.category,
            expenseDate: expense.nextDueDate!,
            vendorName: expense.vendorName,
            notes: expense.notes,
            paymentMethod: expense.paymentMethod,
            subcategory: expense.subcategory,
            source: 'recurring',
            approvalStatus: 'auto_approved', // Recurring expenses are auto-approved
            isRecurring: false, // The created expense is not itself recurring
            createdById: expense.createdById,
          },
        });

        // Update the original recurring expense with next due date
        const nextDueDate = calculateNextDueDate(
          expense.nextDueDate!,
          expense.recurrenceFrequency
        );

        await prisma.expense.update({
          where: { id: expense.id },
          data: {
            nextDueDate,
            updatedAt: new Date(),
          },
        });

        results.push({
          originalExpenseId: expense.id,
          newExpenseId: newExpense.id,
          description: expense.description,
          amount: expense.amount,
          nextDueDate,
          frequency: expense.recurrenceFrequency,
        });

        console.log(`[recurring-expenses] Created expense ${newExpense.id} from recurring template ${expense.id}`);
      } catch (error) {
        console.error(`[recurring-expenses] Failed to process recurring expense ${expense.id}:`, error);
        results.push({
          originalExpenseId: expense.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[recurring-expenses] Processing failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to process recurring expenses',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}