import { Metadata } from 'next'
import StoryHero from '@/components/story/StoryHero'
import ScrollSection from '@/components/story/ScrollSection'
import TeamSection from '@/components/story/TeamSection'
import RestaurantLocations from '@/components/story/RestaurantLocations'
import StoryCTA from '@/components/story/StoryCTA'
import { storyContent } from '@/data/story-content'

export const metadata: Metadata = {
  title: 'Our Story',
  description:
    "From age 11 in Jamaica to three South Florida restaurants — discover how Chef Anthony's 30-year journey led to Jamaica House Brand's authentic jerk sauce.",
  openGraph: {
    title: 'Our Story - Jamaica House Brand',
    description: "Chef Anthony's journey from Jamaica to your table.",
    images: ['/images/story/hero.jpg'],
  },
}

export default function OurStoryPage() {
  return (
    <main className="bg-brand-dark">
      {/* Hero Section */}
      <StoryHero
        title={storyContent.hero.title}
        subtitle={storyContent.hero.subtitle}
        image={storyContent.hero.image}
      />

      {/* Chef Anthony's Origin Story */}
      <ScrollSection
        title={storyContent.sections[0].title}
        content={storyContent.sections[0].content}
        image={storyContent.sections[0].image}
        imageAlt={storyContent.sections[0].imageAlt}
        layout={storyContent.sections[0].layout}
      />

      {/* The Sauce Story */}
      <ScrollSection
        title={storyContent.sections[1].title}
        content={storyContent.sections[1].content}
        image={storyContent.sections[1].image}
        imageAlt={storyContent.sections[1].imageAlt}
        layout={storyContent.sections[1].layout}
      />

      {/* Team Section */}
      <TeamSection />

      {/* Restaurant Locations */}
      <RestaurantLocations />

      {/* CTA Section */}
      <StoryCTA />
    </main>
  )
}
