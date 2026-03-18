import React from 'react'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { WelcomeEmail } from '@/lib/email-templates/WelcomeEmail'

// ============================================================================
// sendWelcomeEmail — Resend-powered welcome email with WELCOME10 code
// ============================================================================
// Dev fallback: if RESEND_API_KEY is not set, logs to console and returns
// { success: true } so the subscribe flow works in local development.
// ============================================================================

let resend: Resend | null = null

function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set.')
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

const FROM_ADDRESS = 'Jamaica House Brand <hello@jamaicahousebrand.com>'
const DISCOUNT_CODE = 'WELCOME10'

export async function sendWelcomeEmail(
  email: string
): Promise<{ success: boolean; error?: string }> {
  // Dev fallback — no API key configured
  if (!process.env.RESEND_API_KEY) {
    console.log('──────────────────────────────────────────────────')
    console.log('WELCOME EMAIL (Development Mode — no RESEND_API_KEY)')
    console.log('──────────────────────────────────────────────────')
    console.log(`To: ${email}`)
    console.log(`From: ${FROM_ADDRESS}`)
    console.log(`Subject: Welcome! Here's 10% Off Your First Order`)
    console.log(`Discount code: ${DISCOUNT_CODE}`)
    console.log('──────────────────────────────────────────────────')
    return { success: true }
  }

  const emailHtml = await render(
    React.createElement(WelcomeEmail, { discountCode: DISCOUNT_CODE })
  )

  try {
    await getResendClient().emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: "Welcome! Here's 10% Off Your First Order",
      html: emailHtml,
    })
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[sendWelcomeEmail] Failed to send:', message)
    return { success: false, error: message }
  }
}
