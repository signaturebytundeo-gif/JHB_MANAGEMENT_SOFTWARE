import { Metadata } from 'next'
import Link from 'next/link'
import { stripe } from '@/lib/stripe'
import { formatPrice } from '@/lib/utils'
import ClearCartOnSuccess from '@/components/ClearCartOnSuccess'
import TrackPurchase from '@/components/analytics/TrackPurchase'

export const metadata: Metadata = {
  title: 'Order Confirmed',
  description: 'Your Jamaica House Brand order has been confirmed. Thank you for your purchase!',
  robots: { index: false, follow: false },
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const params = await searchParams
  const sessionId = params.session_id

  // No session ID provided
  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="text-6xl">❌</div>
          <h1 className="text-3xl font-bold text-white">No Order Found</h1>
          <p className="text-gray-400">
            We couldn't find your order. Please check your email for confirmation or contact support.
          </p>
          <Link
            href="/shop"
            className="inline-block bg-brand-gold text-brand-dark font-bold px-8 py-4 rounded-lg hover:bg-brand-gold-light transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  // Retrieve Stripe session
  let session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    })
  } catch (error) {
    console.error('Failed to retrieve session:', error)
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="text-6xl">⚠️</div>
          <h1 className="text-3xl font-bold text-white">Session Not Found</h1>
          <p className="text-gray-400">
            We couldn't retrieve your order details. Please check your email for confirmation.
          </p>
          <Link
            href="/shop"
            className="inline-block bg-brand-gold text-brand-dark font-bold px-8 py-4 rounded-lg hover:bg-brand-gold-light transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  // Payment not completed
  if (session.status !== 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="text-6xl">⏳</div>
          <h1 className="text-3xl font-bold text-white">Payment Not Completed</h1>
          <p className="text-gray-400">
            Your payment has not been completed yet. Please try again or contact support.
          </p>
          <Link
            href="/shop"
            className="inline-block bg-brand-gold text-brand-dark font-bold px-8 py-4 rounded-lg hover:bg-brand-gold-light transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  // Payment successful — show order confirmation
  const lineItems = session.line_items?.data || []
  const customerEmail = session.customer_details?.email

  return (
    <>
      <ClearCartOnSuccess />
      <TrackPurchase value={session.amount_total ?? 0} orderId={session.id} />
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full space-y-8">
          {/* Success checkmark */}
          <div className="flex justify-center">
            <svg
              className="w-24 h-24 text-brand-gold"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Heading */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-white">Order Confirmed!</h1>
            <p className="text-gray-400">Thank you for your purchase</p>
            {customerEmail && (
              <p className="text-sm text-gray-500">
                A confirmation will be sent to {customerEmail}
              </p>
            )}
          </div>

          {/* Order summary */}
          <div className="bg-brand-dark-lighter rounded-lg p-6 space-y-4 border border-brand-gold/20">
            <h2 className="text-xl font-bold text-white">Order Summary</h2>
            <div className="space-y-3">
              {lineItems.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between text-gray-300"
                >
                  <span>
                    {item.description} × {item.quantity}
                  </span>
                  <span>{formatPrice(item.amount_total)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-brand-gold/20 pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span className="text-white">Total</span>
                <span className="text-brand-gold">
                  {formatPrice(session.amount_total ?? 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Continue shopping button */}
          <div className="text-center">
            <Link
              href="/shop"
              className="inline-block bg-brand-gold text-brand-dark font-bold px-8 py-4 rounded-lg hover:bg-brand-gold-light transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
