import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/emails/send-welcome'
import { syncCustomerToMailchimp } from '@/lib/mailchimp-sync'

// ============================================================================
// POST /api/subscribe — email capture + welcome email
// ============================================================================
// Validates email, deduplicates within server lifecycle, sends welcome email
// via Resend, and syncs subscriber to Mailchimp audience.
//
// Server-side dedup: module-level Set persists for the duration of the server
// process. Client-side also prevents re-submission via localStorage.
// ============================================================================

const subscribedEmails = new Set<string>()

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rawEmail: unknown = body?.email

    // Validate presence
    if (!rawEmail || typeof rawEmail !== 'string' || rawEmail.trim() === '') {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    // Normalize
    const email = rawEmail.toLowerCase().trim()

    // Validate format
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Server-side dedup — no duplicate send within server lifecycle
    if (subscribedEmails.has(email)) {
      return NextResponse.json(
        { success: true, message: 'Already subscribed' },
        { status: 200 }
      )
    }

    // Mark email as subscribed before sending to prevent race conditions
    subscribedEmails.add(email)

    // Send welcome email via Resend
    const result = await sendWelcomeEmail(email)

    if (!result.success) {
      // Remove from Set so a retry is possible
      subscribedEmails.delete(email)
      return NextResponse.json(
        { error: 'Failed to send welcome email' },
        { status: 500 }
      )
    }

    // Sync to Mailchimp — failure must not block the subscribe response
    try {
      await syncCustomerToMailchimp({
        email,
        firstName: '',
        lastName: '',
        tags: ['jhb-subscriber', 'email-capture'],
      })
    } catch (mailchimpError) {
      console.warn('[subscribe] Mailchimp sync failed (non-blocking):', mailchimpError)
    }

    return NextResponse.json(
      { success: true, message: 'Welcome email sent!' },
      { status: 200 }
    )
  } catch (error) {
    console.error('[subscribe] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
