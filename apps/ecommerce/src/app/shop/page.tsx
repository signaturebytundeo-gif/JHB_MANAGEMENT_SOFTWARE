import { Metadata } from 'next'
import { products } from '@/data/products'
import { bundles } from '@/data/bundles'
import ProductCard from '@/components/ui/ProductCard'
import BundleCard from '@/components/ui/BundleCard'
import { generateItemListJsonLd, generateBreadcrumbJsonLd, sanitizeJsonLd } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Shop Authentic Jamaican Jerk Sauce & Sauces Online',
  description: 'Buy authentic Jamaican jerk sauce online. Original Jerk Sauce in 2oz, 5oz, and 10oz sizes, plus Escovitch Pikliz. Zero calories, all natural. Bundle & save up to $7.97. Free shipping over $50.',
  openGraph: {
    title: 'Shop Jamaica House Brand - Authentic Jamaican Sauces',
    description: 'Handcrafted Jamaican sauces from a 30-year family recipe. Zero calories, all natural.',
    images: [{
      url: '/images/products/product-lineup.jpg',
      width: 1200,
      height: 630,
      alt: 'Jamaica House Brand sauce collection',
    }],
  },
  alternates: {
    canonical: 'https://jamaicahousebrand.com/shop',
  },
}

export default function ShopPage() {
  const allItems = [...products, ...bundles].map((item) => ({
    name: item.name,
    url: `https://jamaicahousebrand.com/products/${item.slug}`,
    image: item.image,
    price: item.price,
  }))
  const itemListJsonLd = generateItemListJsonLd(allItems, 'Jamaica House Brand Sauces')
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Home', url: 'https://jamaicahousebrand.com' },
    { name: 'Shop', url: 'https://jamaicahousebrand.com/shop' },
  ])

  return (
    <div className="pt-8 sm:pt-12 pb-16 sm:pb-24 px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(breadcrumbJsonLd) }}
      />
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Shop Our Sauces
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Handcrafted from a 30-year family recipe. Zero calories. All natural.
          </p>
        </div>

        {/* Bundle & Save Section */}
        <div className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Bundle &amp; Save
          </h2>
          <p className="text-gray-400 mb-8">
            Get more for less — curated bundles with serious savings.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bundles.map((bundle) => (
              <BundleCard key={bundle.id} bundle={bundle} />
            ))}
          </div>
        </div>

        {/* Individual Products Section */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Individual Products
          </h2>
          <p className="text-gray-400 mb-8">
            Mix and match your favorites — order exactly what you need.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
