import { Metadata } from 'next'
import { recipes } from '@/data/recipes'
import RecipeGrid from '@/components/recipes/RecipeGrid'

export const metadata: Metadata = {
  title: 'Recipes',
  description: 'Discover authentic Jamaican recipes featuring Jamaica House Brand sauces. From jerk chicken to escovitch fish, bring restaurant flavors to your kitchen.',
  openGraph: {
    title: 'Recipes - Jamaica House Brand',
    description: 'Authentic Jamaican recipes featuring our signature sauces.',
    images: ['/images/recipes/og-recipes.jpg'],
  },
}

export default function RecipesPage() {
  return (
    <main className="bg-brand-dark min-h-screen">
      {/* Hero Header Section */}
      <section className="py-24 px-4 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white">
          Recipes
        </h1>
        <p className="text-xl text-gray-300 mt-4 max-w-2xl mx-auto">
          Bring the authentic Jamaica House flavor to your kitchen
        </p>
      </section>

      {/* Recipe Grid Section */}
      <section className="max-w-7xl mx-auto px-4 pb-24">
        <RecipeGrid recipes={recipes} />
      </section>

      {/* Bottom CTA */}
      <section className="text-center pb-24 px-4">
        <p className="text-gray-400 text-lg">
          Want more recipes?{' '}
          <a
            href="https://instagram.com/jamaicahousebrand"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-gold hover:text-white transition-colors underline"
          >
            Follow us on Instagram
          </a>
        </p>
      </section>
    </main>
  )
}
