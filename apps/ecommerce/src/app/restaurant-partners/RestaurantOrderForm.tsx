'use client'

import { useState } from 'react'

const GALLON_PRICE = 50
const CASE_PRICE = 60

type FormStatus = 'idle' | 'submitting' | 'success' | 'error'

export default function RestaurantOrderForm() {
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Form fields
  const [businessName, setBusinessName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [requestedDate, setRequestedDate] = useState('')
  const [qtyGallon, setQtyGallon] = useState(0)
  const [qtyCase, setQtyCase] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [notes, setNotes] = useState('')

  // Auto-calc
  const gallonTotal = qtyGallon * GALLON_PRICE
  const caseTotal = qtyCase * CASE_PRICE
  const subtotal = gallonTotal + caseTotal
  const orderTotal = subtotal

  // Validation
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const markTouched = (field: string) => setTouched((t) => ({ ...t, [field]: true }))

  const errors: Record<string, string> = {}
  if (!businessName.trim()) errors.businessName = 'Required'
  if (!contactName.trim()) errors.contactName = 'Required'
  if (!phone.trim()) errors.phone = 'Required'
  if (!email.trim()) errors.email = 'Required'
  else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Invalid email'
  if (orderTotal === 0) errors.order = 'Add at least one product'

  const canSubmit = Object.keys(errors).length === 0 && status !== 'submitting'

  async function handleSubmit() {
    // Mark all fields as touched to show validation
    setTouched({ businessName: true, contactName: true, phone: true, email: true, order: true })

    if (!canSubmit) return

    setStatus('submitting')
    setErrorMsg('')

    try {
      const res = await fetch('/api/restaurant-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessName.trim(),
          contactName: contactName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          deliveryAddress: deliveryAddress.trim(),
          requestedDate,
          qtyGallon,
          qtyCase,
          paymentMethod,
          notes: notes.trim(),
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setStatus('success')
      } else {
        setErrorMsg(data.error || 'Something went wrong. Please try again.')
        setStatus('error')
      }
    } catch {
      setErrorMsg('Network error. Please try again.')
      setStatus('error')
    }
  }

  // ── Success state ──────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-brand-green/20 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-white">Order Request Received!</h3>
        <p className="text-gray-400 max-w-md mx-auto">
          Thanks <span className="text-brand-gold font-semibold">{contactName.split(' ')[0]}</span> — we&apos;ll contact you within 1 business day to confirm your order. Check your email for a summary.
        </p>
        <p className="text-gray-500 text-sm">
          Questions? Call us at <a href="tel:7867091027" className="text-brand-gold hover:underline">786-709-1027</a>
        </p>
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────
  const inputClass =
    'w-full bg-white/5 border border-brand-gold/20 rounded-lg px-4 py-3 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-brand-gold/50 transition-colors'
  const labelClass = 'block text-sm font-medium text-gray-300 mb-1.5'
  const errorClass = 'text-red-400 text-xs mt-1'

  return (
    <div className="space-y-8">
      {/* Contact info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Restaurant / Business Name *</label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            onBlur={() => markTouched('businessName')}
            placeholder="e.g., Caribbean Kitchen"
            className={inputClass}
          />
          {touched.businessName && errors.businessName && <p className={errorClass}>{errors.businessName}</p>}
        </div>
        <div>
          <label className={labelClass}>Contact Name *</label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            onBlur={() => markTouched('contactName')}
            placeholder="e.g., Marcus Johnson"
            className={inputClass}
          />
          {touched.contactName && errors.contactName && <p className={errorClass}>{errors.contactName}</p>}
        </div>
        <div>
          <label className={labelClass}>Phone *</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => markTouched('phone')}
            placeholder="e.g., 305-555-1234"
            className={inputClass}
          />
          {touched.phone && errors.phone && <p className={errorClass}>{errors.phone}</p>}
        </div>
        <div>
          <label className={labelClass}>Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => markTouched('email')}
            placeholder="e.g., marcus@restaurant.com"
            className={inputClass}
          />
          {touched.email && errors.email && <p className={errorClass}>{errors.email}</p>}
        </div>
        <div>
          <label className={labelClass}>Delivery Address</label>
          <input
            type="text"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="e.g., 123 Ocean Dr, Miami, FL"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Requested Delivery Date</label>
          <input
            type="date"
            value={requestedDate}
            onChange={(e) => setRequestedDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Order table */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Order Details</h3>
        <div className="rounded-lg border border-brand-gold/20 overflow-hidden">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-4 gap-4 px-4 py-3 bg-white/5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <span className="col-span-1">Product</span>
            <span className="text-right">Unit Price</span>
            <span className="text-center">Qty</span>
            <span className="text-right">Line Total</span>
          </div>

          {/* Gallon row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 px-4 py-4 border-t border-brand-gold/10 items-center">
            <div className="sm:col-span-1">
              <p className="text-white text-sm font-medium">Jerk Sauce · 1 Gallon</p>
              <p className="text-gray-500 text-xs">Back of House format</p>
            </div>
            <p className="text-brand-gold text-sm sm:text-right font-semibold">
              $50.00 <span className="text-gray-500 font-normal">(intro)</span>
            </p>
            <div className="flex items-center sm:justify-center gap-2">
              <button
                type="button"
                onClick={() => setQtyGallon(Math.max(0, qtyGallon - 1))}
                className="w-8 h-8 rounded bg-white/5 border border-brand-gold/20 text-white flex items-center justify-center hover:bg-brand-gold/10 transition-colors"
              >
                −
              </button>
              <input
                type="number"
                min="0"
                value={qtyGallon}
                onChange={(e) => setQtyGallon(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-14 text-center bg-white/5 border border-brand-gold/20 rounded py-1.5 text-white text-sm focus:outline-none focus:border-brand-gold/50"
              />
              <button
                type="button"
                onClick={() => setQtyGallon(qtyGallon + 1)}
                className="w-8 h-8 rounded bg-white/5 border border-brand-gold/20 text-white flex items-center justify-center hover:bg-brand-gold/10 transition-colors"
              >
                +
              </button>
            </div>
            <p className="text-white text-sm sm:text-right font-semibold">
              ${gallonTotal.toFixed(2)}
            </p>
          </div>

          {/* Case row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 px-4 py-4 border-t border-brand-gold/10 items-center">
            <div className="sm:col-span-1">
              <p className="text-white text-sm font-medium">Jerk Sauce · 5oz Case</p>
              <p className="text-gray-500 text-xs">12 bottles per case</p>
            </div>
            <p className="text-brand-gold text-sm sm:text-right font-semibold">$60.00/case</p>
            <div className="flex items-center sm:justify-center gap-2">
              <button
                type="button"
                onClick={() => setQtyCase(Math.max(0, qtyCase - 1))}
                className="w-8 h-8 rounded bg-white/5 border border-brand-gold/20 text-white flex items-center justify-center hover:bg-brand-gold/10 transition-colors"
              >
                −
              </button>
              <input
                type="number"
                min="0"
                value={qtyCase}
                onChange={(e) => setQtyCase(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-14 text-center bg-white/5 border border-brand-gold/20 rounded py-1.5 text-white text-sm focus:outline-none focus:border-brand-gold/50"
              />
              <button
                type="button"
                onClick={() => setQtyCase(qtyCase + 1)}
                className="w-8 h-8 rounded bg-white/5 border border-brand-gold/20 text-white flex items-center justify-center hover:bg-brand-gold/10 transition-colors"
              >
                +
              </button>
            </div>
            <p className="text-white text-sm sm:text-right font-semibold">
              ${caseTotal.toFixed(2)}
            </p>
          </div>

          {/* Totals */}
          <div className="border-t border-brand-gold/20 px-4 py-4 bg-white/5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Subtotal</span>
              <span className="text-white font-semibold">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-white font-bold">Order Total</span>
              <span className="text-brand-gold font-extrabold">${orderTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
        {touched.order && errors.order && <p className={errorClass + ' mt-2'}>{errors.order}</p>}
      </div>

      {/* Payment method */}
      <div>
        <label className={labelClass}>Payment Method</label>
        <div className="flex flex-wrap gap-3">
          {['Cash', 'Zelle', 'Check', 'Credit Card'].map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                paymentMethod === method
                  ? 'bg-brand-gold text-brand-dark border-brand-gold'
                  : 'bg-white/5 text-gray-300 border-brand-gold/20 hover:border-brand-gold/40'
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={labelClass}>Additional Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Delivery instructions, special requests, etc."
          rows={3}
          className={inputClass + ' resize-none'}
        />
      </div>

      {/* Error banner */}
      {status === 'error' && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={status === 'submitting'}
        className="w-full bg-brand-green text-white font-bold text-lg py-4 rounded-lg hover:bg-brand-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {status === 'submitting' ? (
          <>
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sending...
          </>
        ) : (
          'Submit Order Request'
        )}
      </button>

      <p className="text-gray-500 text-xs text-center">
        By submitting, you agree to be contacted about your order. We typically respond within 1 business day.
      </p>
    </div>
  )
}
