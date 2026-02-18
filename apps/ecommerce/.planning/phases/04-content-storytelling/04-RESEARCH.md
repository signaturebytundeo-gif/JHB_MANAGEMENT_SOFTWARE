# Phase 04: Content & Storytelling - Research

**Researched:** 2026-02-17
**Domain:** Content presentation, scroll-driven animations, recipe structured data, storytelling layouts
**Confidence:** HIGH

## Summary

Phase 4 requires building two narrative-driven content sections: an Our Story page with cinematic scroll effects and a Recipes section with structured recipe data. The research reveals a mature ecosystem for implementing scroll-triggered animations using Motion (formerly Framer Motion) combined with Next.js Server Components, TypeScript-based content models, and JSON-LD structured data for SEO.

The key technical challenge is balancing cinematic scroll effects (which require client-side JavaScript) with Next.js App Router's server-first philosophy. Best practice is to use Server Components for layout and data fetching, with targeted Client Components for scroll-triggered animations using Motion's `whileInView` prop.

For recipe data, the standard approach is TypeScript files with structured ingredient/step models paired with JSON-LD markup for Google rich results. This aligns perfectly with the existing product data pattern already established in Phase 3.

**Primary recommendation:** Use Motion (framer-motion) v12.34+ for scroll animations with `whileInView` for story page reveals, TypeScript files for recipe data matching the existing products pattern, and Next.js Image component with quality optimization for food photography.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| framer-motion | 12.34.1+ | Scroll-triggered animations | Industry standard for React animations, runs off main thread, excellent Next.js SSR support |
| Next.js Image | Built-in | Food photography optimization | Automatic WebP conversion, lazy loading, responsive sizes - reduces image payload 80% |
| schema-dts | Latest | TypeScript JSON-LD types | Type-safe structured data for Recipe schema |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-intersection-observer | 10.0.2+ | Lightweight scroll detection | Alternative to Motion if only need scroll detection without animations |
| clsx | Already installed | Conditional animation classes | Combining base + animated state classes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| framer-motion | CSS View Timeline API | Native browser API but limited support (Chrome 115+), lacks complex orchestration |
| framer-motion | react-spring | Physics-based animations but heavier bundle, steeper learning curve |
| TypeScript files | MDX | Better for blog-like content but overkill for structured recipe data |
| TypeScript files | CMS (Contentful/Sanity) | Better for editorial teams but adds complexity, external dependency for 6-8 recipes |

**Installation:**
```bash
npm install framer-motion schema-dts
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── story/
│   │   └── page.tsx              # Server Component - data fetch + layout
│   ├── recipes/
│   │   ├── page.tsx              # Recipe grid - Server Component
│   │   └── [slug]/
│   │       └── page.tsx          # Recipe detail with JSON-LD
├── components/
│   ├── story/
│   │   ├── ScrollSection.tsx     # Client Component - Motion animations
│   │   ├── TeamBio.tsx           # Client Component - whileInView reveals
│   │   └── RestaurantLocations.tsx
│   ├── recipe/
│   │   ├── RecipeCard.tsx
│   │   ├── RecipeHero.tsx
│   │   └── RecipeSchema.tsx      # JSON-LD wrapper
├── data/
│   ├── story.ts                  # TypeScript: Chef story, team, locations
│   └── recipes.ts                # TypeScript: Recipe data with structured ingredients/steps
└── types/
    ├── story.ts
    └── recipe.ts
```

### Pattern 1: Server Component + Client Animation Islands

**What:** Keep pages as Server Components for data fetching, wrap only animated sections in Client Components

**When to use:** All scroll-triggered animations (Story page sections, recipe card reveals)

**Example:**
```typescript
// app/story/page.tsx (Server Component)
import { storyContent } from '@/data/story'
import { ScrollSection } from '@/components/story/ScrollSection'

export default function StoryPage() {
  return (
    <main>
      {/* Static header - no client JS */}
      <h1>{storyContent.title}</h1>

      {/* Animated section - Client Component */}
      <ScrollSection content={storyContent.chefOrigin} />
      <ScrollSection content={storyContent.sauceStory} />
    </main>
  )
}
```

