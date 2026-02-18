'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/lib/cart-store'

export default function ClearCartOnSuccess() {
  useEffect(() => {
    // Clear cart only after reaching success page with confirmed payment
    useCartStore.getState().clearCart()
  }, [])

  return null // No visible UI
}
