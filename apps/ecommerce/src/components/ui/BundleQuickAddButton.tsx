'use client'

import { useCartStore } from '@/lib/cart-store'

interface BundleQuickAddButtonProps {
  bundleId: string
  bundleName: string
  bundlePrice: number
  bundleImage: string
  bundleSize: string
}

export default function BundleQuickAddButton({
  bundleId,
  bundleName,
  bundlePrice,
  bundleImage,
  bundleSize,
}: BundleQuickAddButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    useCartStore.getState().addItem({
      id: bundleId,
      name: bundleName,
      price: bundlePrice,
      image: bundleImage,
      size: bundleSize,
      isBundle: true,
    })
    useCartStore.getState().openCart()
  }

  return (
    <button
      onClick={handleClick}
      className="w-full bg-brand-gold text-brand-dark font-semibold py-2 rounded-md hover:bg-brand-gold-light transition-colors mt-3"
    >
      Add to Cart
    </button>
  )
}
