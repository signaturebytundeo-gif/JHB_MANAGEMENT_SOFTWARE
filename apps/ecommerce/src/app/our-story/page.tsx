import { Metadata } from 'next'
import StoryHero from '@/components/story/StoryHero'
import ScrollSection from '@/components/story/ScrollSection'
import TeamSection from '@/components/story/TeamSection'
import RestaurantLocations from '@/components/story/RestaurantLocations'
import StoryCTA from '@/components/story/StoryCTA'
import { storyContent } from '@/data/story-content'
import { restaurants } from '@/data/restaurants'
import { generateLocalBusinessJsonLd, generateBreadcrumbJsonLd, sanitizeJsonLd } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Our Story - Chef Anthony & 30 Years of Jamaican Flavor',
  description:
    "From three South Florida restaurants to your table — discover how Chef Anthony's 30-year family recipe became Jamaica House Brand's authentic jerk sauce. Visit our Miami and Fort Lauderdale locations.",
  openGraph: {
    title: 'Our Story - Jamaica House Brand',
    description: "Chef Anthony's 30-year journey from Jamaica House restaurants to bottled jerk sauce.",
    images: ['/images/story/hero.jpg'],
  },
  alternates: {
    canonical: 'https://jamaicahousebrand.com/our-story',
  },
}

export default function OurStoryPage() {
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Home', url: 'https://jamaicahousebrand.com' },
    { name: 'Our Story', url: 'https://jamaicahousebrand.com/our-story' },
  ])
  const activeRestaurants = restaurants.filter((r) => !r.comingSoon)

  return (
    <main className="bg-brand-dark">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(breadcrumbJsonLd) }}
      />
      {activeRestaurants.map((restaurant) => (
        <script
          key={restaurant.id}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: sanitizeJsonLd(generateLocalBusinessJsonLd(restaurant)),
          }}
        />
      ))}
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
