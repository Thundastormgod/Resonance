import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'article',
  title: 'Article',
  type: 'document',
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'layout', title: 'Homepage Layout'},
    {name: 'media', title: 'Media'},
    {name: 'metadata', title: 'Metadata'},
  ],
  fields: [
    // --- Content Group ---
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
      group: 'content',
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: {type: 'author'},
      validation: (Rule) => Rule.required(),
      group: 'content',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
      group: 'content',
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      description: 'A short summary of the article used in previews.',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.max(200).required(),
      group: 'content',
    }),

    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        {type: 'block'},
        {type: 'image', options: {hotspot: true}},
      ],
      validation: (Rule) => Rule.required(),
      group: 'content',
    }),

    // --- Layout Group ---
    defineField({
      name: 'isBreakingNews',
      title: 'Make this a Breaking News Story?',
      type: 'boolean',
      description: 'Toggles this article to appear in the breaking news banner. ⚠️ Only ONE breaking news story allowed at a time.',
      initialValue: false,
      group: 'layout',
      validation: (Rule) => Rule.custom(async (value, context) => {
        if (!value) return true; // If false, no validation needed
        
        const {document, getClient} = context;
        const client = getClient({apiVersion: '2023-05-03'});
        
        // Check if another article already has isBreakingNews: true
        const existingBreakingNews = await client.fetch(
          `*[_type == "article" && isBreakingNews == true && _id != $currentId][0]`,
          {currentId: document?._id}
        );
        
        if (existingBreakingNews) {
          return `Only one breaking news story is allowed at a time. "${existingBreakingNews.title}" is currently set as breaking news.`;
        }
        
        return true;
      }),
    }),
    defineField({
      name: 'isLeadStory',
      title: 'Make this the Lead Story?',
      type: 'boolean',
      description: 'Toggles this article as the main, large story on the homepage. ⚠️ Only ONE lead story allowed at a time.',
      initialValue: false,
      group: 'layout',
      validation: (Rule) => Rule.custom(async (value, context) => {
        if (!value) return true; // If false, no validation needed
        
        const {document, getClient} = context;
        const client = getClient({apiVersion: '2023-05-03'});
        
        // Check if another article already has isLeadStory: true
        const existingLeadStory = await client.fetch(
          `*[_type == "article" && isLeadStory == true && _id != $currentId][0]`,
          {currentId: document?._id}
        );
        
        if (existingLeadStory) {
          return `Only one lead story is allowed at a time. "${existingLeadStory.title}" is currently set as the lead story.`;
        }
        
        return true;
      }),
    }),
    defineField({
      name: 'isFeatured',
      title: 'Add to Featured Stories?',
      type: 'boolean',
      description: 'Toggles this article to appear in the featured section.',
      initialValue: false,
      group: 'layout',
    }),
    defineField({
      name: 'isLatestUpdate',
      title: 'Add to Latest Updates?',
      type: 'boolean',
      description: 'Toggles this article to appear in the Latest Updates sidebar section.',
      initialValue: false,
      group: 'layout',
    }),

    // --- Media Group ---
    defineField({
      name: 'mainImage',
      title: 'Main Image',
      type: 'image',
      options: {
        hotspot: true,
      },
      validation: (Rule) => Rule.required(),
      group: 'media',
    }),
    defineField({
      name: 'mediaType',
      title: 'Media Type',
      type: 'string',
      options: {
        list: [
          {title: 'Standard Article', value: 'article'},
          {title: 'Video Report', value: 'video'},
        ],
        layout: 'radio',
      },
      initialValue: 'article',
      group: 'media',
    }),
    defineField({
      name: 'videoUrl',
      title: 'Video URL',
      description: 'Optional: A URL to a video (e.g., YouTube, Vimeo).',
      type: 'url',
      hidden: ({document}) => document?.mediaType !== 'video',
      group: 'media',
    }),
    defineField({
      name: 'videoDuration',
      title: 'Video Duration',
      type: 'string',
      description: 'e.g., "25 min" or "1:30"',
      hidden: ({document}) => document?.mediaType !== 'video',
      group: 'media',
    }),

    // --- Metadata Group ---

    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [{type: 'reference', to: {type: 'category'}}],
      validation: (Rule) => Rule.required(),
      group: 'metadata',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (Rule) => Rule.required(),
      group: 'metadata',
    }),
    defineField({
      name: 'readCount',
      title: 'Read Count',
      type: 'number',
      description: 'A simulated view count to determine trending articles.',
      initialValue: () => Math.floor(Math.random() * 50000) + 1000,
      readOnly: true,
      group: 'metadata',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      author: 'author.name',
      media: 'mainImage',
    },
    prepare(selection) {
      const {author} = selection
      return {...selection, subtitle: author && `by ${author}`}
    },
  },
})
