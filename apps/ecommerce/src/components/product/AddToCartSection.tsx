'use client'

import { useState } from 'react'
import { Product } from '@/types/product'
import { useCartStore } from '@/lib/cart-store'
import QuantitySelector from './QuantitySelector'

interface AddToCartSectionProps {
  product: Product
}

export default function AddToCartSection({ product }: AddToCartSectionProps) {
  const [quantity, setQuantity] = useState(1)

  const handleAddToCart = () => {
    useCartStore.getState().addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        size: product.size,
      },
      quantity
    )
    useCartStore.getState().openCart()
  }

  return (
    <div className="mt-8 space-y-4">
      <QuantitySelector onChange={setQuantity} />
      <button
        type="button"
        onClick={handleAddToCart}
        className="w-full bg-brand-gold text-brand-dark font-bold text-lg py-4 rounded-lg hover:bg-brand-gold-light transition-colors"
      >
        Add to Cart
      </button>
    </div>
  )
}
