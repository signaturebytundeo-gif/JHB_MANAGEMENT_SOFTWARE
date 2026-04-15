import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getSupabase } from '@/lib/supabase'
import Stripe from 'stripe'
import { handleOrderComplete, type OrderItem } from '@/lib/order-handler'
import { Resend } from 'resend'

// Initialize Resend for sending follow-up emails
const resend = new Resend(process.env.RESEND_API_KEY!)

// Send follow-up email for saved promo codes
async function sendSavedPromoEmail(email: string, name: string, promoCode: string) {
  const firstName = name.split(' ')[0] || 'Valued Customer'

  await resend.emails.send({
    from: 'Jamaica House Brand <noreply@jamaicahousebrand.com>',
    to: email,
    subject: `Your promo code "${promoCode}" is saved for your next order! 🌶️`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d97706;">Thanks for your order, ${firstName}! 🎉</h2>

        <p>Your order qualified for <strong>FREE SHIPPING</strong> (orders $50+), so we've saved your promo code for your next Jamaica House Brand purchase:</p>

        <div style="background: #fef3c7; border: 2px solid #d97706; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <h3 style="margin: 0; color: #92400e;">Your Saved Promo Code</h3>
          <p style="font-size: 24px; font-weight: bold; color: #92400e; letter-spacing: 2px; margin: 10px 0;">${promoCode}</p>
          <p style="margin: 0; color: #92400e; font-size: 14px;">Save this for your next order!</p>
        </div>

        <p>This code will be automatically applied to your next qualifying order, or you can enter it manually at checkout.</p>

        <p>Keep enjoying that authentic Jamaican flavor! 🇯🇲</p>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          With love from the islands,<br>
          <strong>The Jamaica House Brand Family</strong>
        </p>
      </div>
    `
  })
}

export async function POST(request: NextRequest) {
  const body = await request.text() // CRITICAL: Use raw body text for signature verification
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  // Handle event types
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      // Log order details — source of truth for payment confirmation
      console.log('Order completed:', {
        sessionId: session.id,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        customerEmail: session.customer_details?.email,
      })

      // Parse cart items from metadata
      let items: OrderItem[] = []
      try {
        const itemsJson = session.metadata?.items_json
        if (itemsJson) {
          items = JSON.parse(itemsJson)
        }
      } catch {
        console.error('Failed to parse items_json from session metadata')
      }

      // Determine shipping cost from line items
      const shippingLineAmount = session.total_details?.amount_shipping ?? 0
      // Fallback: if no Stripe shipping, check for $5.99 shipping line in metadata
      const shippingCost = shippingLineAmount || (session.metadata?.hasFreeSample === 'true' ? 599 : 0)

      // Increment promo code usage count if one was used
      const usedPromoCode = session.metadata?.promoCode
      if (usedPromoCode) {
        try {
          const { data: promo } = await getSupabase()
            .from('promo_codes')
            .select('usage_count')
            .eq('code', usedPromoCode)
            .single()

          if (promo) {
            await getSupabase()
              .from('promo_codes')
              .update({ usage_count: promo.usage_count + 1 })
              .eq('code', usedPromoCode)
          }
        } catch (promoErr) {
          // Non-fatal — log but don't fail the webhook
          console.error('Failed to increment promo usage:', promoErr)
        }
      }

      // Handle saved promo code for next order
      const savedPromoForNextOrder = session.metadata?.savedPromoForNextOrder
      if (savedPromoForNextOrder && session.customer_details?.email) {
        try {
          // Send follow-up email with saved promo code
          await sendSavedPromoEmail(
            session.customer_details.email,
            session.customer_details.name || '',
            savedPromoForNextOrder
          )
          console.log(`Sent saved promo code email for "${savedPromoForNextOrder}" to ${session.customer_details.email}`)
        } catch (emailErr) {
          // Non-fatal — log but don't fail the webhook
          console.error('Failed to send saved promo email:', emailErr)
        }
      }

      // Trigger order processing (shipping calc + Mailchimp + Command Center)
      const customerName = session.customer_details?.name || ''
      try {
        const result = await handleOrderComplete({
          id: session.id,
          customerEmail: session.customer_details?.email || '',
          customerName,
          customerPhone: session.customer_details?.phone || '',
          items,
          shippingCost,
          total: session.amount_total || 0,
        })
        console.log('Order processing complete:', {
          orderId: result.orderId,
          commandCenter: result.commandCenter,
          mailchimp: result.mailchimpSync?.success ?? false,
        })
      } catch (err) {
        // Log but don't fail the webhook — payment already succeeded
        console.error('Order processing error (non-fatal):', err)
      }

      break
    }
    default:
      // Log unhandled event types (informational, not an error)
      console.log(`Unhandled event type: ${event.type}`)
  }

  // Return 200 immediately — Stripe requires fast response
  return NextResponse.json({ received: true })
}
