import Image from 'next/image'
import { getProductById } from '@/data/products'
import { formatPrice } from '@/lib/utils'

interface BundleContentsProps {
  includedProductIds: string[]
}

export default function BundleContents({ includedProductIds }: BundleContentsProps) {
  const includedProducts = includedProductIds
    .map((id) => getProductById(id))
    .filter(Boolean)

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-white mb-4">What&apos;s Included</h3>
      <ul className="space-y-3">
        {includedProducts.map((product) => {
          if (!product) return null
          return (
            <li
              key={product.id}
              className="flex items-center gap-3 bg-white/5 rounded-lg p-3"
            >
              {/* Product thumbnail */}
              <div className="relative w-10 h-10 flex-shrink-0 rounded overflow-hidden">
                <Image
                  src={product.image}
                  alt={`${product.name} ${product.size}`}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>

              {/* Product name and size */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {product.name}
                </p>
                <p className="text-gray-400 text-xs">{product.size}</p>
              </div>

              {/* Individual price */}
              <span className="text-gray-400 text-sm flex-shrink-0">
                {formatPrice(product.price)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
