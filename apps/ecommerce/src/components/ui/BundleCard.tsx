import Link from 'next/link'
import Image from 'next/image'
import { Bundle } from '@/types/product'
import { formatPrice } from '@/lib/utils'
import { getProductById } from '@/data/products'
import BundleQuickAddButton from './BundleQuickAddButton'

interface BundleCardProps {
  bundle: Bundle
}

export default function BundleCard({ bundle }: BundleCardProps) {
  // Resolve included products to calculate original price and build size string
  const includedProducts = bundle.includedProductIds
    .map((id) => getProductById(id))
    .filter(Boolean)

  const originalPrice = bundle.price + bundle.savings

  const sizeLabel = includedProducts
    .map((p) => p?.size)
    .filter(Boolean)
    .join(' + ')

  return (
    <Link
      href={`/products/${bundle.slug}`}
      className="group bg-brand-dark border border-brand-gold/20 rounded-lg overflow-hidden transition-all hover:border-brand-gold/60 hover:shadow-lg hover:shadow-brand-gold/5"
    >
      {/* Bundle Image with "Bundle" tag */}
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={bundle.image}
          alt={bundle.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover object-bottom group-hover:scale-105 transition-transform duration-300"
        />
        {/* Bundle badge */}
        <span className="absolute top-0 right-0 bg-brand-gold text-brand-dark text-xs font-bold px-2 py-1 rounded-bl-lg">
          Bundle
        </span>
      </div>

      {/* Bundle Content */}
      <div className="p-4">
        <h3 className="font-semibold text-white text-lg">{bundle.name}</h3>
        <span className="text-sm text-gray-400">{sizeLabel}</span>

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {/* Savings badge */}
          <span className="inline-flex items-center bg-green-900/60 text-green-400 text-xs font-bold px-2 py-0.5 rounded">
            Save {formatPrice(bundle.savings)}
          </span>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-brand-gold font-bold text-lg">
            {formatPrice(bundle.price)}
          </span>
          <span className="text-gray-500 text-sm line-through">
            {formatPrice(originalPrice)}
          </span>
        </div>

        <BundleQuickAddButton
          bundleId={bundle.id}
          bundleName={bundle.name}
          bundlePrice={bundle.price}
          bundleImage={bundle.image}
          bundleSize={sizeLabel}
        />
      </div>
    </Link>
  )
}
