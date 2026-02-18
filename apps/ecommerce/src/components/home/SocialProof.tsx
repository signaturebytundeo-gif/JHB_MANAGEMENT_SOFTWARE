import { testimonials } from '@/data/testimonials'
import StarRating from '@/components/ui/StarRating'

export default function SocialProof() {
  return (
    <section className="py-16 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
          What Our Customers Say
        </h2>

        {/* Testimonial grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-white/5 border border-brand-gold/10 rounded-lg p-6"
            >
              <StarRating rating={testimonial.rating} showValue={false} />
              <blockquote className="text-gray-300 italic mt-4 leading-relaxed">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <div className="mt-4">
                <p className="text-white font-semibold">{testimonial.name}</p>
                {testimonial.location && (
                  <p className="text-gray-500 text-sm">{testimonial.location}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