```typescript
// components/story/ScrollSection.tsx (Client Component)
'use client'
import { motion } from 'framer-motion'

export function ScrollSection({ content }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      {content}
    </motion.section>
  )
}
```

### Pattern 2: TypeScript Recipe Data Model

**What:** Structured TypeScript files for recipe data with typed ingredients and steps

**When to use:** Recipe content that needs programmatic access, JSON-LD generation, ingredient search

**Example:**
```typescript
// types/recipe.ts
export interface Recipe {
  id: string
  slug: string
  name: string
  description: string
  image: string
  prepTime: number        // minutes
  cookTime: number        // minutes
  totalTime: number       // minutes
  servings: number
  cuisine: 'Jamaican'
  category: 'Main Course' | 'Side Dish' | 'Appetizer'
  ingredients: Ingredient[]
  instructions: Step[]
  featuredProduct: string  // product ID from products.ts
  rating: number
  keywords: string[]
}

export interface Ingredient {
  amount: string
  unit: string
  item: string
  notes?: string
}

export interface Step {
  number: number
  instruction: string
  image?: string
}
```

```typescript
// data/recipes.ts
import { Recipe } from '@/types/recipe'

export const recipes: Recipe[] = [
  {
    id: 'jerk-chicken',
    slug: 'jerk-chicken',
    name: 'Authentic Jerk Chicken',
    description: 'Traditional Jamaican jerk chicken marinated in our signature sauce',
    image: '/images/recipes/jerk-chicken.jpg',
    prepTime: 20,
    cookTime: 40,
    totalTime: 60,
    servings: 4,
    cuisine: 'Jamaican',
    category: 'Main Course',
    ingredients: [
      { amount: '4', unit: 'pieces', item: 'chicken thighs' },
      { amount: '1/2', unit: 'cup', item: 'Jamaica House Brand Original Jerk Sauce' },
      { amount: '2', unit: 'tbsp', item: 'olive oil' },
    ],
    instructions: [
      { number: 1, instruction: 'Marinate chicken with jerk sauce for 2 hours' },
      { number: 2, instruction: 'Preheat grill to medium-high heat' },
      { number: 3, instruction: 'Grill chicken 20 minutes per side until internal temp reaches 165°F' },
    ],
    featuredProduct: 'jerk-sauce-5oz',
    rating: 4.9,
    keywords: ['chicken', 'jerk', 'grilled', 'jamaican'],
  },
]

export function getRecipeBySlug(slug: string): Recipe | undefined {
  return recipes.find((r) => r.slug === slug)
}
```

### Pattern 3: JSON-LD for Recipe SEO

**What:** Add structured data to recipe detail pages for Google rich results

**When to use:** Every recipe detail page to enable ingredient search, cooking time filters in Google

**Example:**
```typescript
// app/recipes/[slug]/page.tsx
import { getRecipeBySlug } from '@/data/recipes'
import { WithContext, Recipe as RecipeSchema } from 'schema-dts'

export default async function RecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const recipe = getRecipeBySlug(slug)

  if (!recipe) notFound()

  const jsonLd: WithContext<RecipeSchema> = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.name,
    image: [recipe.image],
    description: recipe.description,
    prepTime: `PT${recipe.prepTime}M`,
    cookTime: `PT${recipe.cookTime}M`,
    totalTime: `PT${recipe.totalTime}M`,
    recipeYield: `${recipe.servings} servings`,
    recipeIngredient: recipe.ingredients.map(
      (i) => `${i.amount} ${i.unit} ${i.item}`
    ),
    recipeInstructions: recipe.instructions.map((s) => ({
      '@type': 'HowToStep',
      text: s.instruction,
    })),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: recipe.rating,
      ratingCount: 47,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <RecipeDetail recipe={recipe} />
    </>
  )
}
```

### Pattern 4: Motion whileInView Configuration

**What:** Consistent animation settings for scroll-triggered reveals

