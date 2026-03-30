'use client'

import { useState, useEffect, useCallback } from 'react'

interface CarouselSlide {
  id: string
  platform: 'instagram' | 'tiktok' | 'youtube'
  embedUrl: string
  caption: string
}

function PlatformBadge({ platform }: { platform: CarouselSlide['platform'] }) {
  const config = {
    instagram: { label: 'Instagram', bg: 'bg-gradient-to-r from-purple-500 to-pink-500' },
    tiktok: { label: 'TikTok', bg: 'bg-gradient-to-r from-cyan-400 to-pink-500' },
    youtube: { label: 'YouTube', bg: 'bg-red-600' },
  }
  const { label, bg } = config[platform]
  return (
    <span className={`${bg} text-white text-xs font-bold px-2.5 py-1 rounded-full`}>
      {label}
    </span>
  )
}

function ArrowButton({ direction, onClick }: { direction: 'prev' | 'next'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-brand-dark/80 border border-brand-gold/20 text-white hover:bg-brand-dark hover:border-brand-gold/50 transition-all flex items-center justify-center backdrop-blur-sm"
      style={{ [direction === 'prev' ? 'left' : 'right']: '-20px' }}
      aria-label={direction === 'prev' ? 'Previous slide' : 'Next slide'}
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {direction === 'prev' ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        )}
      </svg>
    </button>
  )
}

export default function SocialCarousel({
  slides,
  autoPlay = true,
  interval = 6000,
  title,
  profileUrl,
  profileLabel,
}: {
  slides: CarouselSlide[]
  autoPlay?: boolean
  interval?: number
  title?: string
  profileUrl?: string
  profileLabel?: string
}) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length)
  }, [slides.length])

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length)
  }, [slides.length])

  // Auto-rotate
  useEffect(() => {
    if (!autoPlay || paused || slides.length <= 1) return
    const timer = setInterval(next, interval)
    return () => clearInterval(timer)
  }, [autoPlay, paused, interval, next, slides.length])

  if (slides.length === 0) return null

  const slide = slides[current]
  const isPlaceholder = slide.embedUrl.includes('PLACEHOLDER')

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          {profileUrl && (
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-gold hover:text-brand-gold/80 text-sm font-medium transition-colors"
            >
              {profileLabel || 'View All'} →
            </a>
          )}
        </div>
      )}

      {/* Carousel viewport */}
      <div className="relative overflow-hidden rounded-xl bg-white/5 border border-brand-gold/10">
        {/* Navigation arrows */}
        {slides.length > 1 && (
          <>
            <ArrowButton direction="prev" onClick={prev} />
            <ArrowButton direction="next" onClick={next} />
          </>
        )}

        {/* Slide content */}
        <div className="relative">
          {isPlaceholder ? (
            <div className="flex items-center justify-center p-12" style={{ minHeight: '320px' }}>
              <div className="text-center">
                <PlatformBadge platform={slide.platform} />
                <p className="text-gray-400 text-sm mt-3">{slide.caption}</p>
                <p className="text-gray-600 text-xs mt-2">
                  Replace PLACEHOLDER in social-media.ts with real post ID
                </p>
              </div>
            </div>
          ) : (
            <iframe
              key={slide.id}
              src={slide.embedUrl}
              width="100%"
              height={slide.platform === 'youtube' ? '400' : slide.platform === 'tiktok' ? '600' : '480'}
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
              loading="lazy"
              title={slide.caption}
              className="w-full"
            />
          )}
        </div>

        {/* Caption bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border-t border-brand-gold/10">
          <PlatformBadge platform={slide.platform} />
          <p className="text-gray-300 text-sm truncate flex-1">{slide.caption}</p>
          <span className="text-gray-500 text-xs shrink-0">
            {current + 1} / {slides.length}
          </span>
        </div>
      </div>

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === current
                  ? 'bg-brand-gold w-6'
                  : 'bg-white/20 hover:bg-white/40'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Auto-play indicator */}
      {autoPlay && slides.length > 1 && (
        <div className="flex justify-center mt-2">
          <span className="text-gray-600 text-xs">
            {paused ? 'Paused' : 'Auto-playing'} · Hover to pause
          </span>
        </div>
      )}
    </div>
  )
}
