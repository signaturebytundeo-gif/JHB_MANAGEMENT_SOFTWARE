export interface StorySection {
  id: string
  title: string
  content: string
  image: string
  imageAlt: string
  layout: 'text-left' | 'text-right' | 'centered'
}

export interface TeamMember {
  id: string
  name: string
  role: string
  bio: string
  image: string
}

export interface Restaurant {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  image: string
  badge?: string
  comingSoon?: boolean
}
