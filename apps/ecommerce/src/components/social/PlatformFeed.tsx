'use client'

import { useEffect, useRef } from 'react'
import { socialProfiles } from '@/data/social-media'

// ── Instagram Feed Widget ──────────────────────────────────────────
// Uses Instagram's oEmbed to show recent posts in an embedded timeline.
// Falls back to a follow CTA if embed doesn't load.
export function InstagramFeed() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load Instagram embed.js script
    const existing = document.querySelector('script[src*="instagram.com/embed.js"]')
    if (!existing) {
      const script = document.createElement('script')
      script.src = 'https://www.instagram.com/embed.js'
      script.async = true
      document.body.appendChild(script)
    } else {
      // Re-process embeds if script already loaded
      if (window.instgrm) {
        window.instgrm.Embeds.process()
      }
    }
  }, [])

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Instagram profile embed — shows latest posts */}
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={`${socialProfiles.instagram}/`}
        data-instgrm-version="14"
        style={{
          background: 'transparent',
          border: '1px solid rgba(212, 168, 67, 0.1)',
          borderRadius: '12px',
          margin: '0 auto',
          maxWidth: '540px',
          width: '100%',
          minHeight: '400px',
        }}
      />
    </div>
  )
}

// ── TikTok Feed Widget ─────────────────────────────────────────────
// Embeds the TikTok profile feed using their official embed script.
export function TikTokFeed() {
  useEffect(() => {
    const existing = document.querySelector('script[src*="tiktok.com/embed.js"]')
    if (!existing) {
      const script = document.createElement('script')
      script.src = 'https://www.tiktok.com/embed.js'
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  return (
    <div className="space-y-4">
      <blockquote
        className="tiktok-embed"
        cite={socialProfiles.tiktok}
        data-unique-id="jamaicahousebrand"
        data-embed-type="creator"
        style={{
          maxWidth: '780px',
          minWidth: '288px',
          margin: '0 auto',
        }}
      >
        <section>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={socialProfiles.tiktok}
            className="text-brand-gold"
          >
            @jamaicahousebrand
          </a>
        </section>
      </blockquote>
    </div>
  )
}

// ── YouTube Feed Widget ────────────────────────────────────────────
// Embeds YouTube channel's latest uploads as a playlist.
// Uses the channel page embed which shows recent videos.
export function YouTubeFeed({ channelId }: { channelId?: string }) {
  // If we have a channel ID, embed the uploads playlist (UU prefix)
  // Otherwise, embed the channel page
  const embedUrl = channelId
    ? `https://www.youtube.com/embed?listType=playlist&list=UU${channelId.replace('UC', '')}&autoplay=0`
    : `https://www.youtube.com/embed?listType=user_uploads&list=JAMAICAHOUSEBRAND`

  return (
    <div className="relative rounded-xl overflow-hidden bg-white/5 border border-brand-gold/10">
      <iframe
        src={embedUrl}
        width="100%"
        height="450"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        title="Jamaica House Brand YouTube Channel"
        className="w-full"
      />
    </div>
  )
}

// Type declaration for Instagram embed script
declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void
      }
    }
  }
}
