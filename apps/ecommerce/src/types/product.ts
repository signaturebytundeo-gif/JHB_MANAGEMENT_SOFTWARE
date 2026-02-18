export interface Product {
  id: string
  name: string
  description: string
  price: number // in cents to avoid floating-point errors
  size: string
  image: string
  slug: string
  category: 'sauce' | 'pikliz'
  inStock: boolean
  rating: number // star rating (e.g., 4.8)
  callouts: string[] // product highlights (e.g., ["Zero Calories", "All Natural"])
  images: string[] // array of image paths for gallery (first image is primary)
  stripeProductId?: string // Optional - will be set in Phase 3 (Stripe integration)
  stripePriceId?: string
}
