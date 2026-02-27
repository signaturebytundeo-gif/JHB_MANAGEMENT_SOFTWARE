import Image from 'next/image'

interface StoryHeroProps {
  title: string
  subtitle: string
  image: string
}

export default function StoryHero({ title, subtitle, image }: StoryHeroProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <Image
        src={image}
        alt=""
        fill
        priority
        className="object-cover object-top"
        sizes="100vw"
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/80 via-brand-dark/50 to-brand-dark" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
          {title}
        </h1>
        <p className="text-xl md:text-2xl text-gray-300">
          {subtitle}
        </p>
      </div>
    </section>
  )
}
