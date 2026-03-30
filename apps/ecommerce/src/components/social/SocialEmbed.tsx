'use client'

import { useEffect, useRef, useState } from 'react'
import type { SocialPost } from '@/data/social-media'

function PlatformBadge({ platform }: { platform: SocialPost['platform'] }) {
  const config = {
    instagram: { label: 'Instagram', bg: 'bg-gradient-to-r from-purple-500 to-pink-500' },
    tiktok: { label: 'TikTok', bg: 'bg-gradient-to-r from-cyan-400 to-pink-500' },
    youtube: { label: 'YouTube', bg: 'bg-red-600' },
  }
  const { label, bg } = config[platform]
  return (
    <span className={`${bg} text-white text-xs font-medium px-2 py-0.5 rounded-full`}>
      {label}
    </span>
  )
}

function EmbedFrame({ post }: { post: SocialPost }) {
  const [loaded, setLoaded] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Platform-specific dimensions
  const dimensions = {
    instagram: { width: '100%', height: '480px' },
    tiktok: { width: '100%', height: '740px' },
    youtube: { width: '100%', height: '315px' },
  }

  const { width, height } = dimensions[post.platform]
  const isPlaceholder = post.embedUrl.includes('PLACEHOLDER')

  if (isPlaceholder) {
    return (
      <div
        className="bg-white/5 border border-dashed border-brand-gold/20 rounded-lg flex items-center justify-center"
        style={{ width, height: post.platform === 'youtube' ? '315px' : '300px' }}
      >
        <div className="text-center p-6">
          <PlatformBadge platform={post.platform} />
          <p className="text-gray-400 text-sm mt-3">{post.caption}</p>
          <p className="text-gray-600 text-xs mt-2">
            Replace PLACEHOLDER in social-media.ts with real post ID
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative rounded-lg overflow-hidden bg-white/5">
      {!loaded && (
        <div
          className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center"
          style={{ height }}
        >
          <div className="w-8 h-8 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={post.embedUrl}
        width={width}
        height={height}
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
        allowFullScreen
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        title={post.caption}
      />
    </div>
  )
}

export default function SocialEmbed({ post }: { post: SocialPost }) {
  return (
    <div className="group">
      <EmbedFrame post={post} />
      <div className="mt-3 flex items-center gap-2">
        <PlatformBadge platform={post.platform} />
        <p className="text-gray-400 text-sm truncate">{post.caption}</p>
      </div>
    </div>
  )
}
