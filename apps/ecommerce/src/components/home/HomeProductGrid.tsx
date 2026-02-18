import Link from 'next/link'
import { products } from '@/data/products'
import ProductCard from '@/components/ui/ProductCard'

export default function HomeProductGrid() {
  return (
    <section className="py-16 sm:py-24 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
          Our Products
        </h2>
        <p className="text-gray-400 text-center mb-12">
          Handcrafted with 30 years of flavor expertise
        </p>

        {/* Product grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* View all link */}
        <div className="mt-8 text-center">
          <Link
            href="/shop"
            className="text-brand-gold hover:text-brand-gold-light font-medium inline-block transition-colors"
          >
            View All Products
          </Link>
        </div>
      </div>
    </section>
  )
}
