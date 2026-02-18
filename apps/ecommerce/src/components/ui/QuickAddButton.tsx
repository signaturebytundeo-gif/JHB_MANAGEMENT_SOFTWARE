'use client'

import { useCartStore } from '@/lib/cart-store'

interface QuickAddButtonProps {
  productId: string
  productName: string
  productPrice: number
  productImage: string
  productSize: string
}

export default function QuickAddButton({
  productId,
  productName,
  productPrice,
  productImage,
  productSize,
}: QuickAddButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    // Add to cart and open drawer
    useCartStore.getState().addItem({
      id: productId,
      name: productName,
      price: productPrice,
      image: productImage,
      size: productSize,
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
