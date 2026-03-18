'use client'

import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useSubscribeStore, isDismissedRecently } from '@/lib/subscribe-store'

export default function ExitIntentPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const hasShownThisSession = useRef(false)
  const readyRef = useRef(false)

  const { isSubscribed, subscribe, dismissPopup } = useSubscribeStore()

  // Hydrate store on mount (skipHydration pattern)
  useEffect(() => {
    useSubscribeStore.persist.rehydrate()
  }, [])

  useEffect(() => {
    // Allow exit-intent after 5 seconds
    const timer = setTimeout(() => {
      readyRef.current = true
    }, 5000)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    function handleMouseLeave(e: MouseEvent) {
      if (!readyRef.current) return
      if (hasShownThisSession.current) return
      if (isSubscribed) return
      if (isDismissedRecently()) return
      // Only trigger when cursor moves above the viewport
      if (e.clientY >= 0) return

      hasShownThisSession.current = true
      setIsOpen(true)
    }

    document.addEventListener('mouseleave', handleMouseLeave)
    return () => document.removeEventListener('mouseleave', handleMouseLeave)
  }, [isSubscribed])

  function handleDismiss() {
    setIsOpen(false)
    dismissPopup()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        subscribe()
        setStatus('success')
        // Auto-close after 2 seconds
        setTimeout(() => {
          setIsOpen(false)
        }, 2000)
      } else {
        setErrorMsg(data.message || 'Something went wrong. Please try again.')
        setStatus('error')
      }
    } catch {
      setErrorMsg('Network error. Please try again.')
      setStatus('error')
    }
  }

  return (
    <Dialog open={isOpen} onClose={handleDismiss} className="relative z-50">
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="bg-brand-dark border border-brand-gold/30 rounded-2xl max-w-md w-full p-8 shadow-2xl">
          {/* Gold visual hook */}
          <div className="text-center mb-6">
            <span className="text-6xl font-bold text-brand-gold leading-none">10%</span>
            <span className="block text-brand-gold text-sm font-semibold tracking-widest uppercase mt-1">Off Your First Order</span>
          </div>

          <DialogTitle className="text-2xl font-bold text-white text-center mb-3">
            Wait! Don&apos;t Leave Empty-Handed
          </DialogTitle>

          <p className="text-gray-300 text-center mb-6">
            Get 10% off your first order when you join our list.
          </p>

          {status === 'success' ? (
            <div className="text-center py-4">
              <div className="flex justify-center mb-3">
                <svg className="w-12 h-12 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-brand-gold font-semibold text-lg">You&apos;re in!</p>
              <p className="text-gray-300 text-sm mt-1">Check your inbox for your code.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full bg-white/10 border border-brand-gold/20 rounded-lg text-white placeholder-gray-500 px-4 py-3 mb-3 focus:outline-none focus:border-brand-gold/50"
              />

              {status === 'error' && (
                <p className="text-red-400 text-xs mb-3">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-brand-gold text-brand-dark font-bold text-lg py-4 rounded-lg hover:bg-brand-gold-light transition-colors disabled:opacity-70"
              >
                {status === 'loading' ? 'Sending...' : 'Unlock My 10% Off'}
              </button>
            </form>
          )}

          <div className="text-center mt-4">
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              No thanks, I&apos;ll pay full price
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
