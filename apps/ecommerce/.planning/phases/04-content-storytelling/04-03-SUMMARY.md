---
phase: 04-content-storytelling
plan: 03
subsystem: recipes
tags: [recipes, content, seo, conversion, schema.org, json-ld]

dependency_graph:
  requires:
    - 04-01 (recipe data, types, SEO utility)
    - 01-03 (product data, types)
    - 02-01 (ProductCard pattern)
  provides:
    - /recipes grid page
    - /recipes/[slug] detail pages
    - Recipe components (RecipeCard, RecipeGrid, RecipeHero, IngredientList, InstructionSteps, ShopTheSauceCTA)
  affects:
    - Site navigation (new /recipes route)
    - Product discovery (recipes link to products via ShopTheSauceCTA)

tech_stack:
  added:
    - Next.js dynamic routes ([slug])
    - generateStaticParams for 6 recipe pages
    - schema.org Recipe JSON-LD
  patterns:
    - Server Components for all recipe pages and components
    - Two-column desktop layout (ingredients/instructions)
    - Product resolution via getProductById
    - Image preload on RecipeHero for LCP
    - Difficulty badge color coding (easy=green, medium=gold, hard=red)

key_files:
  created:
    - src/components/recipes/RecipeCard.tsx (recipe card for grid)
    - src/components/recipes/RecipeGrid.tsx (responsive grid layout)
    - src/components/recipes/RecipeHero.tsx (full-width hero with metadata)
    - src/components/recipes/IngredientList.tsx (formatted ingredient list)
    - src/components/recipes/InstructionSteps.tsx (numbered step instructions)
    - src/components/recipes/ShopTheSauceCTA.tsx (product CTA section)
    - src/app/recipes/page.tsx (recipes grid page)
    - src/app/recipes/[slug]/page.tsx (recipe detail pages)

decisions:
  - key: Recipe card hover effect
    decision: Image scale on hover with group utilities
    rationale: Consistent with ProductCard pattern, provides visual feedback

  - key: Recipe detail layout
    decision: Two-column on desktop (ingredients left, instructions right)
    rationale: Standard recipe layout pattern, easy scanning for users

  - key: Shop CTA placement
    decision: Bottom of recipe detail page after instructions
    rationale: User sees recipe first, then conversion opportunity when ready

  - key: Product linking strategy
    decision: ShopTheSauceCTA resolves productIds from recipe.featuredProducts array
    rationale: Maintains data integrity, single source of truth for products

  - key: Static generation
    decision: All 6 recipe pages pre-generated at build time via generateStaticParams
    rationale: Maximum performance, instant page loads, full SEO benefits

metrics:
  duration: 158
  completed_date: 2026-02-17
  tasks_completed: 2
  files_created: 8
  commits: 2
---

# Phase 4 Plan 3: Recipe Pages Summary

**One-liner:** Recipe content section with 6 recipe pages featuring hero images, ingredients, step-by-step instructions, schema.org JSON-LD, and product CTAs linking to Jamaica House Brand sauces.

## What Was Built

### Recipe Components (6 total)

**RecipeCard** - Individual recipe card component
- Displays recipe with hero image, title, description
- Shows total time (prep + cook) and servings
- Difficulty badge with color coding (easy=green, medium=gold, hard=red)
- Image hover scale effect on group hover
- Links to /recipes/[slug] detail page

**RecipeGrid** - Responsive grid layout
- Grid columns: 1 (mobile) → 2 (tablet) → 3 (desktop)
- Maps over recipes array, renders RecipeCard for each
- Pure Server Component, no client interactivity

**RecipeHero** - Full-width hero section
- 60vh mobile, 70vh desktop height
- Recipe image with `priority` flag for LCP optimization
- Dark gradient overlay (bottom to top)
- Recipe metadata overlay: prep time, cook time, total, servings, difficulty
- Positioned content at bottom of hero

**IngredientList** - Formatted ingredient list
- Gold "Ingredients" heading
- Each ingredient row: amount (gold) + item name (white) + optional notes (italic gray)
- Bottom borders between items (white/10 opacity)
- Clean, scannable list format

**InstructionSteps** - Numbered step-by-step instructions
- Gold "Instructions" heading
- Numbered steps with gold circle badges (1, 2, 3...)
- Step text in large, readable gray-300
- Optional step images (aspect-video) rendered below text
- Supports instruction.image field for process photos

**ShopTheSauceCTA** - Product conversion section
- Resolves product IDs from recipe.featuredProducts array via getProductById
- Filters out undefined results (handles missing products gracefully)
- Section heading: "Shop the Sauce Used in This Recipe"
- Product cards in 1-2 column grid with:
  - Product image (96px square)
  - Name, size, price (formatted)
  - Click to /products/{slug}
