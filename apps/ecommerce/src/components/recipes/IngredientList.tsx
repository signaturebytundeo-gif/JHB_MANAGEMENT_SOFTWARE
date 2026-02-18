import { Ingredient } from '@/types/recipe'

interface IngredientListProps {
  ingredients: Ingredient[]
}

export default function IngredientList({ ingredients }: IngredientListProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-brand-gold mb-6">Ingredients</h2>

      <ul className="space-y-2">
        {ingredients.map((ingredient, index) => (
          <li
            key={index}
            className="flex items-baseline gap-2 py-2 border-b border-white/10"
          >
            <span className="text-brand-gold font-medium">
              {ingredient.amount}
            </span>
            <span className="text-white">
              {ingredient.item}
            </span>
            {ingredient.notes && (
              <span className="text-gray-400 italic text-sm">
                ({ingredient.notes})
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
