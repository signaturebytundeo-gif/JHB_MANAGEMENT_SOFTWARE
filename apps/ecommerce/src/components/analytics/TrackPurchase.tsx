'use client'

import { useEffect, useRef } from 'react'

export default function TrackPurchase({
  value,
  currency = 'USD',
  orderId,
}: {
  value: number
  currency?: string
  orderId?: string
}) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true

    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'Purchase', {
        value: value / 100, // Convert cents to dollars
        currency,
        ...(orderId && { content_ids: [orderId] }),
      })
    }
  }, [value, currency, orderId])

  return null
}
