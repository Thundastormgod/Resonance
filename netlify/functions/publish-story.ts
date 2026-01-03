// Netlify Function: Publish Story to Sanity
// Creates a new article document in Sanity CMS

import { createClient } from '@sanity/client';

interface HandlerEvent {
  httpMethod: string;
  body: string | null;
}

interface FinalArticle {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  tags: string[];
  featuredImage?: {
    url: string;
    alt: string;
    caption?: string;
    credit?: string;
  };
  sourceUrls: string[];
  sourceHeadlines: string[];
  metadata: {
    style: string;
    tone: string;
    wordCount: number;
    readingTime: number;
  };
  aiMetadata: {
    generationModel: string;
    factCheckModel: string;
    biasCheckModel: string;
    totalTokensUsed: number;
    generationTime: number;
    factCheckScore: number;
    biasScore: number;
  };
  status: string;
  createdAt: string;
  publishedAt?: string;
}

interface RequestBody {
  article: FinalArticle;
  publishImmediately: boolean;
  scheduledFor?: string;
}

// Initialize Sanity client
function getSanityClient() {
  const projectId = process.env.SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID;
  const dataset = process.env.SANITY_DATASET || process.env.VITE_SANITY_DATASET || 'production';
  const token = process.env.SANITY_API_TOKEN;

  if (!projectId || !token) {
    throw new Error('Sanity configuration missing');
  }

  return createClient({
    projectId,
    dataset,
    token,
    apiVersion: '2024-01-01',
    useCdn: false,
  });
}

// Convert body text to Sanity portable text format
function bodyToPortableText(body: string): any[] {
  const paragraphs = body.split('\n\n').filter(p => p.trim());
  
  return paragraphs.map((paragraph, index) => {
    // Check if it's a heading
    if (paragraph.startsWith('# ')) {
      return {
        _type: 'block',
        _key: `block-${index}`,
        style: 'h2',
        children: [{ _type: 'span', _key: `span-${index}`, text: paragraph.replace(/^# /, '') }],
        markDefs: [],
      };
    }
    
    if (paragraph.startsWith('## ')) {
      return {
        _type: 'block',
        _key: `block-${index}`,
        style: 'h3',
        children: [{ _type: 'span', _key: `span-${index}`, text: paragraph.replace(/^## /, '') }],
        markDefs: [],
      };
    }

    // Check if it's a blockquote
    if (paragraph.startsWith('> ')) {
      return {
        _type: 'block',
        _key: `block-${index}`,
        style: 'blockquote',
        children: [{ _type: 'span', _key: `span-${index}`, text: paragraph.replace(/^> /, '') }],
        markDefs: [],
      };
    }

    // Regular paragraph
    return {
      _type: 'block',
      _key: `block-${index}`,
      style: 'normal',
      children: [{ _type: 'span', _key: `span-${index}`, text: paragraph }],
      markDefs: [],
    };
  });
}

// Main handler
export const handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body: RequestBody = JSON.parse(event.body || '{}');
    const { article, publishImmediately } = body;

    if (!article) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Article is required' }),
      };
    }

    const client = getSanityClient();

    // Create the document
    const document = {
      _type: 'generatedArticle',
      title: article.title,
      slug: {
        _type: 'slug',
        current: article.slug,
      },
      excerpt: article.excerpt,
      body: bodyToPortableText(article.body),
      category: article.category,
      tags: article.tags,
      sourceUrls: article.sourceUrls,
      metadata: {
        style: article.metadata.style,
        tone: article.metadata.tone,
        wordCount: article.metadata.wordCount,
        readingTime: article.metadata.readingTime,
      },
      aiMetadata: {
        generationModel: article.aiMetadata.generationModel,
        factCheckModel: article.aiMetadata.factCheckModel,
        biasCheckModel: article.aiMetadata.biasCheckModel,
        totalTokensUsed: article.aiMetadata.totalTokensUsed,
        factCheckScore: article.aiMetadata.factCheckScore,
        biasScore: article.aiMetadata.biasScore,
      },
      status: publishImmediately ? 'published' : 'pending',
      createdAt: new Date().toISOString(),
      publishedAt: publishImmediately ? new Date().toISOString() : null,
    };

    const result = await client.create(document);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        sanityDocumentId: result._id,
        publishedUrl: publishImmediately 
          ? `/article/${article.slug}` 
          : undefined,
      }),
    };
  } catch (error) {
    console.error('Publish error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to publish article',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
