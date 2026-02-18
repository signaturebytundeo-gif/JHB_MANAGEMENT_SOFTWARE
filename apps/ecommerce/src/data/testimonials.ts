export interface Testimonial {
  id: string
  name: string
  quote: string
  rating: number
  location?: string
}

export const testimonials: Testimonial[] = [
  {
    id: 'testimonial-1',
    name: 'Maria G.',
    quote: 'The best jerk sauce I\'ve ever had outside of Jamaica. My family goes through a bottle every week!',
    rating: 5,
    location: 'Miami, FL',
  },
  {
    id: 'testimonial-2',
    name: 'James T.',
    quote: 'Chef Anthony\'s sauce transformed my grilling game. The flavor is authentic and the heat is perfect.',
    rating: 5,
    location: 'Atlanta, GA',
  },
  {
    id: 'testimonial-3',
    name: 'Keisha W.',
    quote: 'I\'ve tried every hot sauce brand out there. Nothing compares to Jamaica House. The 30-year recipe really shows.',
    rating: 5,
    location: 'Brooklyn, NY',
  },
  {
    id: 'testimonial-4',
    name: 'David R.',
    quote: 'We use this on everything - jerk chicken, rice and peas, even eggs. It\'s that versatile.',
    rating: 4,
    location: 'Houston, TX',
  },
]
