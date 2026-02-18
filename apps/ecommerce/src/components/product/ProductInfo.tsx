import { Product } from '@/types/product'
import { formatPrice } from '@/lib/utils'
import StarRating from '@/components/ui/StarRating'

interface ProductInfoProps {
  product: Product
}

export default function ProductInfo({ product }: ProductInfoProps) {
  return (
    <div>
      {/* Product Name and Size */}
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
        {product.name}
      </h1>
      <span className="text-lg text-gray-400 mb-4 block">
        {product.size}
      </span>

      {/* Star Rating */}
      <StarRating rating={product.rating} />

      {/* Price */}
      <div className="text-3xl font-bold text-brand-gold mt-4 mb-6">
        {formatPrice(product.price)}
      </div>

      {/* Divider */}
      <hr className="border-brand-gold/20 my-6" />

      {/* Description */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">
          About This Product
        </h2>
        <p className="text-gray-300 leading-relaxed">
          {product.description}
        </p>
      </div>

      {/* In Stock Indicator */}
      <div className="mt-4">
        {product.inStock ? (
          <div className="flex items-center gap-2 text-green-500 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>In Stock</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Out of Stock</span>
          </div>
        )}
      </div>
    </div>
  )
}
