export interface Ingredient {
  item: string
  amount: string
  notes?: string
}

export interface Instruction {
  step: number
  text: string
  image?: string
}

export interface Recipe {
  id: string
  slug: string
  title: string
  description: string
  image: string
  images: string[]
  prepTime: number // in minutes
  cookTime: number // in minutes
  servings: number
  difficulty: 'easy' | 'medium' | 'hard'
  ingredients: Ingredient[]
  instructions: Instruction[]
  featuredProducts: string[] // product IDs from products.ts
  tags: string[]
}
