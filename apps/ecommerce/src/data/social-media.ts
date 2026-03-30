export interface SocialPost {
  id: string
  platform: 'instagram' | 'tiktok' | 'youtube'
  embedUrl: string
  caption: string
  thumbnail?: string
}

// Social media profile URLs
export const socialProfiles = {
  instagram: 'https://instagram.com/jamaicahousebrand',
  tiktok: 'https://www.tiktok.com/@jamaicahousebrand',
  youtube: 'https://www.youtube.com/@JAMAICAHOUSEBRAND',
  facebook: 'https://www.facebook.com/p/Jamaica-House-Brand-61576084168596/',
}

// Featured social media posts to embed.
// To add a post: copy the embed URL from the platform's "Share > Embed" option.
//
// Instagram: https://www.instagram.com/p/{POST_ID}/embed
// TikTok: https://www.tiktok.com/embed/v2/{VIDEO_ID}
// YouTube: https://www.youtube.com/embed/{VIDEO_ID}
export const featuredPosts: SocialPost[] = [
  // ── Instagram Posts ──────────────────────────────────────────
  {
    id: 'ig-1',
    platform: 'instagram',
    embedUrl: 'https://www.instagram.com/p/PLACEHOLDER_1/embed',
    caption: 'Our Original Jerk Sauce — 30 years of flavor in every bottle',
  },
  {
    id: 'ig-2',
    platform: 'instagram',
    embedUrl: 'https://www.instagram.com/p/PLACEHOLDER_2/embed',
    caption: 'Behind the scenes at Jamaica House Restaurant',
  },
  {
    id: 'ig-3',
    platform: 'instagram',
    embedUrl: 'https://www.instagram.com/p/PLACEHOLDER_3/embed',
    caption: 'Chef Anthony crafting the perfect jerk marinade',
  },
  // ── TikTok Videos ────────────────────────────────────────────
  {
    id: 'tt-1',
    platform: 'tiktok',
    embedUrl: 'https://www.tiktok.com/embed/v2/PLACEHOLDER_1',
    caption: 'How we make our jerk sauce',
  },
  {
    id: 'tt-2',
    platform: 'tiktok',
    embedUrl: 'https://www.tiktok.com/embed/v2/PLACEHOLDER_2',
    caption: 'Taste test reaction',
  },
  // ── YouTube Videos ───────────────────────────────────────────
  {
    id: 'yt-1',
    platform: 'youtube',
    embedUrl: 'https://www.youtube.com/embed/PLACEHOLDER_1',
    caption: 'The Jamaica House Brand Story',
  },
  {
    id: 'yt-2',
    platform: 'youtube',
    embedUrl: 'https://www.youtube.com/embed/PLACEHOLDER_2',
    caption: 'Jerk Chicken Recipe with Original Sauce',
  },
]
