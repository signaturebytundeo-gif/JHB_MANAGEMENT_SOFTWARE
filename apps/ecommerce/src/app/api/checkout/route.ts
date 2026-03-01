import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

interface CheckoutItem {
  id: string
  name: string
  price: number
  quantity: number
  image: string
  size: string
  isFreeSample?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { items }: { items: CheckoutItem[] } = await request.json()

    // Validate items array is non-empty
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      )
    }

    const hasFreeSample = items.some((item) => item.isFreeSample)

    // Build line items
    const line_items = items.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.isFreeSample
            ? 'Free 2oz Jerk Sauce Sample'
            : `${item.name} (${item.size})`,
          // Only include absolute URLs for images — relative paths won't work in Stripe
          images: item.image.startsWith('http') ? [item.image] : [],
        },
        unit_amount: item.isFreeSample ? 0 : item.price, // Free sample has $0 price
      },
      quantity: item.quantity,
    }))

    // Add shipping line item
    // Free sample only: $5.99 | Regular orders under $50: $12.99 | Over $50: free
    const paidItemsTotal = items.reduce(
      (sum, item) => sum + (item.isFreeSample ? 0 : item.price * item.quantity),
      0
    )
    const hasPaidItems = paidItemsTotal > 0

    let shippingAmount = 0
    if (hasFreeSample && !hasPaidItems) {
      shippingAmount = 599 // $5.99 for free sample only
    } else if (paidItemsTotal < 5000) {
      shippingAmount = 1299 // $12.99 for orders under $50
    }
    // else: free shipping for orders $50+

    if (shippingAmount > 0) {
      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Shipping & Handling',
            images: [],
          },
          unit_amount: shippingAmount,
        },
        quantity: 1,
      })
    }

    // Serialize cart items into metadata for webhook order processing
    const itemsSummary = items.map((item) => ({
      name: item.isFreeSample ? 'Free 2oz Jerk Sauce Sample' : `${item.name} (${item.size})`,
      quantity: item.quantity,
      price: item.isFreeSample ? 0 : item.price,
    }))

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      phone_number_collection: { enabled: true },
      success_url: `${request.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/shop`,
      metadata: {
        source: 'jamaica-house-brand-web',
        hasFreeSample: hasFreeSample ? 'true' : 'false',
        items_json: JSON.stringify(itemsSummary),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
