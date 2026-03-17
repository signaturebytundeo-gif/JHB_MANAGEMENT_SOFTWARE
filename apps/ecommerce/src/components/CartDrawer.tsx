'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { useCartStore } from '@/lib/cart-store'
import { formatPrice } from '@/lib/utils'
import { calculateBundleDiscount, BUNDLE_MIN_ITEMS, BUNDLE_DISCOUNT_PERCENT } from '@/lib/bundle-discount'
import CartItem from './CartItem'

export default function CartDrawer() {
  const { items, isOpen, closeCart } = useCartStore()
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  // Rehydrate from localStorage after SSR
  useEffect(() => {
    useCartStore.persist.rehydrate()
  }, [])

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  // Exclude free samples from shipping calculation — matches checkout route logic
  const paidItemsTotal = items.reduce(
    (sum, item) => sum + (item.isFreeSample ? 0 : item.price * item.quantity),
    0
  )
  const hasFreeSampleOnly = items.length > 0 && paidItemsTotal === 0
  const freeShippingThreshold = 5000 // $50.00 in cents

  // Build-your-own bundle discount
  const bundleDiscount = calculateBundleDiscount(items)
  const { discountAmount, eligibleItemCount, discountPercent } = bundleDiscount
  const discountedTotal = subtotal - discountAmount

  async function handleCheckout() {
    setIsCheckingOut(true)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, bundleDiscount: discountAmount }),
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('No checkout URL returned')
        setIsCheckingOut(false)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      setIsCheckingOut(false)
    }
  }

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={closeCart} className="relative z-50">
        {/* Backdrop */}
        <TransitionChild
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70" />
        </TransitionChild>

        {/* Drawer Panel */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full">
              <TransitionChild
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in duration-200"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <DialogPanel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-brand-dark shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-brand-gold/20">
                      <DialogTitle className="text-xl font-bold text-white">
                        Your Cart
                      </DialogTitle>
                      <button
                        type="button"
                        onClick={closeCart}
                        className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-white transition-colors rounded-lg"
                        aria-label="Close cart"
                      >
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-6">
                      {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                          <p className="text-gray-400 text-lg mb-4">
                            Your cart is empty
                          </p>
                          <Link
                            href="/shop"
                            onClick={closeCart}
                            className="text-brand-gold hover:text-brand-gold-light underline transition-colors"
                          >
                            Continue Shopping
                          </Link>
                        </div>
                      ) : (
                        <div className="divide-y divide-brand-gold/10">
                          {items.map((item) => (
                            <CartItem key={item.id} item={item} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {items.length > 0 && (
                      <div className="border-t border-brand-gold/20 px-6 py-6 space-y-4">
                        <div className="flex justify-between text-lg">
                          <span className="text-gray-400">Subtotal</span>
                          <span className="text-white font-bold">
                            {formatPrice(subtotal)}
                          </span>
                        </div>

                        {/* Build Your Own Bundle discount */}
                        {discountAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-green-400">
                              Build Your Own Bundle (-{discountPercent}%)
                            </span>
                            <span className="text-green-400 font-semibold">
                              -{formatPrice(discountAmount)}
                            </span>
                          </div>
                        )}

                        {/* Discounted total (shown when discount is active) */}
                        {discountAmount > 0 && (
                          <div className="flex justify-between text-lg border-t border-brand-gold/10 pt-3">
                            <span className="text-white font-bold">Total</span>
                            <span className="text-white font-bold">
                              {formatPrice(discountedTotal)}
                            </span>
                          </div>
                        )}

                        {/* Bundle discount nudge (close but not yet qualifying) */}
                        {discountAmount === 0 && eligibleItemCount > 0 && eligibleItemCount < BUNDLE_MIN_ITEMS && (
                          <p className="text-xs text-brand-gold text-right">
                            Add {BUNDLE_MIN_ITEMS - eligibleItemCount} more item{BUNDLE_MIN_ITEMS - eligibleItemCount !== 1 ? 's' : ''} for a {BUNDLE_DISCOUNT_PERCENT}% bundle discount!
                          </p>
                        )}

                        {/* Shipping indicator */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Shipping</span>
                            {hasFreeSampleOnly ? (
                              <span className="text-gray-400">$5.99</span>
                            ) : paidItemsTotal >= freeShippingThreshold ? (
                              <span className="text-brand-gold font-semibold flex items-center gap-1">
                                <svg
                                  className="w-3.5 h-3.5"
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
                                FREE
                              </span>
                            ) : (
                              <span className="text-gray-400">$12.99</span>
                            )}
                          </div>
                          {paidItemsTotal > 0 && paidItemsTotal < freeShippingThreshold && (
                            <p className="text-xs text-brand-gold text-right">
                              Add {formatPrice(freeShippingThreshold - paidItemsTotal)} more for free shipping!
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleCheckout}
                          disabled={isCheckingOut || items.length === 0}
                          className="w-full bg-brand-gold text-brand-dark font-bold py-4 rounded-lg hover:bg-brand-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isCheckingOut ? 'Redirecting...' : 'Checkout'}
                        </button>
                      </div>
                    )}
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
