'use client'

import Link from 'next/link'
import { socialProfiles, featuredPosts } from '@/data/social-media'
import SocialCarousel from './SocialCarousel'

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className || 'w-6 h-6'} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  )
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className || 'w-6 h-6'} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13a8.28 8.28 0 005.58 2.16V11.7a4.83 4.83 0 01-3.77-1.24V6.69h3.77z"/>
    </svg>
  )
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className || 'w-6 h-6'} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  )
}

const platforms = [
  {
    name: 'Instagram',
    icon: InstagramIcon,
    url: socialProfiles.instagram,
    handle: '@jamaicahousebrand',
    color: 'from-purple-500 to-pink-500',
    hoverBorder: 'hover:border-pink-500/40',
    description: 'Behind the scenes, new drops, and customer features',
  },
  {
    name: 'TikTok',
    icon: TikTokIcon,
    url: socialProfiles.tiktok,
    handle: '@jamaicahousebrand',
    color: 'from-cyan-400 to-pink-500',
    hoverBorder: 'hover:border-cyan-400/40',
    description: 'Recipes, taste tests, and cooking tips',
  },
  {
    name: 'YouTube',
    icon: YouTubeIcon,
    url: socialProfiles.youtube,
    handle: '@JAMAICAHOUSEBRAND',
    color: 'from-red-500 to-red-700',
    hoverBorder: 'hover:border-red-500/40',
    description: 'Full cooking tutorials and brand story',
  },
]

export default function SocialFeedPreview() {
  // Mix all posts into one carousel that rotates through platforms
  const allSlides = featuredPosts.map((post) => ({
    id: post.id,
    platform: post.platform,
    embedUrl: post.embedUrl,
    caption: post.caption,
  }))

  return (
    <section className="py-16 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Follow the Flavor
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto">
            Join our community for recipes, behind-the-scenes content, and exclusive drops
          </p>
        </div>

        {/* Auto-rotating carousel of social content */}
        <div className="max-w-3xl mx-auto mb-12">
          <SocialCarousel
            slides={allSlides}
            autoPlay
            interval={5000}
          />
        </div>

        {/* Platform follow cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {platforms.map((platform) => (
            <a
              key={platform.name}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group bg-white/5 border border-brand-gold/10 ${platform.hoverBorder} rounded-lg p-6 transition-all duration-300 hover:bg-white/[0.07]`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${platform.color} flex items-center justify-center`}>
                  <platform.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{platform.name}</p>
                  <p className="text-gray-500 text-xs">{platform.handle}</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm">{platform.description}</p>
              <div className="mt-4 flex items-center gap-1 text-brand-gold text-sm font-medium group-hover:gap-2 transition-all">
                Follow
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </a>
          ))}
        </div>

        {/* Link to full community page */}
        <div className="text-center">
          <Link
            href="/community"
            className="inline-flex items-center gap-2 bg-brand-gold/10 border border-brand-gold/20 text-brand-gold px-6 py-3 rounded-lg hover:bg-brand-gold/20 transition-colors font-medium text-sm"
          >
            View All Content
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
