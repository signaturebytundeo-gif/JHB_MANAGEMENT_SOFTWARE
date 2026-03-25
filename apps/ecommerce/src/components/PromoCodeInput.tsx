'use client'

import { useState } from 'react'
import { formatPrice } from '@/lib/utils'

interface PromoResult {
  code: string
  discount_type: string
  discount_value: number
}

interface PromoCodeInputProps {
  onApply: (promo: PromoResult) => void
  onRemove: () => void
  appliedPromo: PromoResult | null
}

export default function PromoCodeInput({
  onApply,
  onRemove,
  appliedPromo,
}: PromoCodeInputProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleApply() {
    const trimmed = code.trim()
    if (!trimmed) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      })
      const data = await res.json()

      if (data.valid) {
        onApply({
          code: trimmed.toUpperCase(),
          discount_type: data.discount_type,
          discount_value: data.discount_value,
        })
        setCode('')
        setError('')
      } else {
        setError(data.message || 'Invalid promo code.')
      }
    } catch {
      setError('Failed to validate code. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleApply()
    }
  }

  // Show applied state
  if (appliedPromo) {
    const label =
      appliedPromo.discount_type === 'percentage'
        ? `${appliedPromo.discount_value}% off`
        : `${formatPrice(Math.round(appliedPromo.discount_value * 100))} off`

    return (
      <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span className="text-green-400 text-sm font-medium">
            {appliedPromo.code} — {label}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-400 hover:text-white text-xs transition-colors"
        >
          Remove
        </button>
      </div>
    )
  }

  // Show input state
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase())
            setError('')
          }}
          onKeyDown={handleKeyDown}
          placeholder="Promo code"
          className="flex-1 bg-white/5 border border-brand-gold/30 rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-brand-gold/60 transition-colors uppercase"
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={loading || !code.trim()}
          className="px-4 py-2 text-sm font-semibold rounded-lg border border-brand-gold/40 text-brand-gold hover:bg-brand-gold/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? '...' : 'Apply'}
        </button>
      </div>
      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}
    </div>
  )
}
