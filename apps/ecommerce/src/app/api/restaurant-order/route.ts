import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

let resend: Resend | null = null

function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set')
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

const FROM_ADDRESS = 'Jamaica House Brand <hello@jamaicahousebrand.com>'
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'info@jamaicahousebrand.com'

interface OrderPayload {
  businessName: string
  contactName: string
  phone: string
  email: string
  deliveryAddress: string
  requestedDate: string
  qtyGallon: number
  qtyCase: number
  paymentMethod: string
  notes: string
}

export async function POST(request: NextRequest) {
  try {
    const body: OrderPayload = await request.json()

    // Validate required fields
    if (!body.businessName?.trim()) {
      return NextResponse.json({ error: 'Business name is required.' }, { status: 400 })
    }
    if (!body.contactName?.trim()) {
      return NextResponse.json({ error: 'Contact name is required.' }, { status: 400 })
    }
    if (!body.phone?.trim()) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 })
    }
    if (!body.email?.trim()) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    const gallonTotal = (body.qtyGallon || 0) * 50
    const caseTotal = (body.qtyCase || 0) * 60
    const subtotal = gallonTotal + caseTotal
    const orderTotal = subtotal

    if (orderTotal === 0) {
      return NextResponse.json({ error: 'Please add at least one product to your order.' }, { status: 400 })
    }

    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      dateStyle: 'full',
      timeStyle: 'short',
    })

    const firstName = body.contactName.trim().split(' ')[0]

    // Format product rows for emails
    const productRows: string[] = []
    if (body.qtyGallon > 0) {
      productRows.push(`Jerk Sauce · 1 Gallon ($50 ea)    ×${body.qtyGallon}    $${gallonTotal.toFixed(2)}`)
    }
    if (body.qtyCase > 0) {
      productRows.push(`Jerk Sauce · 5oz Case ($60 ea)    ×${body.qtyCase}    $${caseTotal.toFixed(2)}`)
    }

    // ── Email to JHB team ──────────────────────────────────────────
    const internalEmail = `
JAMAICA HOUSE BRAND — NEW RESTAURANT PARTNER REQUEST
=====================================================

CONTACT INFO
Business: ${body.businessName}
Contact:  ${body.contactName}
Phone:    ${body.phone}
Email:    ${body.email}
Address:  ${body.deliveryAddress || 'Not provided'}
Delivery: ${body.requestedDate || 'Not specified'}

ORDER DETAILS
─────────────────────────────────────────
Product                              Qty    Total
${body.qtyGallon > 0 ? `Jerk Sauce · 1 Gallon ($50 ea)       ${body.qtyGallon}      $${gallonTotal.toFixed(2)}` : ''}
${body.qtyCase > 0 ? `Jerk Sauce · 5oz Case ($60 ea)        ${body.qtyCase}      $${caseTotal.toFixed(2)}` : ''}
─────────────────────────────────────────
Subtotal:                                    $${subtotal.toFixed(2)}
ORDER TOTAL:                                 $${orderTotal.toFixed(2)}

Payment Method: ${body.paymentMethod || 'Not specified'}

Notes: ${body.notes || 'None'}

─────────────────────────────────────────
Submitted: ${timestamp}
Source: jamaicahousebrand.com/restaurant-partners
`.trim()

    // ── Confirmation email to customer ─────────────────────────────
    const customerEmail = `
Hi ${firstName},

Thanks for reaching out to Jamaica House Brand! We've received your order request and will be in touch within 1 business day to confirm your order and arrange delivery.

YOUR ORDER SUMMARY
──────────────────
${productRows.join('\n')}

Order Total: $${orderTotal.toFixed(2)}
Payment Method: ${body.paymentMethod || 'Not specified'}

Questions? Call us at 786-709-1027 or reply to this email.

— The Jamaica House Brand Team
From Our Family to Yours 🇯🇲
jamaicahousebrand.com
`.trim()

    try {
      const client = getResend()

      // Send to JHB team
      await client.emails.send({
        from: FROM_ADDRESS,
        to: [NOTIFICATION_EMAIL],
        replyTo: body.email,
        subject: `🌶️ New Restaurant Order Request — ${body.businessName}`,
        text: internalEmail,
      })

      // Send confirmation to customer
      await client.emails.send({
        from: FROM_ADDRESS,
        to: [body.email],
        subject: `We received your order request, ${firstName}! 🌶️`,
        text: customerEmail,
      })
    } catch (emailError) {
      console.error('[restaurant-order] Email send failed:', emailError)
      // Log but don't fail — the order request was received
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[restaurant-order] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process order request. Please try again.' },
      { status: 500 }
    )
  }
}
