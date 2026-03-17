import { Bundle } from '@/types/product'

// Bundle prices are in cents. Individual sums calculated from products.ts pricing.
// Starter Bundle: $6.99 + $11.99 + $11.99 = $30.97 individual sum
// Heat Pack:      $11.99 + $19.99 + $11.99 = $43.97 individual sum
// Gift Set:       $6.99 + $11.99 + $19.99 + $11.99 = $50.96 individual sum

export const bundles: Bundle[] = [
  {
    id: 'starter-bundle',
    name: 'The Starter Bundle',
    description:
      'Get the full Jamaica House experience — our 2oz Jerk Sauce, 5oz Jerk Sauce, and 12oz Escovitch Pikliz together at a special bundle price. The perfect introduction to authentic Jamaican flavor.',
    slug: 'starter-bundle',
    price: 2499, // $24.99 (individual sum $30.97)
    image: '/images/products/product-lineup.jpg',
    images: ['/images/products/product-lineup.jpg'],
    includedProductIds: ['jerk-sauce-2oz', 'jerk-sauce-5oz', 'escovitch-pikliz-12oz'],
    savings: 598, // $5.98 savings (3097 - 2499)
    callouts: ['Best Value', 'Save $5.98', 'Complete Starter Set'],
    inStock: true,
    rating: 5.0,
  },
  {
    id: 'heat-pack',
    name: 'The Heat Pack',
    description:
      'For the serious sauce lover — our 5oz and 10oz Jerk Sauces paired with the 12oz Escovitch Pikliz. Bigger sizes, bolder flavor, and serious savings on our most popular combination.',
    slug: 'heat-pack',
    price: 3699, // $36.99 (individual sum $43.97)
    image: '/images/products/product-lineup.jpg',
    images: ['/images/products/product-lineup.jpg'],
    includedProductIds: ['jerk-sauce-5oz', 'jerk-sauce-10oz', 'escovitch-pikliz-12oz'],
    savings: 698, // $6.98 savings (4397 - 3699)
    callouts: ['Heat Lovers Pick', 'Save $6.98', 'Bigger Sizes'],
    inStock: true,
    rating: 4.9,
  },
  {
    id: 'gift-set',
    name: 'The Gift Set',
    description:
      'The ultimate Jamaica House collection — all four products in one gift. Includes every size of our Original Jerk Sauce plus the Escovitch Pikliz. The perfect gift for any food lover.',
    slug: 'gift-set',
    price: 4299, // $42.99 (individual sum $50.96)
    image: '/images/products/product-lineup.jpg',
    images: ['/images/products/product-lineup.jpg'],
    includedProductIds: [
      'jerk-sauce-2oz',
      'jerk-sauce-5oz',
      'jerk-sauce-10oz',
      'escovitch-pikliz-12oz',
    ],
    savings: 797, // $7.97 savings (5096 - 4299)
    callouts: ['Perfect Gift', 'Save $7.97', 'Complete Collection'],
    inStock: true,
    rating: 5.0,
  },
]

export function getBundleBySlug(slug: string): Bundle | undefined {
  return bundles.find((b) => b.slug === slug)
}

export function getBundleById(id: string): Bundle | undefined {
  return bundles.find((b) => b.id === id)
}