**When to use:** Story sections, team bios, recipe cards, location cards

**Example:**
```typescript
// lib/animations.ts
export const fadeInUp = {
  initial: { opacity: 0, y: 50 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.8, ease: 'easeOut' },
}

export const fadeInLeft = {
  initial: { opacity: 0, x: -50 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.8, ease: 'easeOut' },
}

export const staggerChildren = {
  whileInView: 'visible',
  viewport: { once: true, amount: 0.2 },
  variants: {
    visible: {
      transition: {
        staggerChildren: 0.2,
      },
    },
  },
}
```

```typescript
// components/story/TeamSection.tsx
'use client'
import { motion } from 'framer-motion'
import { staggerChildren, fadeInUp } from '@/lib/animations'

export function TeamSection({ team }) {
  return (
    <motion.div className="grid grid-cols-3 gap-8" {...staggerChildren}>
      {team.map((member) => (
        <motion.div key={member.id} {...fadeInUp}>
          <img src={member.image} alt={member.name} />
          <h3>{member.name}</h3>
          <p>{member.role}</p>
          <p>{member.bio}</p>
        </motion.div>
      ))}
    </motion.div>
  )
}
```

### Anti-Patterns to Avoid

- **Animating every element:** Creates visual chaos and performance issues - animate strategically (hero, key sections, CTAs)
- **Making entire page a Client Component:** Loses Server Component benefits - wrap only animated sections with `'use client'`
- **Unstructured recipe text:** Prevents ingredient search, programmatic access - always use typed ingredient/step arrays
- **Missing `viewport={{ once: true }}`:** Animations retrigger on scroll up/down causing janky experience
- **Animating width/height:** Causes layout recalculations - stick to transforms (x, y) and opacity
- **Too many parallax layers:** More than 2-3 layers feels gimmicky in 2026 - subtle > dramatic

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scroll detection | Custom scroll listeners with `window.addEventListener` | Motion `whileInView` or `react-intersection-observer` | Your implementation won't handle passive listeners, root margins, threshold tuning, or cleanup correctly |
| Animation orchestration | Manual state management + CSS transitions for sequencing | Motion variants with `staggerChildren` | Edge cases: interrupted animations, reduced-motion preferences, cleanup on unmount |
| Recipe structured data | Manually writing JSON-LD strings | `schema-dts` with TypeScript types | Missing required properties, incorrect ISO 8601 duration format, typos in schema.org URLs |
| Image optimization | `<img>` tags with manual srcset | Next.js `<Image>` component | Automatic format selection (WebP/AVIF), responsive sizes, lazy loading, blur placeholders - 80% size reduction |
| Parallax scrolling | Manual `window.scrollY` calculations | Motion `useScroll` with `useTransform` | Doesn't account for scroll containers, resize events, transform origin, will-change optimization |

**Key insight:** Scroll animations have deceptively complex edge cases (SSR hydration, cleanup, performance, accessibility). Motion handles these with battle-tested solutions. Recipe SEO requires exact JSON-LD structure - schema-dts provides compile-time safety.

## Common Pitfalls

### Pitfall 1: Hydration Mismatch with Animations

**What goes wrong:** Client-side animations run before hydration completes, causing "Text content does not match server-rendered HTML" errors

**Why it happens:** Motion components with `initial` state render differently on server vs. client

**How to avoid:**
- Use `viewport={{ once: true }}` to prevent re-animation
- For critical animations, consider `initial={false}` and trigger on mount
- Ensure Client Component boundary is clear with `'use client'` directive

**Warning signs:** Console errors about hydration mismatch, flash of unstyled content (FOUC), animations firing immediately on page load

### Pitfall 2: Too Many Client Components

**What goes wrong:** Entire story page becomes a Client Component, losing SSR benefits, increasing bundle size

**Why it happens:** Developer adds `'use client'` to parent component instead of isolating animated sections

**How to avoid:**
- Keep `app/story/page.tsx` as Server Component
- Extract animated sections into separate Client Components
- Pass data as props from Server to Client Components

