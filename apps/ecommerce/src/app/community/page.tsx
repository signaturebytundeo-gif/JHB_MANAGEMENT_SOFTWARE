import { Metadata } from 'next'
import { featuredPosts, socialProfiles } from '@/data/social-media'
import { googleReviews, googleBusinessInfo } from '@/data/google-reviews'
import SocialCarousel from '@/components/social/SocialCarousel'
import StarRating from '@/components/ui/StarRating'
import { generateBreadcrumbJsonLd, sanitizeJsonLd } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Community - Follow Jamaica House Brand on Social Media',
  description: 'Follow Jamaica House Brand on Instagram, TikTok, and YouTube. Watch cooking tutorials, behind-the-scenes content, taste tests, and customer reviews. Join our growing Caribbean food community.',
  openGraph: {
    title: 'Community - Jamaica House Brand',
    description: 'Follow the flavor. Recipes, behind-the-scenes content, and customer reviews.',
  },
  alternates: {
    canonical: 'https://jamaicahousebrand.com/community',
  },
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-600'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export default function CommunityPage() {
  const instagramPosts = featuredPosts.filter((p) => p.platform === 'instagram')
  const tiktokPosts = featuredPosts.filter((p) => p.platform === 'tiktok')
  const youtubePosts = featuredPosts.filter((p) => p.platform === 'youtube')

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Home', url: 'https://jamaicahousebrand.com' },
    { name: 'Community', url: 'https://jamaicahousebrand.com/community' },
  ])

  return (
    <main className="bg-brand-dark min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(breadcrumbJsonLd) }}
      />

      {/* Hero */}
      <section className="pt-12 sm:pt-20 pb-12 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Join the JHB Community
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto text-lg">
          Follow along for recipes, behind-the-scenes content, and the latest from Jamaica House Brand
        </p>

        {/* Social follow buttons */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <a
            href={socialProfiles.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Instagram
          </a>
          <a
            href={socialProfiles.tiktok}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-400 to-pink-500 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
          >
            TikTok
          </a>
          <a
            href={socialProfiles.youtube}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
          >
            YouTube
          </a>
        </div>
      </section>

      {/* Google Reviews section */}
      <section className="py-12 px-4 border-t border-brand-gold/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <GoogleIcon />
            <h2 className="text-2xl md:text-3xl font-bold text-white">Google Reviews</h2>
            <div className="ml-auto flex items-center gap-2">
              <StarRating rating={googleBusinessInfo.averageRating} showValue />
              <span className="text-gray-400 text-sm hidden sm:inline">
                ({googleBusinessInfo.totalReviews} reviews)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {googleReviews.map((review) => (
              <div
                key={review.id}
                className="bg-white/5 border border-brand-gold/10 rounded-lg p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-gold font-bold text-sm">
                    {review.authorName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{review.authorName}</p>
                    <p className="text-gray-500 text-xs">{review.relativeTime}</p>
                  </div>
                  <div className="ml-auto">
                    <GoogleIcon />
                  </div>
                </div>
                <ReviewStars rating={review.rating} />
                <p className="text-gray-300 mt-3 text-sm leading-relaxed">{review.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* YouTube carousel */}
      <section className="py-12 px-4 border-t border-brand-gold/10">
        <div className="max-w-4xl mx-auto">
          <SocialCarousel
            slides={youtubePosts}
            title="YouTube"
            profileUrl={socialProfiles.youtube}
            profileLabel="Subscribe"
            autoPlay
            interval={8000}
          />
        </div>
      </section>

      {/* Instagram carousel */}
      <section className="py-12 px-4 border-t border-brand-gold/10">
        <div className="max-w-4xl mx-auto">
          <SocialCarousel
            slides={instagramPosts}
            title="Instagram"
            profileUrl={socialProfiles.instagram}
            profileLabel="Follow"
            autoPlay
            interval={6000}
          />
        </div>
      </section>

      {/* TikTok carousel */}
      <section className="py-12 px-4 border-t border-brand-gold/10">
        <div className="max-w-4xl mx-auto">
          <SocialCarousel
            slides={tiktokPosts}
            title="TikTok"
            profileUrl={socialProfiles.tiktok}
            profileLabel="Follow"
            autoPlay
            interval={7000}
          />
        </div>
      </section>
    </main>
  )
}
