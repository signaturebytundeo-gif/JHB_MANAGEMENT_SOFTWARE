'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useCartStore } from '@/lib/cart-store'
import { useSampleStore } from '@/lib/sample-store'

const upsellProducts = [
  {
    id: 'jerk-sauce-5oz',
    name: 'Original Jerk Sauce',
    size: '5oz',
    originalPrice: 1199,
    discountedPrice: 839,
    image: '/images/products/jerk-sauce-5oz.jpg',
  },
  {
    id: 'jerk-sauce-10oz',
    name: 'Original Jerk Sauce',
    size: '10oz',
    originalPrice: 1999,
    discountedPrice: 1399,
    image: '/images/products/jerk-sauce-5oz.jpg',
  },
  {
    id: 'escovitch-pikliz-12oz',
    name: 'Escovitch Pikliz',
    size: '12oz',
    originalPrice: 1199,
    discountedPrice: 839,
    image: '/images/products/pikliz-12oz.jpg',
  },
]

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export default function UpsellModal() {
  const router = useRouter()
  const { showUpsell, closeUpsell } = useSampleStore()
  const { items, addItem } = useCartStore()

  async function handleCheckout(checkoutItems: typeof items) {
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: checkoutItems }),
      })
      const data = await res.json()
      if (data.url) {
        router.push(data.url)
      }
    } catch (error) {
      console.error('Checkout error:', error)
    }
  }

  function handleSelectUpsell(product: typeof upsellProducts[0]) {
    addItem({
      id: product.id,
      name: product.name,
      price: product.discountedPrice,
      image: product.image,
      size: product.size,
    })
    closeUpsell()
    // Let the user complete checkout from the cart
    const { items: currentItems } = useCartStore.getState()
    handleCheckout(currentItems)
  }

  function handleDecline() {
    closeUpsell()
    // Proceed to checkout with just the free sample
    handleCheckout(items)
  }

  return (
    <Dialog open={showUpsell} onClose={handleDecline} className="relative z-50">
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="bg-brand-dark border border-brand-gold/30 rounded-2xl max-w-lg w-full p-8 shadow-2xl">
          <DialogTitle className="text-2xl md:text-3xl font-bold text-white text-center mb-2">
            Wait — 30% Off Your First Bottle!
          </DialogTitle>

          <p className="text-gray-300 text-center mb-8">
            Add any size and save 30%. One-time offer.
          </p>

          <div className="space-y-4 mb-8">
            {upsellProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => handleSelectUpsell(product)}
                className="w-full flex items-center gap-4 bg-white/5 border border-white/10 hover:border-brand-gold/50 rounded-lg p-4 transition-colors text-left"
              >
                <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">
                    {product.name} ({product.size})
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 line-through text-sm">
                      {formatPrice(product.originalPrice)}
                    </span>
                    <span className="text-brand-gold font-bold text-lg">
                      {formatPrice(product.discountedPrice)}
                    </span>
                  </div>
                </div>
                <div className="bg-brand-red text-white text-xs font-bold px-2 py-1 rounded">
                  30% OFF
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={handleDecline}
            className="w-full text-gray-400 hover:text-white text-sm py-2 transition-colors"
          >
            No thanks, just the sample &rarr;
          </button>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