**Warning signs:** "use client" directive at top of page files, large client bundle, slow Time to Interactive

### Pitfall 3: Poor Animation Performance

**What goes wrong:** Janky scroll animations, low frame rate, especially on mobile

**Why it happens:** Animating layout properties (width, height, top, left) instead of transforms

**How to avoid:**
- Only animate `opacity`, `x`, `y`, `scale`, `rotate`
- Use `transform` instead of `top/left`
- Test on low-end devices (throttle CPU 6x in Chrome DevTools)
- Add `layoutId` only when necessary (layout animations are expensive)

**Warning signs:** Frame rate drops below 60fps, janky scroll, users report sluggish experience

### Pitfall 4: Recipe Data Without Structured Ingredients

**What goes wrong:** Ingredients stored as plain text strings, impossible to build features like ingredient search, shopping lists, or dietary filters

**Why it happens:** Developer treats recipes like blog posts instead of structured data

**How to avoid:**
- Always use typed `Ingredient[]` arrays with `amount`, `unit`, `item` fields
- Same for `Step[]` with numbered instructions
- This enables JSON-LD generation, programmatic features, and future scaling

**Warning signs:** Recipe content in markdown files, ingredients as single string, no ability to filter by ingredient

### Pitfall 5: CTA Placement Too Early

**What goes wrong:** "Shop the sauce" CTA appears before user is invested in the recipe

**Why it happens:** Following e-commerce patterns instead of content patterns

**How to avoid:**
- CTA should appear AFTER hero image and ingredient list
- Best placement: between ingredients and instructions, or after instructions
- On Story page: CTA at very end after all narrative content

**Warning signs:** High bounce rate on recipe pages, low CTA click-through, users skip to Shop page directly

### Pitfall 6: Missing Image Optimization

**What goes wrong:** Recipe and story pages load slowly due to unoptimized food photography (1.5MB+ images)

**Why it happens:** Designer exports high-res JPGs, developer uses `<img>` tags directly

**How to avoid:**
- Always use Next.js `<Image>` component
- Set `quality={85}` for hero images (default 75 is too low for food photography)
- Add quality allowlist to `next.config.js`: `images: { allowedQualities: [75, 85, 90] }`
- Use `priority` for above-fold hero images, lazy load everything else

**Warning signs:** Lighthouse scores below 80, LCP > 2.5s, users on mobile complain about loading

### Pitfall 7: Animation Overload

**What goes wrong:** Every section, every card, every element animates - feels like a 2010 Flash site

**Why it happens:** Developer discovers `whileInView` and applies it everywhere

**How to avoid:**
- Animate strategically: hero section, major content sections, CTAs
- Skip animations for repeated elements (ingredient list items, instruction steps)
- In 2026, subtle > dramatic - use once: true and gentle easing

**Warning signs:** Users complain about "too much movement", accessibility concerns, feels dated

## Code Examples

Verified patterns from official sources and current best practices:

### Story Page with Scroll Sections

```typescript
// app/story/page.tsx (Server Component)
import { storyContent, team, locations } from '@/data/story'
import { ScrollSection } from '@/components/story/ScrollSection'
import { TeamGrid } from '@/components/story/TeamGrid'
import { LocationsSection } from '@/components/story/LocationsSection'

export const metadata = {
  title: 'Our Story | Jamaica House Brand',
  description: "Chef Anthony's journey from age 11 to 3 restaurants and a beloved sauce brand",
}

export default function StoryPage() {
  return (
    <main className="bg-neutral-900">
      {/* Hero - static, no animation */}
      <section className="min-h-screen flex items-center justify-center">
        <h1 className="text-6xl font-bold text-gold">Our Story</h1>
      </section>

      {/* Chef Origin Story - animated reveal */}
      <ScrollSection
        title="From Age 11 to Three Restaurants"
        content={storyContent.chefOrigin}
        image="/images/story/chef-young.jpg"
        imageAlt="Young Chef Anthony"
      />

      {/* Sauce Story - animated reveal */}
      <ScrollSection
        title="The Sauce Story"
        content={storyContent.sauceOrigin}
        image="/images/story/sauce-bottling.jpg"
        imageAlt="Bottling the sauce"
        reverse
      />

      {/* Team Section - staggered reveal */}
      <TeamGrid members={team} />

      {/* Locations - animated reveal */}
      <LocationsSection locations={locations} />

      {/* CTA - at very end */}
      <section className="py-24 text-center">
        <h2 className="text-4xl font-bold mb-8">Taste the Story</h2>
        <a
          href="/shop"
          className="inline-block bg-gold text-neutral-900 px-8 py-4 text-lg font-semibold"
        >
          Shop Our Sauces
        </a>
      </section>
    </main>
  )
}
```

