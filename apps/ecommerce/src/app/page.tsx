import { Metadata } from 'next'
import Image from 'next/image'
import HeroSection from '@/components/home/HeroSection'
import HomeProductGrid from '@/components/home/HomeProductGrid'
import BrandStory from '@/components/home/BrandStory'
import GoogleReviews from '@/components/home/GoogleReviews'
import SocialFeedPreview from '@/components/social/SocialFeedPreview'
import { generateFAQJsonLd, sanitizeJsonLd } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Jamaica House Brand - Authentic Jamaican Jerk Sauce | Shop Online',
  description: 'Authentic Jamaican jerk sauce crafted from Chef Anthony\'s 30-year family recipe. Zero calories, all natural, Scotch bonnet pepper sauce. Free shipping over $50. Shop our Original Jerk Sauce and Escovitch Pikliz.',
  openGraph: {
    title: 'Jamaica House Brand - Original Jerk Sauce | 30 Years of Flavor',
    description: 'Authentic Jamaican jerk sauce crafted from Chef Anthony\'s 30-year family recipe. Zero calories, all natural.',
    type: 'website',
    images: [{
      url: '/images/og-default.jpg',
      width: 1200,
      height: 630,
      alt: 'Jamaica House Brand Jerk Sauce Collection',
    }],
  },
  alternates: {
    canonical: 'https://jamaicahousebrand.com',
  },
}

const homepageFAQs = [
  {
    question: 'What makes Jamaica House Brand jerk sauce authentic?',
    answer: 'Our jerk sauce is crafted from Chef Anthony\'s 30-year family recipe, perfected across three Jamaica House restaurants in South Florida. It features traditional Jamaican ingredients including Scotch bonnet peppers, allspice, and thyme.',
  },
  {
    question: 'Is Jamaica House Brand jerk sauce zero calories?',
    answer: 'Yes! Our Original Jerk Sauce is zero calories, low sodium, and made with all natural ingredients. No artificial preservatives, colors, or flavors.',
  },
  {
    question: 'What sizes does the jerk sauce come in?',
    answer: 'Our Original Jerk Sauce is available in 2oz (travel/sample size), 5oz (everyday use), and 10oz (family size) bottles. We also offer 1-gallon containers for restaurant partners.',
  },
  {
    question: 'Do you offer free shipping?',
    answer: 'Yes, we offer free shipping on all orders over $50 within the United States.',
  },
  {
    question: 'What is Escovitch Pikliz?',
    answer: 'Our Escovitch Pikliz is a spicy Jamaican pickled vegetable relish made with habanero peppers, carrots, onions, and vinegar. It\'s the perfect accompaniment to jerk chicken, grilled meats, and seafood.',
  },
  {
    question: 'Can I visit your restaurants?',
    answer: 'Yes! We have Jamaica House restaurants in Miami (19555 NW 2nd Ave) and Fort Lauderdale (3351 W Broward Blvd), with a Miramar location coming soon.',
  },
]

function LogoDivider() {
  return (
    <div className="flex items-center justify-center gap-4 py-4">
      <div className="h-px w-16 bg-brand-gold/30" />
      <Image
        src="/images/hummingbird-logo.png"
        alt=""
        width={32}
        height={32}
        className="opacity-40"
      />
      <div className="h-px w-16 bg-brand-gold/30" />
    </div>
  )
}

export default function Home() {
  const faqJsonLd = generateFAQJsonLd(homepageFAQs)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(faqJsonLd) }}
      />
      <HeroSection />
      <LogoDivider />
      <HomeProductGrid />
      <LogoDivider />
      <BrandStory />
      <LogoDivider />
      <GoogleReviews />
      <LogoDivider />
      <SocialFeedPreview />
    </>
  )
}
