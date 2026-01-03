import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'generatedArticle',
  title: 'AI Generated Article',
  type: 'document',
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'sources', title: 'Sources'},
    {name: 'ai', title: 'AI Metadata'},
    {name: 'review', title: 'Review'},
    {name: 'layout', title: 'Layout'},
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
      description: 'A short summary for preview cards (max 200 characters)',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.max(200).required(),
      group: 'content',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      description: 'The article content (can be edited before publishing)',
      type: 'array',
      of: [
        {type: 'block'},
        {type: 'image', options: {hotspot: true}},
      ],
      group: 'content',
    }),
    defineField({
      name: 'bodyHtml',
      title: 'Body HTML (Raw)',
      description: 'Original AI-generated HTML content',
      type: 'text',
      rows: 10,
      group: 'content',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          {title: 'UK News', value: 'uk'},
          {title: 'World', value: 'world'},
          {title: 'Politics', value: 'politics'},
          {title: 'Business', value: 'business'},
          {title: 'Technology', value: 'technology'},
          {title: 'Science', value: 'science'},
          {title: 'Health', value: 'health'},
          {title: 'Sport', value: 'sport'},
          {title: 'Entertainment', value: 'entertainment'},
          {title: 'Culture', value: 'culture'},
          {title: 'Environment', value: 'environment'},
          {title: 'Education', value: 'education'},
          {title: 'Lifestyle', value: 'lifestyle'},
        ],
      },
      validation: (Rule) => Rule.required(),
      group: 'content',
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        layout: 'tags',
      },
      group: 'content',
    }),
    defineField({
      name: 'mainImage',
      title: 'Main Image',
      type: 'image',
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alternative Text',
        },
        {
          name: 'caption',
          type: 'string',
          title: 'Caption',
        },
        {
          name: 'credit',
          type: 'string',
          title: 'Photo Credit',
        },
      ],
      group: 'content',
    }),

    // --- Sources Group ---
    defineField({
      name: 'sourceUrls',
      title: 'Source URLs',
      description: 'Original news sources used to generate this article',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {name: 'title', type: 'string', title: 'Source Title'},
            {name: 'url', type: 'url', title: 'URL'},
            {name: 'sourceName', type: 'string', title: 'Publication Name'},
            {name: 'publishedAt', type: 'datetime', title: 'Published Date'},
          ],
        },
      ],
      group: 'sources',
    }),
    defineField({
      name: 'suggestedImages',
      title: 'Suggested Images',
      description: 'Images from source articles',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {name: 'url', type: 'url', title: 'Image URL'},
            {name: 'alt', type: 'string', title: 'Alt Text'},
            {name: 'source', type: 'string', title: 'Source'},
            {name: 'license', type: 'string', title: 'License'},
          ],
        },
      ],
      group: 'sources',
    }),

    // --- AI Metadata Group ---
    defineField({
      name: 'aiModel',
      title: 'AI Model',
      type: 'string',
      readOnly: true,
      group: 'ai',
    }),
    defineField({
      name: 'aiPromptVersion',
      title: 'Prompt Version',
      type: 'string',
      readOnly: true,
      group: 'ai',
    }),
    defineField({
      name: 'generationConfig',
      title: 'Generation Config',
      type: 'object',
      fields: [
        {name: 'tone', type: 'string', title: 'Tone'},
        {name: 'length', type: 'string', title: 'Length'},
        {name: 'style', type: 'string', title: 'Style'},
        {name: 'targetWordCount', type: 'number', title: 'Target Word Count'},
      ],
      group: 'ai',
    }),
    defineField({
      name: 'confidenceScore',
      title: 'Confidence Score',
      description: 'AI confidence in article accuracy (0-100)',
      type: 'number',
      validation: (Rule) => Rule.min(0).max(100),
      group: 'ai',
    }),
    defineField({
      name: 'tokenUsage',
      title: 'Token Usage',
      type: 'object',
      fields: [
        {name: 'promptTokens', type: 'number', title: 'Prompt Tokens'},
        {name: 'completionTokens', type: 'number', title: 'Completion Tokens'},
        {name: 'totalTokens', type: 'number', title: 'Total Tokens'},
        {name: 'estimatedCost', type: 'number', title: 'Estimated Cost ($)'},
      ],
      group: 'ai',
    }),
    defineField({
      name: 'generatedAt',
      title: 'Generated At',
      type: 'datetime',
      readOnly: true,
      group: 'ai',
    }),

    // --- Review Group ---
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          {title: '⏳ Pending Review', value: 'pending'},
          {title: '🔄 Generating', value: 'generating'},
          {title: '👀 In Review', value: 'reviewing'},
          {title: '✅ Approved', value: 'approved'},
          {title: '📢 Published', value: 'published'},
          {title: '❌ Rejected', value: 'rejected'},
          {title: '⚠️ Error', value: 'error'},
        ],
        layout: 'radio',
      },
      initialValue: 'pending',
      group: 'review',
    }),
    defineField({
      name: 'factCheckResults',
      title: 'Fact Check Results',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {name: 'claim', type: 'text', title: 'Claim'},
            {
              name: 'verdict',
              type: 'string',
              title: 'Verdict',
              options: {
                list: [
                  {title: '✅ Verified', value: 'verified'},
                  {title: '❓ Unverified', value: 'unverified'},
                  {title: '❌ False', value: 'false'},
                  {title: '⚠️ Needs Review', value: 'needs_review'},
                ],
              },
            },
            {name: 'source', type: 'string', title: 'Supporting Source'},
            {name: 'notes', type: 'text', title: 'Notes'},
          ],
        },
      ],
      group: 'review',
    }),
    defineField({
      name: 'biasAnalysis',
      title: 'Bias Analysis',
      type: 'object',
      fields: [
        {
          name: 'overallBias',
          type: 'string',
          title: 'Overall Bias Level',
          options: {
            list: ['none', 'slight', 'moderate', 'significant'],
          },
        },
        {
          name: 'politicalLeaning',
          type: 'string',
          title: 'Political Leaning',
          options: {
            list: ['left', 'center-left', 'center', 'center-right', 'right', 'neutral'],
          },
        },
        {name: 'issues', type: 'array', of: [{type: 'string'}], title: 'Issues Found'},
        {name: 'recommendations', type: 'array', of: [{type: 'string'}], title: 'Recommendations'},
      ],
      group: 'review',
    }),
    defineField({
      name: 'reviewNotes',
      title: 'Review Notes',
      description: 'Editor notes and feedback',
      type: 'text',
      rows: 4,
      group: 'review',
    }),
    defineField({
      name: 'reviewedBy',
      title: 'Reviewed By',
      type: 'reference',
      to: [{type: 'author'}],
      group: 'review',
    }),
    defineField({
      name: 'reviewedAt',
      title: 'Reviewed At',
      type: 'datetime',
      group: 'review',
    }),

    // --- Layout Group ---
    defineField({
      name: 'isBreakingNews',
      title: 'Breaking News',
      type: 'boolean',
      initialValue: false,
      group: 'layout',
    }),
    defineField({
      name: 'isLeadStory',
      title: 'Lead Story',
      type: 'boolean',
      initialValue: false,
      group: 'layout',
    }),
    defineField({
      name: 'isFeatured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
      group: 'layout',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      group: 'layout',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      status: 'status',
      media: 'mainImage',
    },
    prepare(selection) {
      const {title, category, status, media} = selection
      const statusEmojiMap: Record<string, string> = {
        pending: '⏳',
        generating: '🔄',
        reviewing: '👀',
        approved: '✅',
        published: '📢',
        rejected: '❌',
        error: '⚠️',
      }
      const statusEmoji = status ? statusEmojiMap[status as string] || '❓' : '❓'
      
      return {
        title: `${statusEmoji} ${title}`,
        subtitle: `${category?.toUpperCase() || 'No category'} | ${status || 'Unknown status'}`,
        media,
      }
    },
  },
  orderings: [
    {
      title: 'Generated Date, New',
      name: 'generatedAtDesc',
      by: [{field: 'generatedAt', direction: 'desc'}],
    },
    {
      title: 'Status',
      name: 'statusAsc',
      by: [{field: 'status', direction: 'asc'}],
    },
  ],
})
