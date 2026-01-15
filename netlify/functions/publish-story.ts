// Netlify Function: Publish Story to Sanity
// Creates a new article document in Sanity CMS

import { createClient, SanityClient } from '@sanity/client';

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

// Get or create a default AI author
async function getOrCreateAIAuthor(client: SanityClient): Promise<string> {
  // First, try to find existing AI author
  const existingAuthor = await client.fetch(
    `*[_type == "author" && slug.current == "ai-reporter"][0]._id`
  );
  
  if (existingAuthor) {
    return existingAuthor;
  }
  
  // Create a default AI author
  const author = await client.create({
    _type: 'author',
    name: 'AI Reporter',
    slug: {
      _type: 'slug',
      current: 'ai-reporter',
    },
    bio: [{
      _type: 'block',
      _key: 'bio-block',
      style: 'normal',
      children: [{
        _type: 'span',
        _key: 'bio-span',
        text: 'AI-generated content reviewed by Resonance editorial team.',
      }],
      markDefs: [],
    }],
  });
  
  return author._id;
}

// Get or create a default category
async function getOrCreateCategory(client: SanityClient, categoryName: string): Promise<string> {
  // Normalize category name
  const normalizedName = categoryName || 'News';
  const slug = normalizedName.toLowerCase().replace(/\s+/g, '-');
  
  // First, try to find existing category
  const existingCategory = await client.fetch(
    `*[_type == "category" && (slug.current == $slug || title == $name)][0]._id`,
    { slug, name: normalizedName }
  );
  
  if (existingCategory) {
    return existingCategory;
  }
  
  // Create the category
  const category = await client.create({
    _type: 'category',
    title: normalizedName,
    slug: {
      _type: 'slug',
      current: slug,
    },
    description: `Articles about ${normalizedName}`,
  });
  
  return category._id;
}

// Upload image from URL to Sanity
async function uploadImageFromUrl(client: SanityClient, imageUrl: string, alt: string): Promise<any> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    const filename = imageUrl.split('/').pop()?.split('?')[0] || 'featured-image.jpg';
    
    // Upload to Sanity
    const asset = await client.assets.upload('image', Buffer.from(buffer), {
      filename,
    });
    
    return {
      _type: 'image',
      asset: {
        _type: 'reference',
        _ref: asset._id,
      },
      alt,
    };
  } catch (error) {
    console.error('[publish-story] Image upload failed:', error);
    return null;
  }
}

// Create a placeholder image reference (optional - if no image provided)
async function getPlaceholderImage(client: SanityClient): Promise<any> {
  // Try to find an existing placeholder image in assets
  const existingAsset = await client.fetch(
    `*[_type == "sanity.imageAsset" && originalFilename == "ai-placeholder.jpg"][0]._id`
  );
  
  if (existingAsset) {
    return {
      _type: 'image',
      asset: {
        _type: 'reference',
        _ref: existingAsset,
      },
      alt: 'AI Generated Article',
    };
  }
  
  // Return null - the article will need an image added manually in Sanity
  return null;
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

    // Check if Sanity is configured
    const projectId = process.env.SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID;
    const token = process.env.SANITY_API_TOKEN;
    
    // If Sanity token is missing, return error with clear status
    if (!projectId || !token) {
      console.log('[publish-story] Sanity not configured');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          publishedToSanity: false,
          error: 'Sanity not configured',
          message: 'Configure SANITY_PROJECT_ID and SANITY_API_TOKEN with write permissions to publish to CMS.',
        }),
      };
    }

    try {
      const client = getSanityClient();
      
      console.log('[publish-story] Getting or creating AI author...');
      const authorId = await getOrCreateAIAuthor(client);
      console.log('[publish-story] Author ID:', authorId);
      
      console.log('[publish-story] Getting or creating category:', article.category);
      const categoryId = await getOrCreateCategory(client, article.category);
      console.log('[publish-story] Category ID:', categoryId);
      
      // Handle featured image
      let mainImage = null;
      if (article.featuredImage?.url) {
        console.log('[publish-story] Uploading featured image...');
        mainImage = await uploadImageFromUrl(
          client, 
          article.featuredImage.url, 
          article.featuredImage.alt || article.title
        );
      }
      
      // If no image was uploaded, try to get a placeholder
      if (!mainImage) {
        console.log('[publish-story] No image available, using placeholder...');
        mainImage = await getPlaceholderImage(client);
      }

      // Generate a deterministic document ID based on slug for idempotency
      const documentId = `article-${article.slug}`;
      
      // Only set publishedAt if publishing immediately, otherwise leave for scheduled/draft
      const publishedAt = publishImmediately ? new Date().toISOString() : (body.scheduledFor || null);

      // Create the document with all required fields
      const document = {
        _id: documentId,
        _type: 'article' as const,
        title: article.title,
        slug: {
          _type: 'slug' as const,
          current: article.slug,
        },
        excerpt: article.excerpt,
        body: bodyToPortableText(article.body),
        author: {
          _type: 'reference' as const,
          _ref: authorId,
        },
        categories: [{
          _type: 'reference' as const,
          _ref: categoryId,
        }],
        ...(publishedAt && { publishedAt }),
        mediaType: 'article',
        // AI-specific metadata stored for reference
        aiGenerated: true,
        aiMetadata: {
          generationModel: article.aiMetadata?.generationModel || 'unknown',
          factCheckModel: article.aiMetadata?.factCheckModel || 'unknown',
          biasCheckModel: article.aiMetadata?.biasCheckModel || 'unknown',
          totalTokensUsed: article.aiMetadata?.totalTokensUsed || 0,
          factCheckScore: article.aiMetadata?.factCheckScore || 0,
          biasScore: article.aiMetadata?.biasScore || 0,
          sourceUrls: article.sourceUrls || [],
          style: article.metadata?.style || 'standard',
          tone: article.metadata?.tone || 'neutral',
          wordCount: article.metadata?.wordCount || 0,
          readingTime: article.metadata?.readingTime || 0,
        },
        ...(mainImage && { mainImage }),
      };

      console.log('[publish-story] Creating/updating article in Sanity with ID:', documentId);
      // Use createOrReplace for idempotency - same slug = same document updated
      const result = await client.createOrReplace(document);
      console.log('[publish-story] Article saved with ID:', result._id);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          publishedToSanity: true,
          sanityDocumentId: result._id,
          publishedUrl: `/article/${article.slug}`,
          message: mainImage 
            ? (publishedAt ? 'Article published to Sanity CMS successfully!' : 'Article saved as draft in Sanity CMS!')
            : (publishedAt ? 'Article published! Note: Please add a featured image in Sanity Studio.' : 'Article saved as draft! Note: Please add a featured image in Sanity Studio.'),
          studioUrl: `https://${process.env.SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID}.sanity.studio/desk/article;${result._id}`,
          isPublished: !!publishedAt,
          scheduledFor: !publishImmediately ? body.scheduledFor : undefined,
        }),
      };
    } catch (sanityError) {
      // If Sanity fails, return clear error status
      console.error('[publish-story] Sanity publish failed:', sanityError);
      
      const errorMessage = sanityError instanceof Error ? sanityError.message : 'Unknown error';
      const isPermissionError = errorMessage.includes('permission') || errorMessage.includes('Insufficient');
      
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          publishedToSanity: false,
          error: isPermissionError ? 'Permission denied' : 'Sanity publish failed',
          message: isPermissionError 
            ? 'Sanity API token lacks write permissions. Update token at sanity.io/manage with Editor or Admin role.'
            : `Failed to publish to Sanity: ${errorMessage}`,
        }),
      };
    }
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
