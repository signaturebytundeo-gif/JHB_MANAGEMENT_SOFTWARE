import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

interface CheckoutItem {
  id: string
  name: string
  price: number
  quantity: number
  image: string
  size: string
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

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map((item) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${item.name} (${item.size})`,
            // Only include absolute URLs for images — relative paths won't work in Stripe
            images: item.image.startsWith('http') ? [item.image] : [],
          },
          unit_amount: item.price, // Already in cents — do NOT multiply by 100
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/shop`,
      metadata: {
        source: 'jamaica-house-brand-web',
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
