import { Product } from '@/types/product'

export const products: Product[] = [
  {
    id: 'jerk-sauce-2oz',
    name: 'Original Jerk Sauce',
    description: 'Authentic Jamaican jerk sauce crafted from a 30-year-old family recipe. Features allspice, thyme, and Scotch bonnet peppers. Zero calories, all natural ingredients.',
    price: 399, // $3.99 in cents
    size: '2oz',
    image: '/images/products/jerk-sauce-2oz.jpg',
    slug: 'jerk-sauce-2oz',
    category: 'sauce',
    inStock: true,
    rating: 4.8,
    callouts: ['Zero Calories', 'All Natural', '30-Year Recipe'],
    images: [
      '/images/products/jerk-sauce-2oz.jpg',
      '/images/products/jerk-sauce-2oz-2.jpg',
      '/images/products/jerk-sauce-2oz-3.jpg',
    ],
  },
  {
    id: 'jerk-sauce-5oz',
    name: 'Original Jerk Sauce',
    description: 'Authentic Jamaican jerk sauce crafted from a 30-year-old family recipe. Features allspice, thyme, and Scotch bonnet peppers. Zero calories, all natural ingredients.',
    price: 799, // $7.99 in cents
    size: '5oz',
    image: '/images/products/jerk-sauce-5oz.jpg',
    slug: 'jerk-sauce-5oz',
    category: 'sauce',
    inStock: true,
    rating: 4.9,
    callouts: ['Zero Calories', 'All Natural', '30-Year Recipe'],
    images: [
      '/images/products/jerk-sauce-5oz.jpg',
      '/images/products/jerk-sauce-5oz-2.jpg',
      '/images/products/jerk-sauce-5oz-3.jpg',
    ],
  },
  {
    id: 'jerk-sauce-10oz',
    name: 'Original Jerk Sauce',
    description: 'Authentic Jamaican jerk sauce crafted from a 30-year-old family recipe. Features allspice, thyme, and Scotch bonnet peppers. Zero calories, all natural ingredients.',
    price: 1499, // $14.99 in cents
    size: '10oz',
    image: '/images/products/jerk-sauce-10oz.jpg',
    slug: 'jerk-sauce-10oz',
    category: 'sauce',
    inStock: true,
    rating: 4.7,
    callouts: ['Zero Calories', 'All Natural', '30-Year Recipe'],
    images: [
      '/images/products/jerk-sauce-10oz.jpg',
      '/images/products/jerk-sauce-10oz-2.jpg',
      '/images/products/jerk-sauce-10oz-3.jpg',
    ],
  },
  {
    id: 'escovitch-pikliz-12oz',
    name: 'Escovitch Pikliz',
    description: 'Spicy Jamaican pickled vegetable relish with habanero peppers, carrots, onions, and vinegar. Perfect accompaniment to jerk chicken and grilled meats.',
    price: 799, // $7.99 in cents
    size: '12oz',
    image: '/images/products/pikliz-12oz.jpg',
    slug: 'escovitch-pikliz-12oz',
    category: 'pikliz',
    inStock: true,
    rating: 4.6,
    callouts: ['All Natural', 'Handcrafted', 'Authentic Recipe'],
    images: [
      '/images/products/pikliz-12oz.jpg',
      '/images/products/pikliz-12oz-2.jpg',
      '/images/products/pikliz-12oz-3.jpg',
    ],
  },
]

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug)
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id)
}