- Secondary CTA: "Shop All Products" link to /shop
- Returns null if no products found

### Recipe Pages (2 routes)

**/recipes** - Recipe grid page
- Hero section: "Recipes" heading + subtitle
- RecipeGrid showing all 6 recipes
- Bottom CTA linking to Instagram for more recipes
- Metadata: SEO title, description, OG tags

**/recipes/[slug]** - Recipe detail pages
- Dynamic route with generateStaticParams (6 pages pre-generated)
- RecipeHero at top (full-width)
- Two-column desktop layout: IngredientList (left) | InstructionSteps (right)
- Mobile: single column, stacked layout
- ShopTheSauceCTA at bottom
- Schema.org Recipe JSON-LD injected in `<script>` tag:
  - @type: "Recipe"
  - name, description, images
  - prepTime, cookTime, totalTime (ISO 8601 duration format)
  - recipeYield, recipeIngredient, recipeInstructions (HowToStep array)
- generateMetadata: recipe title, description, OG images
- notFound() if recipe slug doesn't exist

### Static Generation

All 6 recipes pre-generated at build time:
- /recipes/authentic-jerk-chicken
- /recipes/jerk-shrimp-tacos
- /recipes/jerk-salmon-rice-peas
- /recipes/escovitch-fish
- /recipes/jerk-chicken-wings
- /recipes/pikliz-burger

Build output shows ● (SSG) for all recipe detail pages.

## Deviations from Plan

None - plan executed exactly as written. All components created as specified, both pages implemented with all required features (JSON-LD, generateStaticParams, metadata, two-column layout, CTAs).

## Key Integrations

**Recipe → Product linking:**
- ShopTheSauceCTA imports getProductById from @/data/products
- Resolves recipe.featuredProducts array (product IDs)
- Displays actual product data (image, name, size, price)
- Links directly to product detail pages (/products/{slug})

**SEO integration:**
- generateRecipeJsonLd from @/lib/seo generates schema.org JSON-LD
- Injected via dangerouslySetInnerHTML in script tag
- All 6 recipes have Recipe schema markup for rich search results

**Image optimization:**
- RecipeHero uses priority prop for LCP (hero is largest contentful paint)
- RecipeCard uses quality={75} for balance of quality/performance
- Proper sizes attributes on all images for responsive loading

## Verification Results

**Build verification:**
- `npm run build` successful
- All 6 recipe pages generated as static HTML (● SSG marker)
- TypeScript compilation: zero errors
- No runtime errors

**Page verification:**
- /recipes page renders with 6 recipe cards in grid
- Recipe cards link to /recipes/{slug}
- Recipe detail pages have:
  - Hero image with metadata overlay
  - Ingredient list (formatted with amounts)
  - Step-by-step instructions (numbered)
  - Shop CTA section with product cards
  - JSON-LD script tag verified in built HTML (grep found @type:Recipe)

**Component verification:**
- All 6 components created in src/components/recipes/
- RecipeCard has difficulty badge, hover effect, metadata
- RecipeHero uses priority prop
- ShopTheSauceCTA resolves products correctly
- IngredientList and InstructionSteps render content properly

## Performance Notes

**LCP optimization:**
- RecipeHero image uses priority prop
- Hero is pre-loaded, critical for page performance
- Quality set to 85 for hero (higher than card images at 75)

**Static generation:**
- All recipe pages pre-generated at build time
- Zero server-side rendering overhead
- Instant page loads for users
- Full SEO benefits (crawlers see complete HTML)

**Image optimization:**
- Next.js Image component auto-optimizes all recipe images
- Responsive srcsets generated for all viewport sizes
- Lazy loading for non-LCP images (cards, step images)

## Next Steps

From ROADMAP.md Phase 4:
- Plan 04-04: Our Story page (team, restaurants, hero content)
- Plan 04-05: Link recipes and story from navigation

This plan completes the recipe content section. All recipes now live as fully SEO-optimized pages with conversion opportunities via product CTAs.

## Self-Check: PASSED

**Created files verified:**
- [✓] src/components/recipes/RecipeCard.tsx
- [✓] src/components/recipes/RecipeGrid.tsx
- [✓] src/components/recipes/RecipeHero.tsx
- [✓] src/components/recipes/IngredientList.tsx
- [✓] src/components/recipes/InstructionSteps.tsx
- [✓] src/components/recipes/ShopTheSauceCTA.tsx
- [✓] src/app/recipes/page.tsx
- [✓] src/app/recipes/[slug]/page.tsx

**Commits verified:**
- [✓] e4e061d: feat(04-03): create recipe components
- [✓] d06f24d: feat(04-03): create recipes grid page and recipe detail pages with JSON-LD
