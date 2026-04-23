import crypto from 'crypto';

// Get secret from environment
const getApprovalSecret = () => {
  const secret = process.env.EXPENSE_APPROVAL_SECRET;
  if (!secret) {
    throw new Error('EXPENSE_APPROVAL_SECRET environment variable is not set');
  }
  return secret;
};

/**
 * Generate HMAC token for expense approval
 */
export function generateApprovalToken(expenseId: string, action: 'approve' | 'reject', email: string): string {
  const secret = getApprovalSecret();
  const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp
  const data = `${expenseId}:${action}:${email}:${timestamp}`;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  const signature = hmac.digest('hex');

  // Return token as base64-encoded JSON
  const tokenData = {
    expenseId,
    action,
    email,
    timestamp,
    signature,
  };

  return Buffer.from(JSON.stringify(tokenData)).toString('base64');
}

/**
 * Verify HMAC token for expense approval
 */
export function verifyApprovalToken(token: string): {
  valid: boolean;
  expenseId?: string;
  action?: 'approve' | 'reject';
  email?: string;
  error?: string;
} {
  try {
    // Decode base64 token
    const tokenJson = Buffer.from(token, 'base64').toString('utf-8');
    const tokenData = JSON.parse(tokenJson);

    const { expenseId, action, email, timestamp, signature } = tokenData;

    // Check required fields
    if (!expenseId || !action || !email || !timestamp || !signature) {
      return { valid: false, error: 'Invalid token format' };
    }

    // Check token age (24 hours = 86400 seconds)
    const now = Math.floor(Date.now() / 1000);
    if (now - timestamp > 86400) {
      return { valid: false, error: 'Token expired' };
    }

    // Verify signature
    const secret = getApprovalSecret();
    const data = `${expenseId}:${action}:${email}:${timestamp}`;

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(data);
    const expectedSignature = hmac.digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' };
    }

    return {
      valid: true,
      expenseId,
      action,
      email,
    };
  } catch (error) {
    return { valid: false, error: 'Token parse error' };
  }
}

/**
 * Get list of expense approver emails from environment
 */
export function getApproverEmails(): string[] {
  const emails = process.env.EXPENSE_APPROVERS_EMAILS;
  if (!emails) {
    throw new Error('EXPENSE_APPROVERS_EMAILS environment variable is not set');
  }
  return emails.split(',').map(email => email.trim()).filter(Boolean);
}