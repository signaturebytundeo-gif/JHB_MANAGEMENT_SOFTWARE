import { Recipe } from '@/types/recipe'

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
  }
}

export function generateProductJsonLd(input: ProductJsonLdInput) {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${input.name} - ${input.size}`,
    description: input.description,
    image: `https://jamaicahousebrand.com${input.image}`,
    brand: {
      '@type': 'Brand',
      name: 'Jamaica House Brand',
    },
    offers: {
      '@type': 'Offer',
      price: (input.price / 100).toFixed(2),
      priceCurrency: 'USD',
      availability: input.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `https://jamaicahousebrand.com/products/${input.slug}`,
      seller: {
        '@type': 'Organization',
        name: 'Jamaica House Brand',
      },
    },
  }

  if (input.rating) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: input.rating.toString(),
      bestRating: '5',
      worstRating: '1',
    }
  }

  return jsonLd
}
