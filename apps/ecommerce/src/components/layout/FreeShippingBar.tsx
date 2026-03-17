'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/lib/cart-store'
import { formatPrice } from '@/lib/utils'

const FREE_SHIPPING_THRESHOLD = 5000 // $50.00 in cents

export default function FreeShippingBar() {
  const items = useCartStore((state) => state.items)

  // Rehydrate from localStorage after SSR — same pattern as CartDrawer
  useEffect(() => {
    useCartStore.persist.rehydrate()
  }, [])

  // Exclude free samples from total — matches checkout route logic
  const subtotal = items.reduce(
    (sum, item) => sum + (item.isFreeSample ? 0 : item.price * item.quantity),
    0
  )

  const remaining = FREE_SHIPPING_THRESHOLD - subtotal
  const progress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100)
  const qualifies = subtotal >= FREE_SHIPPING_THRESHOLD
  const hasItems = subtotal > 0

  return (
    <div className="w-full bg-brand-dark border-b border-brand-gold/20 py-1.5 px-4">
      <div className="max-w-7xl mx-auto">
        {!hasItems && (
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-300">
            {/* Truck icon */}
            <svg
              className="w-4 h-4 text-brand-gold flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M1.5 8.25h13.5m0 0V5.25a.75.75 0 00-.75-.75H2.25a.75.75 0 00-.75.75v9a.75.75 0 00.75.75h.75m11.25-6.75h2.25a.75.75 0 01.6.3l2.4 3.2a.75.75 0 01.15.45v2.55a.75.75 0 01-.75.75h-.75m-6-6.75v6.75m0 0H6.75m6.75 0h3.75m-15 0h.75a1.5 1.5 0 001.5-1.5V14.25m0 0a1.5 1.5 0 011.5-1.5h.75M6.75 18a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm10.5 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
              />
            </svg>
            <span>
              Free shipping on orders{' '}
              <span className="text-brand-gold font-semibold">$50+</span>
            </span>
          </div>
        )}

        {hasItems && !qualifies && (
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs sm:text-sm text-gray-300 text-center">
              Add{' '}
              <span className="text-brand-gold font-semibold">
                {formatPrice(remaining)}
              </span>{' '}
              more for{' '}
              <span className="text-brand-gold font-semibold">FREE shipping!</span>
            </p>
            {/* Progress bar */}
            <div className="w-full max-w-xs sm:max-w-sm h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-gold rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Free shipping progress"
              />
            </div>
          </div>
        )}

        {qualifies && (
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-brand-gold font-semibold">
            {/* Checkmark icon */}
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
            <span>You qualify for FREE shipping!</span>
          </div>
        )}
      </div>
    </div>
  )
}
