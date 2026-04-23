import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/dal';

/**
 * Manual trigger for recurring expense processing.
 * This endpoint can be used for testing or manual execution.
 * In production, this should be called by a scheduled job (cron, Vercel Cron, etc.)
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

    // Call the recurring expense processing endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/process-recurring-expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.get('cookie') || '', // Forward session cookie
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: `Recurring expense processing completed. ${result.processed} expenses processed.`,
      details: result,
    });
  } catch (error) {
    console.error('[trigger-recurring] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to trigger recurring expense processing',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}