import Link from 'next/link'
import Image from 'next/image'

export default function HeroSection() {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-brand-dark via-brand-dark to-brand-gold/10">
      {/* Background pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Eyebrow text */}
        <p className="text-brand-gold/60 uppercase tracking-[0.3em] text-sm mb-4">
          Since 1994
        </p>

        {/* Main headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
          30 Years of Flavor. One Legendary Sauce.
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-gray-300 mt-6 max-w-2xl mx-auto">
          Authentic Jamaican Jerk Sauce, Crafted from Chef Anthony&apos;s Family Recipe
        </p>

        {/* CTA button */}
        <Link
          href="/shop"
          className="inline-block bg-brand-gold text-brand-dark font-bold text-lg px-10 py-4 rounded-lg hover:bg-brand-gold-light transition-colors mt-8"
        >
          Shop Now
        </Link>

        {/* Decorative logo mark */}
        <div className="mt-8 flex justify-center">
          <Image
            src="/images/hummingbird-logo.svg"
            alt=""
            width={24}
            height={24}
            className="opacity-40"
          />
        </div>
      </div>
    </section>
  )
}