### Scroll Section Component with Motion

```typescript
// components/story/ScrollSection.tsx (Client Component)
'use client'
import { motion } from 'framer-motion'
import Image from 'next/image'

interface ScrollSectionProps {
  title: string
  content: string
  image: string
  imageAlt: string
  reverse?: boolean
}

export function ScrollSection({ title, content, image, imageAlt, reverse }: ScrollSectionProps) {
  return (
    <section className="min-h-screen flex items-center py-24">
      <div className={`container mx-auto grid grid-cols-2 gap-16 ${reverse ? 'flex-row-reverse' : ''}`}>
        {/* Text content */}
        <motion.div
          initial={{ opacity: 0, x: reverse ? 50 : -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <h2 className="text-5xl font-bold text-gold mb-6">{title}</h2>
          <p className="text-xl text-neutral-300 leading-relaxed">{content}</p>
        </motion.div>

        {/* Image */}
        <motion.div
          initial={{ opacity: 0, x: reverse ? -50 : 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className="relative aspect-[4/3]"
        >
          <Image
            src={image}
            alt={imageAlt}
            fill
            className="object-cover"
            quality={85}
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </motion.div>
      </div>
    </section>
  )
}
```

### Team Grid with Staggered Animation

```typescript
// components/story/TeamGrid.tsx (Client Component)
'use client'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { TeamMember } from '@/types/story'

interface TeamGridProps {
  members: TeamMember[]
}

export function TeamGrid({ members }: TeamGridProps) {
  return (
    <section className="py-24 bg-neutral-800">
      <div className="container mx-auto">
        <h2 className="text-5xl font-bold text-gold text-center mb-16">Meet the Team</h2>

        <motion.div
          className="grid grid-cols-3 gap-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.2,
              },
            },
          }}
        >
          {members.map((member) => (
            <motion.div
              key={member.id}
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <div className="relative aspect-square mb-6 overflow-hidden rounded-lg">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  className="object-cover"
                  quality={85}
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <h3 className="text-2xl font-bold text-gold">{member.name}</h3>
              <p className="text-sm text-neutral-400 mb-4">{member.role}</p>
              <p className="text-neutral-300">{member.bio}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
```

### Recipe Card Grid

```typescript
// app/recipes/page.tsx (Server Component)
import { recipes } from '@/data/recipes'
import { RecipeCard } from '@/components/recipe/RecipeCard'

export const metadata = {
  title: 'Recipes | Jamaica House Brand',
  description: 'Authentic Jamaican recipes featuring our signature sauces',
}

export default function RecipesPage() {
  return (
    <main className="bg-neutral-900 py-24">
      <div className="container mx-auto">
        <h1 className="text-6xl font-bold text-gold text-center mb-16">
          Recipes
        </h1>

        <div className="grid grid-cols-3 gap-8">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      </div>
    </main>
  )
}
```

### Recipe Detail with JSON-LD

