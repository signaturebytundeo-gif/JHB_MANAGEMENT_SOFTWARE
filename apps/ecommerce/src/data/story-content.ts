import { StorySection } from '@/types/story'

export const storyContent = {
  hero: {
    title: 'Our Story',
    subtitle: 'A family legacy — from three restaurants to your table',
    image: '/images/story/hero.jpg',
  },
  sections: [
    {
      id: 'chef-anthony-origin',
      title: 'Carrying On a Family Legacy',
      content:
        "Chef Anthony grew up in the kitchen of his father's Jamaica House restaurants, where authentic Jamaican flavors became second nature. After watching his father build three thriving South Florida locations over 30 years, Anthony set out to extend that legacy beyond the restaurant walls — bringing the same beloved recipes directly to tables everywhere.",
      image: '/images/story/chef-anthony.jpg',
      imageAlt: 'Chef Anthony at Jamaica House Brand booth',
      layout: 'text-left',
    },
    {
      id: 'sauce-story',
      title: 'The Sauce Everyone Asked For',
      content:
        "For years, 92% of Jamaica House restaurant guests asked the same question: 'Can I buy a bottle of that sauce?' After countless requests, Chef Anthony decided to bottle the exact recipe his father perfected in the restaurants. Jamaica House Brand brings the authentic restaurant experience to your home kitchen.",
      image: '/images/story/sauce-bottling.jpg',
      imageAlt: 'Jamaica House Brand sauce bottles being filled',
      layout: 'text-right',
    },
  ] as StorySection[],
}
