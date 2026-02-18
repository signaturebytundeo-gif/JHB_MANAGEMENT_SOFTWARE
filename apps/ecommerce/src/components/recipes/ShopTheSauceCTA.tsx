import Link from 'next/link'
import Image from 'next/image'
import { getProductById } from '@/data/products'
import { formatPrice } from '@/lib/utils'

interface ShopTheSauceCTAProps {
  productIds: string[]
}

export default function ShopTheSauceCTA({ productIds }: ShopTheSauceCTAProps) {
  // Resolve product IDs to Product objects
  const products = productIds
    .map((id) => getProductById(id))
    .filter((product) => product !== undefined)

  if (products.length === 0) {
    return null
  }

  return (
    <section className="bg-white/5 border border-white/10 rounded-lg p-8 mt-12">
      <h2 className="text-2xl font-bold text-brand-gold mb-6">
        Shop the Sauce Used in This Recipe
      </h2>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
            className="flex items-center gap-4 bg-brand-dark border border-white/10 rounded-lg p-4 hover:border-brand-gold/60 transition-colors"
          >
            {/* Product Image */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="96px"
                className="object-cover rounded"
              />
            </div>

            {/* Product Info */}
            <div className="flex-1">
              <h3 className="font-semibold text-white">{product.name}</h3>
              <p className="text-sm text-gray-400 mt-1">{product.size}</p>
              <p className="text-brand-gold font-bold mt-2">
                {formatPrice(product.price)}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Shop All CTA */}
      <div className="mt-6 text-center">
        <Link
          href="/shop"
          className="inline-block text-brand-gold hover:text-white transition-colors underline"
        >
          Shop All Products
        </Link>
      </div>
    </section>
  )
}
