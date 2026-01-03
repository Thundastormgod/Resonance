import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'dataSource',
  title: 'News Data Source',
  type: 'document',
  icon: () => '📡',
  fields: [
    defineField({
      name: 'name',
      title: 'Source Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'type',
      title: 'Source Type',
      type: 'string',
      options: {
        list: [
          {title: '📰 RSS Feed', value: 'rss'},
          {title: '🔌 API', value: 'api'},
          {title: '🕷️ Web Scraper', value: 'scraper'},
          {title: '📱 Social Media', value: 'social'},
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'Source URL',
      type: 'url',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'apiKey',
      title: 'API Key',
      description: 'For API-based sources. Keep secure!',
      type: 'string',
      hidden: ({document}) => document?.type !== 'api',
    }),
    defineField({
      name: 'category',
      title: 'Default Category',
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
    }),
    defineField({
      name: 'isActive',
      title: 'Active',
      description: 'Enable or disable this source',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          {title: '✅ Active', value: 'active'},
          {title: '⏸️ Inactive', value: 'inactive'},
          {title: '⚠️ Error', value: 'error'},
          {title: '🚫 Rate Limited', value: 'rate_limited'},
        ],
      },
      initialValue: 'active',
    }),
    defineField({
      name: 'fetchInterval',
      title: 'Fetch Interval (minutes)',
      description: 'How often to check for new articles',
      type: 'number',
      initialValue: 30,
      validation: (Rule) => Rule.min(5).max(1440),
    }),
    defineField({
      name: 'lastFetched',
      title: 'Last Fetched',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'lastError',
      title: 'Last Error',
      type: 'text',
      readOnly: true,
    }),
    defineField({
      name: 'articlesCount',
      title: 'Articles Fetched',
      description: 'Total articles fetched from this source',
      type: 'number',
      initialValue: 0,
      readOnly: true,
    }),
    // RSS-specific config
    defineField({
      name: 'rssConfig',
      title: 'RSS Configuration',
      type: 'object',
      hidden: ({document}) => document?.type !== 'rss',
      fields: [
        {
          name: 'feedUrl',
          type: 'url',
          title: 'Feed URL',
        },
        {
          name: 'maxItems',
          type: 'number',
          title: 'Max Items to Fetch',
          initialValue: 10,
        },
      ],
    }),
    // API-specific config
    defineField({
      name: 'apiConfig',
      title: 'API Configuration',
      type: 'object',
      hidden: ({document}) => document?.type !== 'api',
      fields: [
        {
          name: 'endpoint',
          type: 'string',
          title: 'API Endpoint',
        },
        {
          name: 'headers',
          type: 'text',
          title: 'Custom Headers (JSON)',
        },
        {
          name: 'queryParams',
          type: 'text',
          title: 'Query Parameters (JSON)',
        },
      ],
    }),
    // Scraper-specific config
    defineField({
      name: 'scraperConfig',
      title: 'Scraper Configuration',
      type: 'object',
      hidden: ({document}) => document?.type !== 'scraper',
      fields: [
        {
          name: 'titleSelector',
          type: 'string',
          title: 'Title CSS Selector',
        },
        {
          name: 'contentSelector',
          type: 'string',
          title: 'Content CSS Selector',
        },
        {
          name: 'imageSelector',
          type: 'string',
          title: 'Image CSS Selector',
        },
        {
          name: 'dateSelector',
          type: 'string',
          title: 'Date CSS Selector',
        },
      ],
    }),
    // Rate limiting
    defineField({
      name: 'rateLimiting',
      title: 'Rate Limiting',
      type: 'object',
      fields: [
        {
          name: 'maxRequestsPerHour',
          type: 'number',
          title: 'Max Requests Per Hour',
          initialValue: 60,
        },
        {
          name: 'delayBetweenRequests',
          type: 'number',
          title: 'Delay Between Requests (ms)',
          initialValue: 1000,
        },
      ],
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      description: 'Internal notes about this source',
      type: 'text',
      rows: 3,
    }),
  ],
  preview: {
    select: {
      title: 'name',
      type: 'type',
      category: 'category',
      isActive: 'isActive',
      status: 'status',
    },
    prepare(selection) {
      const {title, type, category, isActive, status} = selection
      const typeEmoji: Record<string, string> = {
        rss: '📰',
        api: '🔌',
        scraper: '🕷️',
        social: '📱',
      }
      const statusIndicator = isActive && status === 'active' ? '🟢' : '🔴'
      
      return {
        title: `${statusIndicator} ${title}`,
        subtitle: `${typeEmoji[type as string] || '❓'} ${type?.toUpperCase()} | ${category || 'No category'}`,
      }
    },
  },
  orderings: [
    {
      title: 'Name',
      name: 'nameAsc',
      by: [{field: 'name', direction: 'asc'}],
    },
    {
      title: 'Category',
      name: 'categoryAsc',
      by: [{field: 'category', direction: 'asc'}],
    },
    {
      title: 'Last Fetched',
      name: 'lastFetchedDesc',
      by: [{field: 'lastFetched', direction: 'desc'}],
    },
  ],
})
