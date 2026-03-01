'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useCartStore } from '@/lib/cart-store'
import { useSampleStore, isDismissedRecently } from '@/lib/sample-store'

export default function FreeSamplePopup() {
  const [isOpen, setIsOpen] = useState(false)
  const { items, addItem } = useCartStore()
  const { popupShown, popupDismissed, setPopupShown, dismissPopup, openUpsell } = useSampleStore()

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(true)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  function handleClaim() {
    addItem({
      id: 'free-sample-2oz',
      name: 'Free 2oz Jerk Sauce Sample',
      price: 0,
      image: '/images/products/jerk-sauce-2oz.jpg',
      size: '2oz',
      isFreeSample: true,
    })
    setIsOpen(false)
    dismissPopup()
    openUpsell()
  }

  function handleDismiss() {
    setIsOpen(false)
    dismissPopup()
  }

  return (
    <Dialog open={isOpen} onClose={handleDismiss} className="relative z-50">
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="bg-brand-dark border border-brand-gold/30 rounded-2xl max-w-md w-full p-8 shadow-2xl">
          {/* 2oz Sample Bottle */}
          <div className="flex justify-center mb-6">
            <Image
              src="/images/products/jerk-sauce-2oz.jpg"
              alt="Free 2oz Jerk Sauce Sample"
              width={120}
              height={160}
              className="rounded-lg"
            />
          </div>

          <DialogTitle className="text-2xl md:text-3xl font-bold text-white text-center mb-3">
            Try Our Legendary Jerk Sauce FREE!
          </DialogTitle>

          <p className="text-gray-300 text-center mb-8">
            Get a free 2oz bottle — just pay $5.99 shipping.
          </p>

          <button
            onClick={handleClaim}
            className="w-full bg-brand-gold text-brand-dark font-bold text-lg py-4 rounded-lg hover:bg-brand-gold-light transition-colors mb-4"
          >
            Claim My Free Sample
          </button>

          <button
            onClick={handleDismiss}
            className="w-full text-gray-400 hover:text-white text-sm py-2 transition-colors"
          >
            No thanks
          </button>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
