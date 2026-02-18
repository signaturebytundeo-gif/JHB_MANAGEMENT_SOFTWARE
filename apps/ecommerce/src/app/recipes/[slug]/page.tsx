import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getRecipeBySlug, recipes } from '@/data/recipes'
import { generateRecipeJsonLd, sanitizeJsonLd } from '@/lib/seo'
import RecipeHero from '@/components/recipes/RecipeHero'
import IngredientList from '@/components/recipes/IngredientList'
import InstructionSteps from '@/components/recipes/InstructionSteps'
import ShopTheSauceCTA from '@/components/recipes/ShopTheSauceCTA'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return recipes.map((recipe) => ({
    slug: recipe.slug,
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const recipe = getRecipeBySlug(slug)

  if (!recipe) {
    return {
      title: 'Recipe Not Found | Jamaica House Brand',
    }
  }

  return {
    title: `${recipe.title} - Jamaica House Brand Recipes`,
    description: recipe.description,
    openGraph: {
      title: `${recipe.title} - Jamaica House Brand`,
      description: recipe.description,
      images: [{ url: recipe.image }],
    },
  }
}

export default async function RecipePage({ params }: Props) {
  const { slug } = await params
  const recipe = getRecipeBySlug(slug)

  if (!recipe) {
    notFound()
  }

  // Generate schema.org Recipe JSON-LD
  const recipeJsonLd = generateRecipeJsonLd(recipe)

  return (
    <>
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(recipeJsonLd) }}
      />

      <main className="bg-brand-dark min-h-screen">
        {/* Hero Image */}
        <RecipeHero recipe={recipe} />

        {/* Recipe Content */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Two-column layout on desktop */}
          <div className="md:grid md:grid-cols-[1fr_2fr] gap-12">
            {/* Left column: Ingredients */}
            <div>
              <IngredientList ingredients={recipe.ingredients} />
            </div>

            {/* Right column: Instructions */}
            <div>
              <InstructionSteps instructions={recipe.instructions} />
            </div>
          </div>

          {/* Shop CTA */}
          <ShopTheSauceCTA productIds={recipe.featuredProducts} />
        </div>
      </main>
    </>
  )
}
