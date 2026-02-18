'use client'

import { useState } from 'react'
import Image from 'next/image'

interface ImageGalleryProps {
  images: string[]
  productName: string
}

export default function ImageGallery({ images, productName }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const showThumbnails = images.length > 1

  return (
    <div>
      {/* Main Image */}
      <div className="relative aspect-square bg-white/5 rounded-lg overflow-hidden">
        <Image
          src={images[activeIndex]}
          alt={`${productName} - Image ${activeIndex + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority={activeIndex === 0}
        />
      </div>

      {/* Thumbnail Navigation */}
      {showThumbnails && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`relative aspect-square rounded overflow-hidden border-2 transition-colors ${
                activeIndex === index
                  ? 'border-brand-gold'
                  : 'border-transparent hover:border-brand-gold/40'
              }`}
              aria-label={`View image ${index + 1} of ${productName}`}
            >
              <Image
                src={image}
                alt={`${productName} thumbnail ${index + 1}`}
                fill
                sizes="25vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
