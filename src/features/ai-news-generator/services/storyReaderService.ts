// Story Reader Service
// Extracts full article content from URLs using various methods

import type {
  Headline,
  StoryContent,
  StoryReadRequest,
  StoryReadResponse,
} from '../types';

/**
 * Extract article content from a URL
 * This function should be called from a serverless function due to CORS
 */
export async function extractArticleContent(
  url: string,
  title: string,
  headlineId: string
): Promise<StoryContent> {
  const startTime = Date.now();

  try {
    // Fetch the page HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Extract content using multiple strategies
    const content = extractContentFromHTML(html);
    const author = extractAuthor(html);
    const publishedAt = extractPublishedDate(html);
    const source = extractSourceName(url, html);

    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const readingTime = Math.ceil(wordCount / 200);

    return {
      headlineId,
      url,
      title,
      content,
      author,
      publishedAt: publishedAt || new Date().toISOString(),
      source,
      wordCount,
      readingTime,
      extractedAt: new Date().toISOString(),
      success: true,
    };
  } catch (error) {
    return {
      headlineId,
      url,
      title,
      content: '',
      publishedAt: new Date().toISOString(),
      source: extractSourceFromUrl(url),
      wordCount: 0,
      readingTime: 0,
      extractedAt: new Date().toISOString(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Extract main content from HTML using multiple strategies
 */
function extractContentFromHTML(html: string): string {
  // Remove scripts, styles, and other non-content elements
  let cleanHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Strategy 1: Look for article tag
  const articleMatch = cleanHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    return cleanTextFromHTML(articleMatch[1]);
  }

  // Strategy 2: Look for common content classes/IDs
  const contentSelectors = [
    /<div[^>]*class="[^"]*(?:article-body|article-content|story-body|post-content|entry-content|content-body|main-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*id="[^"]*(?:article-body|article-content|story-body|post-content|entry-content|content-body|main-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
  ];

  for (const selector of contentSelectors) {
    const match = selector.exec(cleanHtml);
    if (match && match[1].length > 500) {
      return cleanTextFromHTML(match[1]);
    }
  }

  // Strategy 3: Look for paragraphs within main tag
  const mainMatch = cleanHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) {
    return cleanTextFromHTML(mainMatch[1]);
  }

  // Strategy 4: Extract all paragraphs and filter
  const paragraphs = extractParagraphs(cleanHtml);
  if (paragraphs.length > 0) {
    return paragraphs.join('\n\n');
  }

  // Fallback: Clean the entire body
  const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    return cleanTextFromHTML(bodyMatch[1]);
  }

  return '';
}

/**
 * Extract paragraphs from HTML
 */
function extractParagraphs(html: string): string[] {
  const paragraphs: string[] = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  
  let match;
  while ((match = pRegex.exec(html)) !== null) {
    const text = cleanTextFromHTML(match[1]).trim();
    // Filter out short paragraphs that are likely navigation/metadata
    if (text.length > 50 && !isLikelyMetadata(text)) {
      paragraphs.push(text);
    }
  }

  return paragraphs;
}

/**
 * Check if text is likely metadata rather than content
 */
function isLikelyMetadata(text: string): boolean {
  const metadataPatterns = [
    /^share this/i,
    /^follow us/i,
    /^subscribe/i,
    /^sign up/i,
    /^advertisement/i,
    /^sponsored/i,
    /^related:/i,
    /^read more:/i,
    /^see also:/i,
    /^tags:/i,
    /^categories:/i,
    /^\d+ comments?$/i,
    /^copyright/i,
    /^all rights reserved/i,
  ];

  return metadataPatterns.some(pattern => pattern.test(text));
}

/**
 * Clean HTML and extract plain text
 */
function cleanTextFromHTML(html: string): string {
  return html
    // Replace block elements with newlines
    .replace(/<\/?(p|div|br|h[1-6]|li|blockquote)[^>]*>/gi, '\n')
    // Remove all remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&#\d+;/g, '')
    // Clean up whitespace
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Extract author from HTML
 */
function extractAuthor(html: string): string | undefined {
  // Try meta tags first
  const authorMetaPatterns = [
    /<meta[^>]*name="author"[^>]*content="([^"]+)"/i,
    /<meta[^>]*property="article:author"[^>]*content="([^"]+)"/i,
    /<meta[^>]*name="byl"[^>]*content="([^"]+)"/i,
  ];

  for (const pattern of authorMetaPatterns) {
    const match = html.match(pattern);
    if (match) {
      return cleanTextFromHTML(match[1]);
    }
  }

  // Try common author patterns in content
  const contentPatterns = [
    /<[^>]*class="[^"]*author[^"]*"[^>]*>([^<]+)</i,
    /By\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/,
  ];

  for (const pattern of contentPatterns) {
    const match = html.match(pattern);
    if (match && match[1].length < 100) {
      return cleanTextFromHTML(match[1]);
    }
  }

  return undefined;
}

