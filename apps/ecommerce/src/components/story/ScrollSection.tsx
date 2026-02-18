'use client'

import { useInView } from 'react-intersection-observer'
import Image from 'next/image'

interface ScrollSectionProps {
  title: string
  content: string
  image: string
  imageAlt: string
  layout: 'text-left' | 'text-right' | 'centered'
}

export default function ScrollSection({
  title,
  content,
  image,
  imageAlt,
  layout
}: ScrollSectionProps) {
  const { ref, inView } = useInView({
    threshold: 0.3,
    triggerOnce: true,
  })

  if (layout === 'centered') {
    return (
      <section
        ref={ref}
        className={`min-h-[80vh] py-24 px-4 md:px-8 flex items-center transition-all duration-1000 ease-out ${
          inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-brand-gold mb-6">
            {title}
          </h2>
          <p className="text-lg md:text-xl text-gray-300 leading-relaxed mb-12">
            {content}
          </p>
          <div className="relative w-full aspect-video max-w-4xl mx-auto">
            <Image
              src={image}
              alt={imageAlt}
              fill
              className="object-cover rounded-lg"
              sizes="(max-width: 768px) 100vw, 1024px"
            />
          </div>
        </div>
      </section>
    )
  }

  const isTextLeft = layout === 'text-left'

  return (
    <section
      ref={ref}
      className={`min-h-[80vh] py-24 px-4 md:px-8 flex items-center transition-all duration-1000 ease-out ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
    >
      <div className={`max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center ${
        isTextLeft ? '' : 'md:grid-flow-dense'
      }`}>
        {/* Text Content */}
        <div className={isTextLeft ? 'md:order-1' : 'md:order-2'}>
          <h2 className="text-4xl md:text-5xl font-bold text-brand-gold mb-6">
            {title}
          </h2>
          <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
            {content}
          </p>
        </div>

        {/* Image */}
        <div className={`relative aspect-square ${isTextLeft ? 'md:order-2' : 'md:order-1'}`}>
          <Image
            src={image}
            alt={imageAlt}
            fill
            className="object-cover rounded-lg"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      </div>
    </section>
  )
}
