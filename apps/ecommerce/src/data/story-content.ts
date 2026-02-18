import { StorySection } from '@/types/story'

export const storyContent = {
  hero: {
    title: 'Our Story',
    subtitle: 'From a family kitchen to three restaurants — and now, your table',
    image: '/images/story/hero.jpg',
  },
  sections: [
    {
      id: 'chef-anthony-origin',
      title: 'A Chef Born at 11 Years Old',
      content:
        "Chef Anthony discovered his passion for cooking at age 11 in Jamaica. He brought those flavors to South Florida, where he built not one but three thriving restaurants. Each dish honors traditional recipes passed down through generations.",
      image: '/images/story/chef-anthony.jpg',
      imageAlt: 'Chef Anthony cooking in his Jamaica restaurant kitchen',
      layout: 'text-left',
    },
    {
      id: 'sauce-story',
      title: 'The Sauce Everyone Asked For',
      content:
        "For years, 92% of Jamaica House restaurant guests asked the same question: 'Can I buy a bottle of that sauce?' After countless requests, Chef Anthony decided to bottle the exact recipe used in his restaurants. Jamaica House Brand brings the authentic restaurant experience to your home kitchen.",
      image: '/images/story/sauce-bottling.jpg',
      imageAlt: 'Jamaica House Brand sauce bottles being filled',
      layout: 'text-right',
    },
  ] as StorySection[],
}
