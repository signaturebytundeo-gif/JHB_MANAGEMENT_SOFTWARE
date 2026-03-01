import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'
import { handleOrderComplete, type OrderItem } from '@/lib/order-handler'

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
