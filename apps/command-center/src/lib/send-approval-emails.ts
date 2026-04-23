import { Resend } from 'resend';
import { generateApprovalToken, getApproverEmails } from './approval-tokens';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

type ExpenseForApproval = {
  id: string;
  description: string;
  amount: number;
  category: string;
  expenseDate: Date;
  vendorName: string | null;
  createdBy: {
    name: string;
    email: string;
  };
};

/**
 * Send approval emails for a pending expense
 */
export async function sendApprovalEmails(expense: ExpenseForApproval): Promise<void> {
  try {
    const approverEmails = getApproverEmails();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Generate email content
    const subject = `Expense Approval Required: $${expense.amount} - ${expense.description}`;

    // Send email to each approver
    const emailPromises = approverEmails.map(async (email) => {
      const approveToken = generateApprovalToken(expense.id, 'approve', email);
      const rejectToken = generateApprovalToken(expense.id, 'reject', email);

      const approveUrl = `${baseUrl}/api/approve-expense?token=${approveToken}`;
      const rejectUrl = `${baseUrl}/api/approve-expense?token=${rejectToken}`;

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Expense Approval Required</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #16A085; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .expense-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .button { display: inline-block; padding: 12px 24px; margin: 10px 10px 10px 0; border-radius: 6px; text-decoration: none; font-weight: bold; text-align: center; }
        .approve { background: #27AE60; color: white; }
        .reject { background: #E74C3C; color: white; }
        .footer { background: #34495E; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 8px 0; border-bottom: 1px solid #eee; }
        .label { font-weight: bold; width: 30%; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">Jamaica House Brand - Expense Approval</h1>
        </div>

        <div class="content">
            <h2>New Expense Requires Your Approval</h2>

            <div class="expense-details">
                <table>
                    <tr>
                        <td class="label">Description:</td>
                        <td>${expense.description}</td>
                    </tr>
                    <tr>
                        <td class="label">Amount:</td>
                        <td><strong>$${expense.amount.toFixed(2)}</strong></td>
                    </tr>
                    <tr>
                        <td class="label">Category:</td>
                        <td>${expense.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                    </tr>
                    <tr>
                        <td class="label">Vendor:</td>
                        <td>${expense.vendorName || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td class="label">Date:</td>
                        <td>${expense.expenseDate.toLocaleDateString()}</td>
                    </tr>
                    <tr>
                        <td class="label">Submitted by:</td>
                        <td>${expense.createdBy.name} (${expense.createdBy.email})</td>
                    </tr>
                </table>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <p><strong>Choose your action:</strong></p>
                <a href="${approveUrl}" class="button approve">✓ APPROVE</a>
                <a href="${rejectUrl}" class="button reject">✗ REJECT</a>
            </div>

            <p style="margin-top: 30px; font-size: 14px; color: #666;">
                <strong>Note:</strong> These links will expire in 24 hours for security purposes.
                If you need to review this expense later, please log into the Jamaica House Brand Command Center.
            </p>
        </div>

        <div class="footer">
            <p>Jamaica House Brand Command Center | Expense Management System</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>`;

      const emailText = `
Jamaica House Brand - Expense Approval Required

New Expense Details:
- Description: ${expense.description}
- Amount: $${expense.amount.toFixed(2)}
- Category: ${expense.category}
- Vendor: ${expense.vendorName || 'N/A'}
- Date: ${expense.expenseDate.toLocaleDateString()}
- Submitted by: ${expense.createdBy.name} (${expense.createdBy.email})

To approve this expense, click: ${approveUrl}
To reject this expense, click: ${rejectUrl}

Note: These links will expire in 24 hours for security purposes.
`;

      return resend.emails.send({
        from: 'JHB Command Center <noreply@jamaicahousebrand.com>',
        to: [email],
        subject,
        html: emailHtml,
        text: emailText,
      });
    });

    await Promise.all(emailPromises);
    console.log(`[send-approval-emails] Approval emails sent for expense ${expense.id} to ${approverEmails.length} approvers`);
  } catch (error) {
    console.error('[send-approval-emails] Failed to send approval emails:', error);
    throw error;
  }
}