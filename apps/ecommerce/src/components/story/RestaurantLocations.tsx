'use client'

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
              className={`bg-white/5 border border-white/10 rounded-lg p-6 transition-all duration-1000 ease-out ${
                inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Restaurant Name */}
              <h3 className="text-xl font-bold text-white mb-4">
                {restaurant.name}
              </h3>

              {/* Address */}
              <p className="text-gray-300 mb-1">
                {restaurant.address}
              </p>
              <p className="text-gray-300 mb-4">
                {restaurant.city}, {restaurant.state} {restaurant.zip}
              </p>

              {/* Phone */}
              <p className="text-brand-gold font-semibold">
                {restaurant.phone}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
