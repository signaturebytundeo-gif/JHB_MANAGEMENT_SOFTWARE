'use client'

import Image from 'next/image'
import { CartItem as CartItemType, useCartStore } from '@/lib/cart-store'
import { formatPrice } from '@/lib/utils'

// 25% discount on 2oz retail price ($6.99) = $5.24 for additional units
const ADDITIONAL_2OZ_PRICE = 524

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

  // For free sample items: 1st unit is free, additional units are $5.24 each
  const isFreeSample = item.isFreeSample === true
  const additionalQty = isFreeSample ? Math.max(0, item.quantity - 1) : 0
  const lineTotal = isFreeSample
    ? additionalQty * ADDITIONAL_2OZ_PRICE
    : item.price * item.quantity

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
        <div className="flex items-center gap-1.5 flex-wrap">
          <h3 className="text-white font-semibold text-sm truncate">
            {item.name}
          </h3>
          {item.isBundle && (
            <span className="text-xs bg-brand-gold/20 text-brand-gold px-1.5 py-0.5 rounded flex-shrink-0">
              Bundle
            </span>
          )}
          {isFreeSample && (
            <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded flex-shrink-0">
              FREE
            </span>
          )}
        </div>
        <p className="text-gray-400 text-xs mt-1">{item.size}</p>

        {/* Pricing for free sample with tiered display */}
        {isFreeSample ? (
          <div className="mt-1 space-y-0.5">
            <p className="text-green-400 text-sm">1× FREE</p>
            {additionalQty > 0 && (
              <p className="text-brand-gold text-xs">
                +{additionalQty}× {formatPrice(ADDITIONAL_2OZ_PRICE)} each (25% off)
              </p>
            )}
          </div>
        ) : (
          <p className="text-brand-gold text-sm mt-1">
            {formatPrice(item.price)}
          </p>
        )}

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
        {formatPrice(lineTotal)}
      </div>
    </div>
  )
}
