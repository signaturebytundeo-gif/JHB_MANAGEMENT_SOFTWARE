export interface Product {
  id: string
  name: string
  description: string
  price: number // in cents to avoid floating-point errors
  size: string
  image: string
  slug: string
  category: 'sauce' | 'pikliz' | 'bundle'
  inStock: boolean
  rating: number // star rating (e.g., 4.8)
  callouts: string[] // product highlights (e.g., ["Zero Calories", "All Natural"])
  images: string[] // array of image paths for gallery (first image is primary)
  stripeProductId?: string // Optional - will be set in Phase 3 (Stripe integration)
  stripePriceId?: string
}

export interface Bundle {
  id: string
  name: string
  description: string
  slug: string
  price: number // bundle price in cents (lower than sum of included items)
  image: string
  images: string[]
  includedProductIds: string[] // references to Product.id values
  savings: number // amount saved in cents vs buying individually
  callouts: string[]
  inStock: boolean
  rating: number
}
