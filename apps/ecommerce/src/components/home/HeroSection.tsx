import Link from 'next/link'
import Image from 'next/image'

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center bg-gradient-to-br from-brand-dark via-brand-dark to-brand-gold/10 overflow-hidden">
      {/* Background pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Large faded logo watermark in background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Image
          src="/images/hummingbird-logo.png"
          alt=""
          width={600}
          height={600}
          className="opacity-[0.04] w-[400px] h-[400px] md:w-[600px] md:h-[600px]"
          priority
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Logo mark above headline */}
        <div className="flex justify-center mb-6">
          <Image
            src="/images/hummingbird-logo.png"
            alt="Jamaica House Brand"
            width={80}
            height={80}
            priority
            className="drop-shadow-lg"
          />
        </div>

        {/* Eyebrow text */}
        <p className="text-brand-gold/80 uppercase tracking-[0.3em] text-sm mb-4">
          Since 1994
        </p>

        {/* Main headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
          30 Years of Flavor.<br className="hidden sm:block" /> One Legendary Sauce.
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-gray-300 mt-6 max-w-2xl mx-auto">
          Authentic Jamaican Jerk Sauce, Born from 30 Years of Restaurant Legacy
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <Link
            href="/shop"
            className="inline-block bg-brand-gold text-brand-dark font-bold text-lg px-10 py-4 rounded-lg hover:bg-brand-gold-light transition-colors"
          >
            Shop Now
          </Link>
          <Link
            href="/our-story"
            className="inline-block border-2 border-brand-gold/50 text-brand-gold font-bold text-lg px-10 py-4 rounded-lg hover:bg-brand-gold/10 transition-colors"
          >
            Our Story
          </Link>
        </div>

        {/* Product lineup preview */}
        <div className="mt-12 flex justify-center">
          <div className="relative w-full max-w-md aspect-[3/2]">
            <Image
              src="/images/products/product-lineup.jpg"
              alt="Jamaica House Brand product lineup"
              fill
              className="object-contain drop-shadow-2xl"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-brand-dark to-transparent" />
    </section>
  )
}
