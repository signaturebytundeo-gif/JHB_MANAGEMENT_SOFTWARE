import { Metadata } from 'next'
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

export default function Home() {
  return (
    <>
      <HeroSection />
      <HomeProductGrid />
      <BrandStory />
      <SocialProof />
    </>
  )
}