```typescript
// app/recipes/[slug]/page.tsx (Server Component)
import { notFound } from 'next/navigation'
import { getRecipeBySlug, recipes } from '@/data/recipes'
import { getProductById } from '@/data/products'
import { RecipeHero } from '@/components/recipe/RecipeHero'
import { IngredientList } from '@/components/recipe/IngredientList'
import { InstructionSteps } from '@/components/recipe/InstructionSteps'
import { ProductCTA } from '@/components/recipe/ProductCTA'
import type { WithContext, Recipe as RecipeSchema } from 'schema-dts'

export async function generateStaticParams() {
  return recipes.map((recipe) => ({
    slug: recipe.slug,
  }))
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const recipe = getRecipeBySlug(slug)

  if (!recipe) {
    notFound()
  }

  const featuredProduct = getProductById(recipe.featuredProduct)

  // Generate JSON-LD for Google rich results
  const jsonLd: WithContext<RecipeSchema> = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.name,
    image: [recipe.image],
    description: recipe.description,
    prepTime: `PT${recipe.prepTime}M`,
    cookTime: `PT${recipe.cookTime}M`,
    totalTime: `PT${recipe.totalTime}M`,
    recipeYield: `${recipe.servings} servings`,
    recipeCuisine: recipe.cuisine,
    recipeCategory: recipe.category,
    keywords: recipe.keywords.join(', '),
    recipeIngredient: recipe.ingredients.map(
      (i) => `${i.amount} ${i.unit} ${i.item}${i.notes ? ` (${i.notes})` : ''}`
    ),
    recipeInstructions: recipe.instructions.map((step) => ({
      '@type': 'HowToStep',
      position: step.number,
      text: step.instruction,
    })),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: recipe.rating,
      ratingCount: 47, // Would come from database in real app
    },
  }

  return (
    <>
      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <main className="bg-neutral-900">
        {/* Hero image */}
        <RecipeHero recipe={recipe} />

        {/* Recipe details */}
        <div className="container mx-auto py-16 grid grid-cols-3 gap-12">
          {/* Sidebar: Ingredients + CTA */}
          <div className="col-span-1">
            <IngredientList ingredients={recipe.ingredients} />

            {featuredProduct && (
              <ProductCTA
                product={featuredProduct}
                recipeName={recipe.name}
              />
            )}
          </div>

          {/* Main: Instructions */}
          <div className="col-span-2">
            <InstructionSteps steps={recipe.instructions} />
          </div>
        </div>
      </main>
    </>
  )
}
```

### Story Data Structure

```typescript
// types/story.ts
export interface TeamMember {
  id: string
  name: string
  role: string
  bio: string
  image: string
}

export interface Location {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  hours: string
  image: string
}

export interface StoryContent {
  chefOrigin: string
  sauceOrigin: string
}
```

```typescript
// data/story.ts
import { TeamMember, Location, StoryContent } from '@/types/story'

export const storyContent: StoryContent = {
  chefOrigin: `Chef Anthony discovered his passion for cooking at age 11, learning traditional Jamaican techniques from his grandmother. Over three decades, he built three successful restaurants across South Florida, each becoming a beloved destination for authentic Caribbean cuisine. The restaurant customers didn't just come for the food—they came for the experience, the flavors, and most of all, the sauce.`,

  sauceOrigin: `When 92% of restaurant customers asked to bottle the jerk sauce to take home, Chef Anthony knew he had something special. What started as a family recipe passed down through generations became the foundation of Jamaica House Brand. Each bottle captures the same authentic flavors that made the restaurants legendary—crafted with care, tradition, and the same commitment to quality that Chef Anthony brought to every dish.`,
}

export const team: TeamMember[] = [
  {
    id: 'chef-anthony',
    name: 'Chef Anthony',
    role: 'Founder & Head Chef',
    bio: 'With 30 years of culinary experience, Chef Anthony brings authentic Jamaican flavors to every bottle.',
    image: '/images/team/chef-anthony.jpg',
  },
  {
    id: 'tunde',
    name: 'Tunde',
    role: 'Co-Founder & Operations',
    bio: 'Tunde oversees production and ensures every batch meets Chef Anthony\'s exacting standards.',
    image: '/images/team/tunde.jpg',
  },
  {
    id: 'tomi',
    name: 'Tomi',
    role: 'Brand Director',
    bio: 'Tomi leads brand strategy and brings the Jamaica House Brand story to customers nationwide.',
    image: '/images/team/tomi.jpg',
  },
]

