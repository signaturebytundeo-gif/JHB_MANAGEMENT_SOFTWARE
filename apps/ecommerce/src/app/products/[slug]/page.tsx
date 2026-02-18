import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProductBySlug, products } from '@/data/products'
import { generateProductJsonLd, sanitizeJsonLd } from '@/lib/seo'
import ImageGallery from '@/components/product/ImageGallery'
import ProductInfo from '@/components/product/ProductInfo'
import ProductCallouts from '@/components/product/ProductCallouts'
import AddToCartSection from '@/components/product/AddToCartSection'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return products.map((product) => ({
    slug: product.slug,
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = getProductBySlug(slug)

  if (!product) {
    return {
      title: 'Product Not Found | Jamaica House Brand',
    }
  }

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

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params
  const product = getProductBySlug(slug)

  if (!product) {
    notFound()
  }

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
