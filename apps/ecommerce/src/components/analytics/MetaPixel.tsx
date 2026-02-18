'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void
    _fbq: (...args: unknown[]) => void
  }
}

export default function MetaPixel() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID

  useEffect(() => {
    if (!pixelId) return
    if (typeof window.fbq === 'function') return // Already initialized

    // Standard Meta Pixel initialization snippet
    const f: any = window
    const b = document
    const e = 'script'
    const v = 'https://connect.facebook.net/en_US/fbevents.js'

    if (f.fbq) return
    const n: any = f.fbq = function() {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
    }
    if (!f._fbq) f._fbq = n
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []
    const t = b.createElement(e) as HTMLScriptElement
    t.async = true
    t.src = v
    const s = b.getElementsByTagName(e)[0]
    s?.parentNode?.insertBefore(t, s)

    f.fbq('init', pixelId)
    f.fbq('track', 'PageView')
  }, [pixelId])

  // Track page views on route changes
  useEffect(() => {
    if (!pixelId || typeof window.fbq !== 'function') return
    window.fbq('track', 'PageView')
  }, [pathname, searchParams, pixelId])

  if (!pixelId) return null

  // noscript fallback for users with JS disabled
  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: 'none' }}
        src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  )
}