export const locations: Location[] = [
  {
    id: 'miami',
    name: 'Jamaica House Miami',
    address: '1234 Biscayne Blvd',
    city: 'Miami',
    state: 'FL',
    zip: '33132',
    phone: '(305) 555-0100',
    hours: 'Mon-Sat 11am-10pm, Sun 12pm-9pm',
    image: '/images/locations/miami.jpg',
  },
  {
    id: 'fort-lauderdale',
    name: 'Jamaica House Fort Lauderdale',
    address: '5678 Las Olas Blvd',
    city: 'Fort Lauderdale',
    state: 'FL',
    zip: '33301',
    phone: '(954) 555-0200',
    hours: 'Mon-Sat 11am-10pm, Sun 12pm-9pm',
    image: '/images/locations/fort-lauderdale.jpg',
  },
  {
    id: 'west-palm-beach',
    name: 'Jamaica House West Palm Beach',
    address: '9012 Clematis St',
    city: 'West Palm Beach',
    state: 'FL',
    zip: '33401',
    phone: '(561) 555-0300',
    hours: 'Mon-Sat 11am-10pm, Sun 12pm-9pm',
    image: '/images/locations/west-palm-beach.jpg',
  },
]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom scroll listeners | `IntersectionObserver` API | ~2019 | Native browser support, better performance, passive by default |
| CSS transitions only | Motion with transforms | 2020+ | Runs off main thread, 60fps on mobile, complex orchestration |
| Plain JavaScript for animations | Motion v12 with hardware acceleration | Feb 2026 | `useScroll` now hardware-accelerated, better mobile performance |
| Unstructured recipe text | Typed TypeScript models | ~2024 | Enables JSON-LD, programmatic access, future features |
| Full client-side React | Next.js Server Components | Next.js 13+ (2023) | 40-60% smaller bundles, faster initial load, better SEO |
| MDX for all content | TypeScript for structured data | 2025+ | MDX for blog-like content, TS for data that needs types/validation |
| Parallax everywhere | Strategic subtle animations | 2024+ | "Scalpel not sledgehammer" - 2-3 effects max, support content |
| `<img>` tags | Next.js `<Image>` | Next.js 10+ (2020) | 80% size reduction, automatic WebP/AVIF, lazy loading |

**Deprecated/outdated:**
- **react-scroll-parallax:** Still works but Motion's `useScroll` with `useTransform` is more flexible and better maintained
- **CSS View Timeline API (experimental):** Chrome 115+ only, not production-ready for cross-browser support yet
- **AOS (Animate On Scroll):** jQuery-era library, replaced by Motion/IntersectionObserver
- **Manual parallax with `onScroll`:** Causes jank, use Motion's `useScroll` instead
- **Recipe microdata (HTML attributes):** Google prefers JSON-LD format as of 2023

## Open Questions

1. **Food photography approach**
   - What we know: Need high-quality hero images for recipes, food photography benefits from higher quality setting
   - What's unclear: Will client provide professional food photography, or use AI-generated/stock images for launch?
   - Recommendation: Clarify with client. If stock images, use high-quality food photography from Unsplash/Pexels with proper licensing. Consider quality={85} or quality={90} for hero images to ensure food looks appetizing.

2. **Animation complexity level**
   - What we know: Story page should have "cinematic scroll layout"
   - What's unclear: Does "cinematic" mean subtle reveals (recommended) or dramatic parallax effects (can feel dated)?
   - Recommendation: Start with subtle `whileInView` reveals. If client wants more, add 1-2 parallax elements (background image at different speed than text). Avoid parallax overload.

3. **Recipe count and content source**
   - What we know: Requirements specify 6-8 recipes
   - What's unclear: Will client provide actual recipes, or should we create example recipes for launch?
   - Recommendation: Create 6 placeholder recipes with realistic structure (ingredients, steps, images). Client can replace content later since it's TypeScript files. Focus on proving the structure works.

