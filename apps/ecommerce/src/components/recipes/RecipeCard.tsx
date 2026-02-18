import Link from 'next/link'
import Image from 'next/image'
import { Recipe } from '@/types/recipe'

interface RecipeCardProps {
  recipe: Recipe
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const totalTime = recipe.prepTime + recipe.cookTime

  const difficultyColors = {
    easy: 'bg-green-600 text-white',
    medium: 'bg-brand-gold text-brand-dark',
    hard: 'bg-red-600 text-white',
  }

  return (
    <Link
      href={`/recipes/${recipe.slug}`}
      className="group block"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
        <Image
          src={recipe.image}
          alt={recipe.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          quality={75}
          className="object-cover group-hover:scale-110 transition-transform duration-300"
        />

        {/* Difficulty Badge */}
        <div className="absolute top-3 right-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${difficultyColors[recipe.difficulty]}`}>
            {recipe.difficulty}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="mt-4">
        <h3 className="text-xl font-semibold text-white">
          {recipe.title}
        </h3>

        <p className="text-gray-400 mt-2 line-clamp-2">
          {recipe.description}
        </p>

        {/* Metadata */}
        <div className="flex gap-4 text-sm text-gray-500 mt-2">
          <span>{totalTime} min</span>
          <span>•</span>
          <span>{recipe.servings} servings</span>
        </div>
      </div>
    </Link>
  )
}
