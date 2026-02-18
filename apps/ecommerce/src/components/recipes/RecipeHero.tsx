import Image from 'next/image'
import { Recipe } from '@/types/recipe'

interface RecipeHeroProps {
  recipe: Recipe
}

export default function RecipeHero({ recipe }: RecipeHeroProps) {
  const totalTime = recipe.prepTime + recipe.cookTime

  const difficultyColors = {
    easy: 'text-green-400',
    medium: 'text-brand-gold',
    hard: 'text-red-400',
  }

  return (
    <div className="relative h-[60vh] md:h-[70vh]">
      {/* Hero Image */}
      <Image
        src={recipe.image}
        alt={recipe.title}
        fill
        priority
        quality={85}
        sizes="100vw"
        className="object-cover"
      />

      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/50 to-transparent" />

      {/* Content at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
        <h1 className="text-4xl md:text-6xl font-bold text-white">
          {recipe.title}
        </h1>

        {/* Metadata */}
        <div className="flex gap-6 mt-4 text-gray-300">
          <span>Prep: {recipe.prepTime} min</span>
          <span>•</span>
          <span>Cook: {recipe.cookTime} min</span>
          <span>•</span>
          <span>Total: {totalTime} min</span>
          <span>•</span>
          <span>{recipe.servings} servings</span>
          <span>•</span>
          <span className={difficultyColors[recipe.difficulty]}>
            {recipe.difficulty}
          </span>
        </div>
      </div>
    </div>
  )
}
