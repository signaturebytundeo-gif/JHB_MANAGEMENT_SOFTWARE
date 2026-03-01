import { Restaurant } from '@/types/story'

export const restaurants: Restaurant[] = [
  {
    id: 'miami',
    name: 'Jamaica House Restaurant - Miami',
    address: '19555 NW 2nd Ave',
    city: 'Miami',
    state: 'FL',
    zip: '33169',
    phone: '(305) 651-0083',
    image: '/images/restaurants/miami.jpg',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=19555+NW+2nd+Ave+Miami+FL+33169',
    badge: 'The Original',
  },
  {
    id: 'broward',
    name: 'Jamaica House Restaurant - Broward',
    address: '3351 W Broward Blvd',
    city: 'Fort Lauderdale',
    state: 'FL',
    zip: '33312',
    phone: '(954) 530-2698',
    image: '/images/restaurants/broward.jpg',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=3351+W+Broward+Blvd+Fort+Lauderdale+FL+33312',
  },
  {
    id: 'miramar',
    name: 'Jamaica House Restaurant - Miramar',
    address: '',
    city: 'Miramar',
    state: 'FL',
    zip: '',
    phone: '',
    image: '/images/restaurants/broward-interior.jpg',
    badge: 'Coming Soon',
    comingSoon: true,
  },
]
