import { Recipe } from '@/types/recipe'

const BASE_URL = 'https://jamaicahousebrand.com'

interface RecipeJsonLd {
  '@context': string
  '@type': string
  name: string
  description: string
  image: string[]
  prepTime: string
  cookTime: string
  totalTime: string
  recipeYield: string
  recipeIngredient: string[]
  recipeInstructions: {
    '@type': string
    text: string
    position: number
  }[]
  author: { '@type': string; name: string }
  datePublished: string
  recipeCategory: string
  recipeCuisine: string
  keywords: string
}

interface ProductJsonLdInput {
  name: string
  description: string
  image: string
  price: number       // in cents (matches Product type)
  size: string
  slug: string
  inStock: boolean
  rating: number
}

export function sanitizeJsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c')
}

// ── Organization schema (used in root layout) ──────────────────────────
export function generateOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Jamaica House Brand',
    url: BASE_URL,
    logo: `${BASE_URL}/images/hummingbird-logo.png`,
    description: 'Authentic Jamaican jerk sauce crafted from Chef Anthony\'s 30-year family recipe. Zero calories, all natural ingredients.',
    foundingDate: '2024',
    founder: {
      '@type': 'Person',
      name: 'Chef Anthony',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'info@jamaicahousebrand.com',
      contactType: 'customer service',
    },
    sameAs: [
      'https://instagram.com/jamaicahousebrand',
      'https://www.facebook.com/p/Jamaica-House-Brand-61576084168596/',
      'https://www.tiktok.com/@jamaicahousebrand',
      'https://www.youtube.com/@JAMAICAHOUSEBRAND',
    ],
  }
}

// ── WebSite schema (enables sitelinks search box in Google) ────────────
export function generateWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Jamaica House Brand',
    url: BASE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/shop?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

// ── LocalBusiness schema (for restaurant locations) ────────────────────
interface RestaurantInput {
  name: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  image: string
}

export function generateLocalBusinessJsonLd(restaurant: RestaurantInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: restaurant.name,
    image: `${BASE_URL}${restaurant.image}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: restaurant.address,
      addressLocality: restaurant.city,
      addressRegion: restaurant.state,
      postalCode: restaurant.zip,
      addressCountry: 'US',
    },
    telephone: restaurant.phone,
    servesCuisine: 'Jamaican',
    priceRange: '$$',
    parentOrganization: {
      '@type': 'Organization',
      name: 'Jamaica House Brand',
      url: BASE_URL,
    },
  }
}

// ── BreadcrumbList schema ──────────────────────────────────────────────
interface BreadcrumbItem {
  name: string
  url: string
}

export function generateBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

// ── FAQ schema ─────────────────────────────────────────────────────────
interface FAQItem {
  question: string
  answer: string
}

export function generateFAQJsonLd(faqs: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

// ── ItemList schema (for shop/collection pages) ────────────────────────
interface ItemListProduct {
  name: string
  url: string
  image: string
  price: number // cents
}

export function generateItemListJsonLd(items: ItemListProduct[], listName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: item.url,
      name: item.name,
      image: `${BASE_URL}${item.image}`,
    })),
  }
}

// ── Recipe JSON-LD ─────────────────────────────────────────────────────
export function generateRecipeJsonLd(recipe: Recipe): RecipeJsonLd {
  const totalMinutes = recipe.prepTime + recipe.cookTime

  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    description: recipe.description,
    image: recipe.images,
    prepTime: `PT${recipe.prepTime}M`,
    cookTime: `PT${recipe.cookTime}M`,
    totalTime: `PT${totalMinutes}M`,
    recipeYield: `${recipe.servings} servings`,
    recipeIngredient: recipe.ingredients.map((ing) => `${ing.amount} ${ing.item}`),
    recipeInstructions: recipe.instructions.map((inst) => ({
      '@type': 'HowToStep',
      text: inst.text,
      position: inst.step,
    })),
    author: {
      '@type': 'Person',
      name: 'Chef Anthony',
    },
    datePublished: '2025-01-01',
    recipeCategory: 'Main Course',
    recipeCuisine: 'Jamaican',
    keywords: 'jamaican, jerk sauce, caribbean, authentic, jamaica house brand',
  }
}

// ── Product JSON-LD ────────────────────────────────────────────────────
export function generateProductJsonLd(input: ProductJsonLdInput) {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${input.name} - ${input.size}`,
    description: input.description,
    image: `${BASE_URL}${input.image}`,
    brand: {
      '@type': 'Brand',
      name: 'Jamaica House Brand',
    },
    sku: input.slug,
    mpn: input.slug,
    offers: {
      '@type': 'Offer',
      price: (input.price / 100).toFixed(2),
      priceCurrency: 'USD',
      availability: input.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${BASE_URL}/products/${input.slug}`,
      seller: {
        '@type': 'Organization',
        name: 'Jamaica House Brand',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'US',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 3,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 3,
            maxValue: 7,
            unitCode: 'DAY',
          },
        },
      },
    },
  }

  if (input.rating) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: input.rating.toString(),
      bestRating: '5',
      worstRating: '1',
      ratingCount: '47',
    }
  }

  return jsonLd
}
