'use client'

import Image from 'next/image'
import { CartItem as CartItemType, useCartStore } from '@/lib/cart-store'
import { formatPrice } from '@/lib/utils'

interface CartItemProps {
  item: CartItemType
}

export default function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore()

  const handleDecrement = () => {
    updateQuantity(item.id, item.quantity - 1)
  }

  const handleIncrement = () => {
    updateQuantity(item.id, item.quantity + 1)
  }

  const handleRemove = () => {
    removeItem(item.id)
  }

  return (
    <div className="flex gap-4 py-4 border-b border-brand-gold/10">
      {/* Product Image */}
      <div className="relative w-20 h-20 flex-shrink-0 rounded overflow-hidden">
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="80px"
          className="object-cover"
        />
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-semibold text-sm truncate">
          {item.name}
        </h3>
        <p className="text-gray-400 text-xs mt-1">{item.size}</p>
        <p className="text-brand-gold text-sm mt-1">
          {formatPrice(item.price)}
        </p>

        {/* Quantity Controls */}
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={handleDecrement}
            className="w-8 h-8 flex items-center justify-center bg-white/5 border border-brand-gold/30 text-white rounded hover:bg-brand-gold/10 transition-colors"
            aria-label="Decrease quantity"
          >
            <span className="text-lg leading-none">−</span>
          </button>

          <span className="w-8 text-center text-white font-semibold text-sm">
            {item.quantity}
          </span>

          <button
            type="button"
            onClick={handleIncrement}
            className="w-8 h-8 flex items-center justify-center bg-white/5 border border-brand-gold/30 text-white rounded hover:bg-brand-gold/10 transition-colors"
            aria-label="Increase quantity"
          >
            <span className="text-lg leading-none">+</span>
          </button>

          <button
            type="button"
            onClick={handleRemove}
            className="ml-auto text-gray-400 hover:text-white text-xs transition-colors"
            aria-label={`Remove ${item.name} from cart`}
          >
            Remove
          </button>
        </div>
      </div>

      {/* Line Total */}
      <div className="text-white font-semibold text-sm">
        {formatPrice(item.price * item.quantity)}
      </div>
    </div>
  )
}
