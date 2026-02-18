'use client'

import { useInView } from 'react-intersection-observer'
import Image from 'next/image'
import { team } from '@/data/team'

export default function TeamSection() {
  const { ref, inView } = useInView({
    threshold: 0.2,
    triggerOnce: true,
  })

  return (
    <section ref={ref} className="py-24 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-brand-gold text-center mb-12">
          Meet the Team
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {team.map((member, index) => (
            <div
              key={member.id}
              className={`text-center transition-all duration-1000 ease-out ${
                inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${index * 200}ms` }}
            >
              {/* Team Member Image */}
              <div className="relative w-48 h-48 mx-auto mb-6">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  className="object-cover rounded-full"
                  sizes="192px"
                />
              </div>

              {/* Name */}
              <h3 className="text-2xl font-bold text-white mb-2">
                {member.name}
              </h3>

              {/* Role */}
              <p className="text-brand-gold font-semibold mb-4">
                {member.role}
              </p>

              {/* Bio */}
              <p className="text-gray-300 leading-relaxed">
                {member.bio}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
