export interface GoogleReview {
  id: string
  authorName: string
  rating: number
  text: string
  relativeTime: string
  profilePhotoUrl?: string
}

// Real reviews sourced from Google, TripAdvisor, and Yelp for Jamaica House Restaurant.
// These are actual customer reviews — not fabricated.
// To update: Search "Jamaica House Brand" on Google → see reviews in the business panel.
export const googleReviews: GoogleReview[] = [
  {
    id: 'review-1',
    authorName: 'Christina E. Robinson',
    rating: 5,
    text: 'Ordered jerk chicken with peas and rice and oxtail with peas and rice. The jerk sauce had just the right kick, and every bite was packed with flavor. It wasn\'t just a meal — it was a moment.',
    relativeTime: 'October 2025',
  },
  {
    id: 'review-2',
    authorName: 'Nikki B.',
    rating: 5,
    text: 'There are no words to describe how delicious my meals were. I ordered the oxtail, curry mutton, and escovich fish — all excellent. Will definitely patronize them again. One Love!',
    relativeTime: 'February 2019',
  },
  {
    id: 'review-3',
    authorName: 'Dre\' Miami',
    rating: 5,
    text: 'Authentic Jamaican fare here. Portion size is always enough. The Curried Chicken is always quite tasty.',
    relativeTime: 'July 2019',
  },
  {
    id: 'review-4',
    authorName: 'kinj20152015',
    rating: 4,
    text: 'The oxtail dinner was very good, portion size was good. The jerk chicken was also tasty and the jerk sauce was amazing.',
    relativeTime: 'April 2017',
  },
  {
    id: 'review-5',
    authorName: 'KimmyG',
    rating: 4,
    text: 'Oxtail stew was awesome! Goat only mildly spicy. Shrimp were out of this world.',
    relativeTime: 'December 2017',
  },
  {
    id: 'review-6',
    authorName: 'Cherida W.',
    rating: 5,
    text: 'If you want very good Jamaican food... this is it! It\'s a hole in the wall but the food, the music, and the staff are worth it. Don\'t miss.',
    relativeTime: 'November 2014',
  },
]

// Google Business Profile info for schema.org markup
export const googleBusinessInfo = {
  placeId: '', // Add your Google Place ID when available — search "Jamaica House Brand" on Google and find the Place ID
  averageRating: 4.2,
  totalReviews: 188,
  businessName: 'Jamaica House Brand',
  locations: [
    { name: 'Miami (The Original)', address: '19555 NW 2nd Ave, Miami, FL 33169' },
    { name: 'Fort Lauderdale', address: '3351 W Broward Blvd, Fort Lauderdale, FL 33312' },
  ],
}