/**
 * Extract published date from HTML
 */
function extractPublishedDate(html: string): string | undefined {
  // Try meta tags first
  const dateMetaPatterns = [
    /<meta[^>]*property="article:published_time"[^>]*content="([^"]+)"/i,
    /<meta[^>]*name="pubdate"[^>]*content="([^"]+)"/i,
    /<meta[^>]*name="date"[^>]*content="([^"]+)"/i,
    /<time[^>]*datetime="([^"]+)"/i,
  ];

  for (const pattern of dateMetaPatterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        return new Date(match[1]).toISOString();
      } catch {
        continue;
      }
    }
  }

  // Try JSON-LD
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      if (jsonLd.datePublished) {
        return new Date(jsonLd.datePublished).toISOString();
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  return undefined;
}

/**
 * Extract source name from HTML or URL
 */
function extractSourceName(url: string, html: string): string {
  // Try meta tags
  const siteNameMatch = html.match(/<meta[^>]*property="og:site_name"[^>]*content="([^"]+)"/i);
  if (siteNameMatch) {
    return siteNameMatch[1];
  }

  // Fall back to URL
  return extractSourceFromUrl(url);
}

/**
 * Extract source name from URL
 */
function extractSourceFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    // Remove www. and common TLDs
    return hostname
      .replace(/^www\./i, '')
      .replace(/\.(com|org|net|co\.uk|io)$/i, '')
      .split('.')[0]
      .charAt(0).toUpperCase() + hostname
      .replace(/^www\./i, '')
      .replace(/\.(com|org|net|co\.uk|io)$/i, '')
      .split('.')[0]
      .slice(1);
  } catch {
    return 'Unknown Source';
  }
}

/**
 * Read multiple stories from headlines
 */
export async function readStories(request: StoryReadRequest): Promise<StoryReadResponse> {
  const { headlines } = request;

  // Process in parallel with concurrency limit
  const concurrencyLimit = 3;
  const results: StoryContent[] = [];

  for (let i = 0; i < headlines.length; i += concurrencyLimit) {
    const batch = headlines.slice(i, i + concurrencyLimit);
    const batchResults = await Promise.all(
      batch.map(headline =>
        extractArticleContent(headline.url, headline.title, headline.id)
      )
    );
    results.push(...batchResults);
  }

  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;

  return {
    stories: results,
    successCount,
    failedCount,
  };
}

/**
 * Summarize a story for preview (using first N characters)
 */
export function summarizeStory(content: string, maxLength: number = 500): string {
  if (content.length <= maxLength) {
    return content;
  }

  // Try to cut at a sentence boundary
  const truncated = content.slice(0, maxLength);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? ')
  );

  if (lastSentenceEnd > maxLength * 0.7) {
    return truncated.slice(0, lastSentenceEnd + 1);
  }

  // Cut at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  return truncated.slice(0, lastSpace) + '...';
}

/**
 * Extract key quotes from story content
 */
export function extractQuotes(content: string): string[] {
  const quotes: string[] = [];
  
  // Match quoted text
  const quotePatterns = [
    /"([^"]{30,200})"/g,
    /'([^']{30,200})'/g,
    /"([^"]{30,200})"/g,
  ];

  for (const pattern of quotePatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const quote = match[1].trim();
      // Avoid duplicates and very long quotes
      if (!quotes.includes(quote) && quote.length < 300) {
        quotes.push(quote);
      }
    }
  }

  return quotes.slice(0, 10); // Return max 10 quotes
}

/**
 * Extract statistics/numbers from content
 */
export function extractStatistics(content: string): string[] {
  const stats: string[] = [];

  // Match sentences containing numbers/percentages
  const sentences = content.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    // Check if sentence contains statistics
    if (
      /\d+(?:\.\d+)?%/.test(trimmed) || // Percentages
      /\$[\d,]+(?:\.\d+)?(?:\s*(?:million|billion|trillion))?/i.test(trimmed) || // Dollar amounts
      /\d{1,3}(?:,\d{3})+/.test(trimmed) || // Large numbers with commas
      /(?:increased|decreased|grew|fell|rose|dropped)\s+(?:by\s+)?\d+/i.test(trimmed) // Change indicators
    ) {
      if (trimmed.length > 20 && trimmed.length < 200) {
        stats.push(trimmed);
      }
    }
  }

  return Array.from(new Set(stats)).slice(0, 10);
}
