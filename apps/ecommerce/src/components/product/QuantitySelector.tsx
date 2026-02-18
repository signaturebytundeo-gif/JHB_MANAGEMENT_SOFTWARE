'use client'

import { useState } from 'react'

interface QuantitySelectorProps {
  min?: number
  max?: number
  onChange?: (quantity: number) => void
}

export default function QuantitySelector({
  min = 1,
  max = 10,
  onChange,
}: QuantitySelectorProps) {
  const [quantity, setQuantity] = useState(min)

  const handleChange = (newQuantity: number) => {
    // Clamp between min and max
    const clampedQuantity = Math.max(min, Math.min(max, newQuantity))
    setQuantity(clampedQuantity)
    onChange?.(clampedQuantity)
  }

  const handleIncrement = () => {
    handleChange(quantity + 1)
  }

  const handleDecrement = () => {
    handleChange(quantity - 1)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value)) {
      handleChange(value)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* Decrement Button */}
      <button
        type="button"
        onClick={handleDecrement}
        disabled={quantity <= min}
        className="w-11 h-11 flex items-center justify-center bg-white/5 border border-brand-gold/30 text-white rounded-lg hover:bg-brand-gold/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Decrease quantity"
      >
        <span className="text-xl leading-none">−</span>
      </button>

      {/* Quantity Input */}
      <input
        type="number"
        value={quantity}
        onChange={handleInputChange}
        min={min}
        max={max}
        className="w-16 h-11 text-center bg-white/5 border border-brand-gold/30 text-white rounded-lg font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        aria-label="Quantity"
      />

      {/* Increment Button */}
      <button
        type="button"
        onClick={handleIncrement}
        disabled={quantity >= max}
        className="w-11 h-11 flex items-center justify-center bg-white/5 border border-brand-gold/30 text-white rounded-lg hover:bg-brand-gold/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Increase quantity"
      >
        <span className="text-xl leading-none">+</span>
      </button>
    </div>
  )
}
