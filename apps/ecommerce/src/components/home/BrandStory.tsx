import Link from 'next/link'
import Image from 'next/image'

export default function BrandStory() {
  return (
    <section className="py-16 sm:py-24 px-4 bg-brand-dark">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left column - Image placeholder */}
          <div className="relative aspect-square rounded-lg overflow-hidden">
            <Image
              src="/images/story/chef-anthony.jpg"
              alt="Chef Anthony"
              fill
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-brand-dark/80 to-transparent p-4">
              <p className="text-brand-gold font-semibold text-lg">
                Chef Anthony
              </p>
            </div>
          </div>

          {/* Right column - Story text */}
          <div>
            <p className="text-brand-gold uppercase tracking-widest text-sm mb-4">
              Our Story
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              From Our Kitchen to Yours
            </h2>
            <div className="text-gray-300 leading-relaxed space-y-4">
              <p>
                Chef Anthony grew up in his father&apos;s Jamaica House restaurants, where 30 years of authentic Jamaican cooking became a South Florida institution.
              </p>
              <p>
                When 92% of customers started asking to buy the sauce by the bottle, we knew it was time to extend the family legacy.
              </p>
              <p>
                Now we&apos;re bringing the same beloved recipes from the restaurant directly to your table.
              </p>
            </div>
            <Link
              href="/our-story"
              className="text-brand-gold hover:text-brand-gold-light font-medium mt-6 inline-block transition-colors"
            >
              Read Our Full Story
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
