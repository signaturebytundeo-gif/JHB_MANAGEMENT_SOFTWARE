import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getRecipeBySlug, recipes } from '@/data/recipes'
import { generateRecipeJsonLd, generateBreadcrumbJsonLd, sanitizeJsonLd } from '@/lib/seo'
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
    title: `${recipe.title} Recipe - Made with Jamaica House Brand Jerk Sauce`,
    description: `${recipe.description} Ready in ${recipe.prepTime + recipe.cookTime} minutes. Serves ${recipe.servings}.`,
    openGraph: {
      title: `${recipe.title} - Jamaica House Brand Recipe`,
      description: recipe.description,
      images: [{ url: recipe.image }],
    },
    alternates: {
      canonical: `https://jamaicahousebrand.com/recipes/${slug}`,
    },
  }
}

export default async function RecipePage({ params }: Props) {
  const { slug } = await params
  const recipe = getRecipeBySlug(slug)

  if (!recipe) {
    notFound()
  }

  // Generate schema.org Recipe JSON-LD + Breadcrumbs
  const recipeJsonLd = generateRecipeJsonLd(recipe)
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Home', url: 'https://jamaicahousebrand.com' },
    { name: 'Recipes', url: 'https://jamaicahousebrand.com/recipes' },
    { name: recipe.title, url: `https://jamaicahousebrand.com/recipes/${recipe.slug}` },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(recipeJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(breadcrumbJsonLd) }}
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
