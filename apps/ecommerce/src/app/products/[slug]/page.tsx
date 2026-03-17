import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProductBySlug, products } from '@/data/products'
import { getBundleBySlug, bundles } from '@/data/bundles'
import { generateProductJsonLd, sanitizeJsonLd } from '@/lib/seo'
import { formatPrice } from '@/lib/utils'
import ImageGallery from '@/components/product/ImageGallery'
import ProductInfo from '@/components/product/ProductInfo'
import ProductCallouts from '@/components/product/ProductCallouts'
import AddToCartSection from '@/components/product/AddToCartSection'
import BundleContents from '@/components/product/BundleContents'
import StarRating from '@/components/ui/StarRating'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const productParams = products.map((product) => ({
    slug: product.slug,
  }))

  const bundleParams = bundles.map((bundle) => ({
    slug: bundle.slug,
  }))

  return [...productParams, ...bundleParams]
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  const product = getProductBySlug(slug)
  if (product) {
    return {
      title: `${product.name} ${product.size} | Jamaica House Brand`,
      description: product.description,
      openGraph: {
        title: `${product.name} ${product.size}`,
        description: product.description,
        images: [{ url: product.image }],
      },
    }
  }

  const bundle = getBundleBySlug(slug)
  if (bundle) {
    return {
      title: `${bundle.name} | Jamaica House Brand`,
      description: bundle.description,
      openGraph: {
        title: bundle.name,
        description: bundle.description,
        images: [{ url: bundle.image }],
      },
    }
  }

  return {
    title: 'Product Not Found | Jamaica House Brand',
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params

  // Check if it's a regular product first
  const product = getProductBySlug(slug)

  if (product) {
    const productJsonLd = generateProductJsonLd({
      name: product.name,
      description: product.description,
      image: product.image,
      price: product.price,
      size: product.size,
      slug: product.slug,
      inStock: product.inStock,
      rating: product.rating,
    })

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(productJsonLd) }}
        />
        <div className="pt-8 sm:pt-12 pb-16 sm:pb-24 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              {/* Left column: Image Gallery */}
              <ImageGallery images={product.images} productName={product.name} />

              {/* Right column: Product Info */}
              <div>
                <ProductInfo product={product} />
                <ProductCallouts callouts={product.callouts} />

                {/* Quantity Selector and Add to Cart */}
                <AddToCartSection product={product} />
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Check if it's a bundle
  const bundle = getBundleBySlug(slug)

  if (bundle) {
    const originalPrice = bundle.price + bundle.savings

    // Build a product-like object so AddToCartSection works for bundles
    const bundleAsProduct = {
      id: bundle.id,
      name: bundle.name,
      description: bundle.description,
      price: bundle.price,
      size: bundle.includedProductIds.length + ' items',
      image: bundle.image,
      slug: bundle.slug,
      category: 'bundle' as const,
      inStock: bundle.inStock,
      rating: bundle.rating,
      callouts: bundle.callouts,
      images: bundle.images,
    }

    return (
      <div className="pt-8 sm:pt-12 pb-16 sm:pb-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {/* Left column: Image Gallery */}
            <ImageGallery images={bundle.images} productName={bundle.name} />

            {/* Right column: Bundle Info */}
            <div>
              {/* Bundle name */}
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {bundle.name}
              </h1>

              {/* Star rating */}
              <StarRating rating={bundle.rating} />

              {/* Pricing with savings */}
              <div className="mt-4 mb-4">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl font-bold text-brand-gold">
                    {formatPrice(bundle.price)}
                  </span>
                  <span className="text-gray-500 text-lg line-through">
                    {formatPrice(originalPrice)}
                  </span>
                  <span className="inline-flex items-center bg-green-900/60 text-green-400 text-sm font-bold px-3 py-1 rounded">
                    Save {formatPrice(bundle.savings)}
                  </span>
                </div>
              </div>

              <hr className="border-brand-gold/20 my-6" />

              {/* Description */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-3">
                  About This Bundle
                </h2>
                <p className="text-gray-300 leading-relaxed">{bundle.description}</p>
              </div>

              {/* In Stock indicator */}
              {bundle.inStock ? (
                <div className="flex items-center gap-2 text-green-500 text-sm mb-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>In Stock</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-500 text-sm mb-4">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Out of Stock</span>
                </div>
              )}

              {/* Bundle contents list */}
              <BundleContents includedProductIds={bundle.includedProductIds} />

              {/* Callouts */}
              <ProductCallouts callouts={bundle.callouts} />

              {/* Add to Cart — isBundle:true so cart store can identify bundle items */}
              <AddToCartSection product={bundleAsProduct} isBundle={true} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  notFound()
}
