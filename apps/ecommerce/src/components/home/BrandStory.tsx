import Link from 'next/link'
import Image from 'next/image'

export default function BrandStory() {
  return (
    <section className="py-16 sm:py-24 px-4 bg-brand-dark">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left column - Image placeholder */}
          <div className="aspect-square bg-gradient-to-br from-brand-gold/20 to-brand-gold/5 rounded-lg flex flex-col items-center justify-center">
            <Image
              src="/images/hummingbird-logo.svg"
              alt="Jamaica House Brand"
              width={120}
              height={120}
              className="opacity-60"
            />
            <p className="text-brand-gold font-semibold mt-4 text-lg">
              Chef Anthony
            </p>
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
                What started as Chef Anthony&apos;s secret recipe at his first South Florida restaurant quickly became legendary.
              </p>
              <p>
                When 92% of customers started asking to buy the sauce by the bottle, we knew we had something special.
              </p>
              <p>
                Three restaurants and 30 years later, we&apos;re bringing that same authentic Jamaican flavor directly to your table.
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
