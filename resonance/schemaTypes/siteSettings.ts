import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Site Title',
      type: 'string',
      initialValue: 'Resonance News Flow',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
        name: 'trendingNow',
        title: 'Trending Now Section',
        description: 'The list of trending topics that appears on the homepage.',
        type: 'array',
        of: [{type: 'string'}],
        validation: (Rule) => Rule.max(5).warning('No more than 5 trending items are recommended.'),
    })
  ],
})
