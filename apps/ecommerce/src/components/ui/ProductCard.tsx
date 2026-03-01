import Link from 'next/link'
import Image from 'next/image'
import { Product } from '@/types/product'
import { formatPrice } from '@/lib/utils'
import StarRating from './StarRating'
import QuickAddButton from './QuickAddButton'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group bg-brand-dark border border-brand-gold/20 rounded-lg overflow-hidden transition-all hover:border-brand-gold/60 hover:shadow-lg hover:shadow-brand-gold/5"
    >
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={product.image}
          alt={`${product.name} - ${product.size}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className={`object-cover group-hover:scale-105 transition-transform duration-300 ${
            product.category === 'bundle' ? 'object-top' : ''
          }`}
        />
      </div>

      {/* Product Content */}
      <div className="p-4">
        <h3 className="font-semibold text-white text-lg">{product.name}</h3>
        <span className="text-sm text-gray-400">{product.size}</span>

        <div className="mt-2">
          <StarRating rating={product.rating} />
        </div>

        <div className="mt-2">
          <span className="text-brand-gold font-bold text-lg">
            {formatPrice(product.price)}
          </span>
        </div>

        <QuickAddButton
          productId={product.id}
          productName={product.name}
          productPrice={product.price}
          productImage={product.image}
          productSize={product.size}
        />
      </div>
    </Link>
  )
}
