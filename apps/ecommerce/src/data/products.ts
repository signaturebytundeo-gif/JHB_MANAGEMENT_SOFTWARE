import { Product } from '@/types/product'

export const products: Product[] = [
  {
    id: 'jerk-sauce-2oz',
    name: 'Original Jerk Sauce',
    description: 'Authentic Jamaican jerk sauce crafted from a 30-year-old family recipe. Features allspice, thyme, and Scotch bonnet peppers. Zero calories, all natural ingredients.',
    price: 699, // $6.99 in cents
    size: '2oz',
    image: '/images/products/jerk-sauce-2oz.jpg',
    slug: 'jerk-sauce-2oz',
    category: 'sauce',
    inStock: true,
    rating: 4.8,
    callouts: ['Zero Calories', 'All Natural', '30-Year Recipe'],
    images: [
      '/images/products/jerk-sauce-2oz.jpg',
    ],
  },
  {
    id: 'jerk-sauce-5oz',
    name: 'Original Jerk Sauce',
    description: 'Authentic Jamaican jerk sauce crafted from a 30-year-old family recipe. Features allspice, thyme, and Scotch bonnet peppers. Zero calories, all natural ingredients.',
    price: 1199, // $11.99 in cents
    size: '5oz',
    image: '/images/products/jerk-sauce-5oz.jpg',
    slug: 'jerk-sauce-5oz',
    category: 'sauce',
    inStock: true,
    rating: 4.9,
    callouts: ['Zero Calories', 'All Natural', '30-Year Recipe'],
    images: [
      '/images/products/jerk-sauce-5oz.jpg',
    ],
  },
  {
    id: 'jerk-sauce-10oz',
    name: 'Original Jerk Sauce',
    description: 'Authentic Jamaican jerk sauce crafted from a 30-year-old family recipe. Features allspice, thyme, and Scotch bonnet peppers. Zero calories, all natural ingredients.',
    price: 1999, // $19.99 in cents
    size: '10oz',
    image: '/images/products/jerk-sauce-5oz.jpg',
    slug: 'jerk-sauce-10oz',
    category: 'sauce',
    inStock: true,
    rating: 4.7,
    callouts: ['Zero Calories', 'All Natural', '30-Year Recipe'],
    images: [
      '/images/products/jerk-sauce-5oz.jpg',
    ],
  },
  {
    id: 'escovitch-pikliz-12oz',
    name: 'Escovitch Pikliz',
    description: 'Spicy Jamaican pickled vegetable relish with habanero peppers, carrots, onions, and vinegar. Perfect accompaniment to jerk chicken and grilled meats.',
    price: 1199, // $11.99 in cents
    size: '12oz',
    image: '/images/products/pikliz-12oz.jpg',
    slug: 'escovitch-pikliz-12oz',
    category: 'pikliz',
    inStock: true,
    rating: 4.6,
    callouts: ['All Natural', 'Handcrafted', 'Authentic Recipe'],
    images: [
      '/images/products/pikliz-12oz.jpg',
    ],
  },
  {
    id: 'starter-bundle',
    name: 'The Starter Bundle',
    description: 'Get the full Jamaica House experience — our 2oz Jerk Sauce, 5oz Jerk Sauce, and 12oz Escovitch Pikliz together at a special bundle price. Save over $5 compared to buying separately.',
    price: 2499, // $24.99 in cents
    size: '2oz + 5oz + 12oz',
    image: '/images/products/product-lineup.jpg',
    slug: 'starter-bundle',
    category: 'bundle',
    inStock: true,
    rating: 5.0,
    callouts: ['Best Value', 'Save $5+', 'Complete Collection'],
    images: [
      '/images/products/product-lineup.jpg',
    ],
  },
]

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug)
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id)
}
