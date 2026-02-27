import { Metadata } from 'next'
import Image from 'next/image'
import HeroSection from '@/components/home/HeroSection'
import HomeProductGrid from '@/components/home/HomeProductGrid'
import BrandStory from '@/components/home/BrandStory'
import SocialProof from '@/components/home/SocialProof'

export const metadata: Metadata = {
  title: 'Jamaica House Brand - Original Jerk Sauce | 30 Years of Flavor',
  description: 'Authentic Jamaican jerk sauce crafted from Chef Anthony\'s 30-year family recipe. Shop our collection of all-natural, zero-calorie sauces.',
  openGraph: {
    title: 'Jamaica House Brand - Original Jerk Sauce',
    description: 'Authentic Jamaican jerk sauce crafted from Chef Anthony\'s 30-year family recipe.',
    type: 'website',
  },
}

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
  return (
    <>
      <HeroSection />
      <LogoDivider />
      <HomeProductGrid />
      <LogoDivider />
      <BrandStory />
      <LogoDivider />
      <SocialProof />
    </>
  )
}
