import type { Metadata } from 'next'
import RestaurantOrderForm from './RestaurantOrderForm'

export const metadata: Metadata = {
  title: 'Restaurant Partners | Jamaica House Brand',
  description:
    'Wholesale pricing for restaurants. Authentic Jamaican Jerk Sauce — 1-gallon BOH format or 5oz table bottles. 30+ years of Caribbean heritage.',
}

export default function RestaurantPartnersPage() {
  return (
    <div className="min-h-screen bg-brand-dark">
      {/* Hero */}
      <section className="relative bg-brand-green overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-20 text-center relative z-10">
          <p className="text-brand-gold font-semibold tracking-widest text-sm uppercase mb-4">
            Wholesale Partner Program
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
            Bring the Island to Your Kitchen
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            30+ years of Caribbean heritage in every bottle. Wholesale pricing for restaurants, caterers, and food service.
          </p>

          {/* Intro badge */}
          <div className="absolute top-6 right-6 sm:top-8 sm:right-8 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-brand-gold flex flex-col items-center justify-center text-brand-dark shadow-lg">
            <span className="text-xs font-bold uppercase leading-tight">3-Month</span>
            <span className="text-sm sm:text-base font-extrabold leading-tight">Intro</span>
            <span className="text-xs font-bold uppercase leading-tight">Pricing</span>
          </div>
        </div>
      </section>

      {/* Gold accent strip */}
      <div className="bg-brand-gold py-2.5 overflow-hidden">
        <p className="text-brand-dark text-xs sm:text-sm font-bold tracking-widest text-center whitespace-nowrap">
          SCOTCH BONNET · ALLSPICE · THYME · ZERO CALORIES · LOW SODIUM · ALL NATURAL
        </p>
      </div>

      {/* Two-column promo */}
      <section className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* BOH */}
          <div className="rounded-2xl bg-brand-green p-8 text-white">
            <p className="text-brand-gold font-semibold text-sm uppercase tracking-wider mb-2">Back of House</p>
            <h2 className="text-3xl font-bold mb-1">Kitchen</h2>
            <p className="text-4xl font-extrabold text-brand-gold mb-6">
              1 Gallon = $50 <span className="text-base font-normal text-white/60">(intro)</span>
            </p>
            <ul className="space-y-3 text-white/90">
              <li className="flex items-start gap-2">
                <span className="text-brand-gold mt-0.5">→</span>
                Marinades, glazes, wings — one jug covers a full weekend service
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-gold mt-0.5">→</span>
                Batch cocktail spice — Jerk Margaritas, Rum Punch
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-gold mt-0.5">→</span>
                Burger &amp; sandwich spreads customers ask about
              </li>
            </ul>
          </div>

          {/* FOH */}
          <div className="rounded-2xl bg-brand-gold p-8 text-brand-dark">
            <p className="font-semibold text-sm uppercase tracking-wider mb-2 text-brand-dark/70">Front of House</p>
            <h2 className="text-3xl font-bold mb-1">Table</h2>
            <p className="text-4xl font-extrabold mb-6">
              Case 12×5oz = $60
            </p>
            <ul className="space-y-3 text-brand-dark/90">
              <li className="flex items-start gap-2">
                <span className="mt-0.5">→</span>
                Branded table bottles your guests take home
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">→</span>
                Zero calories / low sodium — dietary-friendly condiment
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">→</span>
                Tell the 30-year family recipe story at every table
              </li>
            </ul>
          </div>
        </div>

        {/* Ingredient pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-8">
          {[
            '🌶 Scotch Bonnet',
            '🌿 Allspice',
            '🌱 Thyme',
            '⚡ Sweet Heat',
            '✅ Zero Calories',
            '🔬 Low Sodium',
            '🚫 No Artificial Preservatives',
          ].map((pill) => (
            <span
              key={pill}
              className="px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-xs sm:text-sm font-medium border border-white/10"
            >
              {pill}
            </span>
          ))}
        </div>
      </section>

      {/* Order Form */}
      <section className="max-w-4xl mx-auto px-4 pb-16 sm:pb-24">
        <div className="rounded-2xl border border-brand-gold/20 bg-brand-dark p-6 sm:p-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center">
            Place Your Order
          </h2>
          <p className="text-gray-400 text-center mb-8">
            Fill out the form below and we&apos;ll confirm within 1 business day.
          </p>
          <RestaurantOrderForm />
        </div>
      </section>
    </div>
  )
}