4. **Story page video/multimedia**
   - What we know: Requirements mention "large photography"
   - What's unclear: Any video elements (Chef cooking, restaurant atmosphere)?
   - Recommendation: Stick to images for Phase 4 to avoid video optimization complexity. Images with Motion animations achieve "cinematic" feel. Video can be Phase 6 enhancement if needed.

## Sources

### Primary (HIGH confidence)
- [Next.js JSON-LD Guide](https://nextjs.org/docs/app/guides/json-ld) - Official docs updated Feb 11, 2026
- [Motion (Framer Motion) Official Docs](https://motion.dev) - Current version 12.34.1, Feb 2026
- [Motion useInView Hook](https://motion.dev/docs/react-use-in-view) - Official API reference
- [Next.js Image Component](https://nextjs.org/docs/app/api-reference/components/image) - Official docs, Feb 2026
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) - Official architecture guide
- [Schema.org Recipe Type](https://schema.org/Recipe) - Official structured data spec
- [Google Recipe Rich Results](https://developers.google.com/search/docs/appearance/structured-data/recipe) - Google's requirements
- [MDN Scroll-driven Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations) - Browser API reference
- [Chrome Scroll-driven Animations Guide](https://developer.chrome.com/docs/css-ui/scroll-driven-animations) - Implementation patterns

### Secondary (MEDIUM confidence)
- [Motion Changelog](https://motion.dev/changelog) - Recent updates and features
- [Framer Motion npm](https://www.npmjs.com/package/framer-motion) - Version history, v12.34.1 published 7 hours ago
- [react-intersection-observer npm](https://www.npmjs.com/package/react-intersection-observer) - v10.0.2, alternative approach
- [LogRocket: React Scroll Animations with Framer Motion](https://blog.logrocket.com/react-scroll-animations-framer-motion/) - Implementation patterns
- [Builder.io: React Intersection Observer Guide](https://www.builder.io/blog/react-intersection-observer) - Best practices
- [Next.js TypeScript Best Practices 2026](https://oneuptime.com/blog/post/2026-02-02-nextjs-typescript/view) - Current patterns
- [Recipe Website Data Modeling](https://www.simeongriggs.dev/designing-a-more-complete-recipe-website) - Structured data approach
- [Parallax Scrolling in 2026](https://www.webbb.ai/blog/parallax-scrolling-still-cool-in-2026) - Design trends
- [Website Animations Best Practices 2026](https://www.shadowdigital.cc/resources/do-you-need-website-animations) - Performance guidance

### Tertiary (LOW confidence - for context only)
- Various Medium articles on Framer Motion tutorials - useful for examples but verify with official docs
- 99designs food website inspiration galleries - design patterns only, not technical implementation
- Generic web design trend articles - cultural context, not technical specs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Motion v12.34.1 verified from npm (published Feb 18, 2026), Next.js Image and JSON-LD from official docs updated Feb 11, 2026
- Architecture: HIGH - Server/Client Component pattern from official Next.js docs, JSON-LD pattern from official Next.js guide, Motion patterns from official API docs
- Recipe data model: MEDIUM - Based on community best practices (simeongriggs.dev) and schema.org specs, not a single official "recipe data model" standard
- Animation patterns: HIGH - whileInView examples from official Motion docs, performance guidance from Chrome DevTools docs
- Pitfalls: MEDIUM-HIGH - Performance issues verified with Chrome DevTools docs and LogRocket, hydration issues from Next.js docs, CTA placement from multiple design sources

**Research date:** 2026-02-17
**Valid until:** ~2026-03-17 (30 days - stable stack, Next.js 16 and Motion v12 are current, but check for Motion v13 or Next.js updates)

**Notes:**
- Motion rebranded from "Framer Motion" to "Motion" but package name remains `framer-motion`
- Next.js 16.1.6 is current stable (project already on this version)
- All animation libraries require `'use client'` directive in Next.js App Router
- Food photography optimization is critical for this phase - images are the hero content
- Recipe JSON-LD is not just SEO theater - it enables Google's recipe rich results with filters/search
