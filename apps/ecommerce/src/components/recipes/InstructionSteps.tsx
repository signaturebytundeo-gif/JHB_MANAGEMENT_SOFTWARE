import Image from 'next/image'
import { Instruction } from '@/types/recipe'

interface InstructionStepsProps {
  instructions: Instruction[]
}

export default function InstructionSteps({ instructions }: InstructionStepsProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-brand-gold mb-6">Instructions</h2>

      <ol className="space-y-6">
        {instructions.map((instruction) => (
          <li key={instruction.step} className="flex gap-4">
            {/* Step Number */}
            <div className="flex-shrink-0 w-10 h-10 bg-brand-gold text-brand-dark rounded-full flex items-center justify-center font-bold text-lg">
              {instruction.step}
            </div>

            {/* Step Content */}
            <div className="flex-1">
              <p className="text-gray-300 text-lg leading-relaxed">
                {instruction.text}
              </p>

              {/* Optional Step Image */}
              {instruction.image && (
                <div className="mt-4 relative aspect-video rounded-lg overflow-hidden">
                  <Image
                    src={instruction.image}
                    alt={`Step ${instruction.step}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
