import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifyApprovalToken, getApproverEmails } from '@/lib/approval-tokens';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing approval token' },
        { status: 400 }
      );
    }

    // Verify the token
    const verification = verifyApprovalToken(token);
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || 'Invalid token' },
        { status: 400 }
      );
    }

    const { expenseId, action, email } = verification;

    // Verify the email is in the approver list
    const approverEmails = getApproverEmails();
    if (!approverEmails.includes(email!)) {
      return NextResponse.json(
        { error: 'Email not authorized for expense approval' },
        { status: 403 }
      );
    }

    // Find the expense
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        createdBy: {
          select: { name: true, email: true },
        },
      },
    });

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Check if expense is still pending approval
    if (!expense.approvalStatus?.startsWith('pending_')) {
      return NextResponse.json(
        { error: 'Expense is no longer pending approval' },
        { status: 400 }
      );
    }

    // Perform the approval action
    if (action === 'reject') {
      await prisma.expense.update({
        where: { id: expenseId },
        data: {
          approvalStatus: 'rejected',
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Expense rejected successfully',
        expense: {
          id: expense.id,
          description: expense.description,
          amount: Number(expense.amount),
          createdBy: expense.createdBy.name,
          status: 'rejected',
        },
      });
    } else if (action === 'approve') {
      // Determine approval logic based on current status
      let updateData: any = {
        updatedAt: new Date(),
      };

      if (expense.approvalStatus === 'pending_single') {
        // Single approval required - approve directly
        updateData.approvalStatus = 'approved';
        updateData.approvedAt = new Date();
        // Note: we don't have a user ID for email approvers, so we'll store the email instead
        updateData.notes = expense.notes
          ? `${expense.notes}\n\nApproved via email by ${email}`
          : `Approved via email by ${email}`;
      } else if (expense.approvalStatus === 'pending_dual') {
        // Dual approval required
        if (!expense.approvedById) {
          // First approval
          updateData.approvedAt = new Date();
          updateData.notes = expense.notes
            ? `${expense.notes}\n\nFirst approval via email by ${email}`
            : `First approval via email by ${email}`;
          // Status remains pending_dual until second approval
        } else {
          // Second approval - complete the process
          updateData.approvalStatus = 'approved';
          updateData.notes = expense.notes
            ? `${expense.notes}\n\nSecond approval via email by ${email}`
            : `Second approval via email by ${email}`;
        }
      }

      await prisma.expense.update({
        where: { id: expenseId },
        data: updateData,
      });

      const newStatus = updateData.approvalStatus || expense.approvalStatus;

      return NextResponse.json({
        success: true,
        message: newStatus === 'approved'
          ? 'Expense approved successfully'
          : 'First approval recorded. Awaiting second approval.',
        expense: {
          id: expense.id,
          description: expense.description,
          amount: Number(expense.amount),
          createdBy: expense.createdBy.name,
          status: newStatus,
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[approve-expense] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}