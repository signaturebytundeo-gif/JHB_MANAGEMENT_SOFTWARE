'use client'

import Image from 'next/image'
import { useInView } from 'react-intersection-observer'
import { restaurants } from '@/data/restaurants'

export default function RestaurantLocations() {
  const { ref, inView } = useInView({
    threshold: 0.2,
    triggerOnce: true,
  })

  return (
    <section ref={ref} className="py-24 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-brand-gold text-center mb-12">
          Visit Our Restaurants
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {restaurants.map((restaurant, index) => (
            <div
              key={restaurant.id}
              className={`bg-white/5 border border-white/10 rounded-lg overflow-hidden transition-all duration-1000 ease-out ${
                inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Restaurant Image */}
              <div className="relative aspect-[4/3]">
                <Image
                  src={restaurant.image}
                  alt={restaurant.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                {/* Badge */}
                {restaurant.badge && (
                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold ${
                    restaurant.comingSoon
                      ? 'bg-brand-teal text-white'
                      : 'bg-brand-gold text-brand-dark'
                  }`}>
                    {restaurant.badge}
                  </div>
                )}
                {/* Coming Soon Overlay */}
                {restaurant.comingSoon && (
                  <div className="absolute inset-0 bg-brand-dark/50 flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">Coming Soon</span>
                  </div>
                )}
              </div>

              <div className="p-6">
                {/* Restaurant Name */}
                <h3 className="text-xl font-bold text-white mb-4">
                  {restaurant.name}
                </h3>

                {restaurant.comingSoon ? (
                  <p className="text-gray-400">
                    Stay tuned for our newest location!
                  </p>
                ) : (
                  <>
                    {/* Address — links to Google Maps */}
                    {restaurant.mapsUrl ? (
                      <a
                        href={restaurant.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mb-4 hover:text-brand-gold transition-colors"
                      >
                        <p className="text-gray-300 mb-1">
                          {restaurant.address}
                        </p>
                        <p className="text-gray-300">
                          {restaurant.city}, {restaurant.state} {restaurant.zip}
                        </p>
                      </a>
                    ) : (
                      <>
                        <p className="text-gray-300 mb-1">
                          {restaurant.address}
                        </p>
                        <p className="text-gray-300 mb-4">
                          {restaurant.city}, {restaurant.state} {restaurant.zip}
                        </p>
                      </>
                    )}

                    {/* Phone */}
                    <a href={`tel:${restaurant.phone}`} className="text-brand-gold font-semibold hover:text-brand-gold-light transition-colors">
                      {restaurant.phone}
                    </a>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
