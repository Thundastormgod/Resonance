// Google News Data Source Service
// Fetches headlines from Google News RSS feeds and other news sources

import type {
  DataSourceType,
  Headline,
  HeadlineSearchRequest,
  HeadlineSearchResponse,
  GoogleNewsConfig,
} from '../types';

const DEFAULT_GOOGLE_NEWS_CONFIG: GoogleNewsConfig = {
  language: 'en',
  country: 'US',
  maxResults: 20,
};

// Google News RSS feed URLs
const GOOGLE_NEWS_BASE_URL = 'https://news.google.com/rss';

/**
 * Build Google News RSS URL for topic search
 */
export function buildGoogleNewsUrl(
  topic: string,
  config: Partial<GoogleNewsConfig> = {}
): string {
  const { language, country } = { ...DEFAULT_GOOGLE_NEWS_CONFIG, ...config };
  const encodedTopic = encodeURIComponent(topic);
  
  // Google News search RSS format
  return `${GOOGLE_NEWS_BASE_URL}/search?q=${encodedTopic}&hl=${language}-${country}&gl=${country}&ceid=${country}:${language}`;
}

/**
 * Build Google News RSS URL for category/section
 */
export function buildGoogleNewsCategoryUrl(
  category: string,
  config: Partial<GoogleNewsConfig> = {}
): string {
  const { language, country } = { ...DEFAULT_GOOGLE_NEWS_CONFIG, ...config };
  
  const categoryMap: Record<string, string> = {
    'world': 'WORLD',
    'business': 'BUSINESS',
    'technology': 'TECHNOLOGY',
    'entertainment': 'ENTERTAINMENT',
    'sports': 'SPORTS',
    'science': 'SCIENCE',
    'health': 'HEALTH',
    'nation': 'NATION',
  };
  
  const section = categoryMap[category.toLowerCase()] || 'HEADLINES';
  return `${GOOGLE_NEWS_BASE_URL}/headlines/section/topic/${section}?hl=${language}-${country}&gl=${country}&ceid=${country}:${language}`;
}

/**
 * Parse Google News RSS XML to extract headlines
 */
export function parseGoogleNewsRSS(xmlString: string, sourceType: DataSourceType = 'google-news'): Headline[] {
  const headlines: Headline[] = [];
  
  // Parse RSS items using regex (works in browser/serverless)
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
  const linkRegex = /<link>(.*?)<\/link>/;
  const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
  const descriptionRegex = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/;
  const sourceRegex = /<source.*?url="(.*?)".*?>(.*?)<\/source>/;
  
  let match;
  let index = 0;
  
  while ((match = itemRegex.exec(xmlString)) !== null) {
    const itemContent = match[1];
    
    const titleMatch = titleRegex.exec(itemContent);
    const linkMatch = linkRegex.exec(itemContent);
    const pubDateMatch = pubDateRegex.exec(itemContent);
    const descriptionMatch = descriptionRegex.exec(itemContent);
    const sourceMatch = sourceRegex.exec(itemContent);
    
    if (titleMatch && linkMatch) {
      const title = (titleMatch[1] || titleMatch[2] || '').trim();
      const url = linkMatch[1].trim();
      const publishedAt = pubDateMatch ? pubDateMatch[1] : new Date().toISOString();
      const description = descriptionMatch ? (descriptionMatch[1] || descriptionMatch[2] || '') : '';
      const sourceName = sourceMatch ? sourceMatch[2] : 'Google News';
      const sourceUrl = sourceMatch ? sourceMatch[1] : url;
      
      // Extract image URL from description if present
      const imgMatch = /<img.*?src="(.*?)"/.exec(description);
      const imageUrl = imgMatch ? imgMatch[1] : undefined;
      
      // Clean description (remove HTML)
      const cleanDescription = description
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();
      
      headlines.push({
        id: `${sourceType}-${index}-${Date.now()}`,
        title,
        description: cleanDescription || undefined,
        source: {
          name: sourceName,
          type: sourceType,
          url: sourceUrl,
        },
        url,
        publishedAt: new Date(publishedAt).toISOString(),
        imageUrl,
        selected: false,
      });
      
      index++;
    }
  }
  
  return headlines;
}

/**
 * Fetch headlines from Google News via RSS
 * Note: This should be called from a serverless function due to CORS
 */
export async function fetchGoogleNewsHeadlines(
  topic: string,
  config: Partial<GoogleNewsConfig> = {}
): Promise<Headline[]> {
  const url = buildGoogleNewsUrl(topic, config);
  
  // This will be called from Netlify function, not directly from browser
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ResonanceBot/1.0)',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch Google News: ${response.status}`);
  }
  
  const xmlText = await response.text();
  const headlines = parseGoogleNewsRSS(xmlText, 'google-news');
  
  const maxResults = config.maxResults || DEFAULT_GOOGLE_NEWS_CONFIG.maxResults;
  return headlines.slice(0, maxResults);
}

/**
 * Fetch headlines from NewsAPI.org
 */
export async function fetchNewsAPIHeadlines(
  topic: string,
  apiKey: string,
  maxResults: number = 20
): Promise<Headline[]> {
  const url = new URL('https://newsapi.org/v2/everything');
  url.searchParams.set('q', topic);
  url.searchParams.set('sortBy', 'publishedAt');
  url.searchParams.set('pageSize', String(maxResults));
  url.searchParams.set('language', 'en');
  
  const response = await fetch(url.toString(), {
    headers: {
      'X-Api-Key': apiKey,
    },
  });
  
  if (!response.ok) {
    throw new Error(`NewsAPI error: ${response.status}`);
  }
  
  const data = await response.json();
  
  return data.articles.map((article: any, index: number) => ({
    id: `newsapi-${index}-${Date.now()}`,
    title: article.title,
    description: article.description,
    source: {
      name: article.source?.name || 'NewsAPI',
      type: 'newsapi' as DataSourceType,
      url: article.url,
    },
    url: article.url,
    publishedAt: article.publishedAt,
    imageUrl: article.urlToImage,
    selected: false,
  }));
}

/**
 * Fetch headlines from The Guardian API
 */
export async function fetchGuardianHeadlines(
  topic: string,
  apiKey: string,
  maxResults: number = 20
): Promise<Headline[]> {
  const url = new URL('https://content.guardianapis.com/search');
  url.searchParams.set('q', topic);
  url.searchParams.set('show-fields', 'headline,trailText,thumbnail');
  url.searchParams.set('page-size', String(maxResults));
  url.searchParams.set('order-by', 'newest');
  url.searchParams.set('api-key', apiKey);
  
  const response = await fetch(url.toString());
  
  if (!response.ok) {
    throw new Error(`Guardian API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  return data.response.results.map((article: any, index: number) => ({
    id: `guardian-${index}-${Date.now()}`,
    title: article.fields?.headline || article.webTitle,
    description: article.fields?.trailText,
    source: {
      name: 'The Guardian',
      type: 'guardian' as DataSourceType,
      url: article.webUrl,
    },
    url: article.webUrl,
    publishedAt: article.webPublicationDate,
    imageUrl: article.fields?.thumbnail,
    category: article.sectionName,
    selected: false,
  }));
}

/**
 * Fetch from generic RSS feed
 */
export async function fetchRSSHeadlines(
  feedUrl: string,
  sourceName: string,
  maxResults: number = 20
): Promise<Headline[]> {
  const response = await fetch(feedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ResonanceBot/1.0)',
    },
  });
  
  if (!response.ok) {
    throw new Error(`RSS fetch error: ${response.status}`);
  }
  
  const xmlText = await response.text();
  const headlines = parseGoogleNewsRSS(xmlText, 'rss');
  
  // Override source name
  return headlines.slice(0, maxResults).map(h => ({
    ...h,
    source: {
      ...h.source,
      name: sourceName,
    },
  }));
}

/**
 * Main function to search headlines across multiple sources
 */
export async function searchHeadlines(
  request: HeadlineSearchRequest
): Promise<HeadlineSearchResponse> {
  const {
    topic,
    sources,
    maxResults = 20,
    language = 'en',
  } = request;
  
  const headlines: Headline[] = [];
  const errors: string[] = [];
  
  // Fetch from each enabled source in parallel
  const fetchPromises = sources.map(async (source) => {
    try {
      switch (source) {
        case 'google-news':
          return await fetchGoogleNewsHeadlines(topic, {
            language,
            maxResults: Math.ceil(maxResults / sources.length),
          });
        
        case 'newsapi':
          // API key would come from environment/config
          const newsApiKey = process.env.NEWSAPI_KEY;
          if (newsApiKey) {
            return await fetchNewsAPIHeadlines(
              topic,
              newsApiKey,
              Math.ceil(maxResults / sources.length)
            );
          }
          return [];
        
        case 'guardian':
          const guardianKey = process.env.GUARDIAN_API_KEY;
          if (guardianKey) {
            return await fetchGuardianHeadlines(
              topic,
              guardianKey,
              Math.ceil(maxResults / sources.length)
            );
          }
          return [];
        
        default:
          return [];
      }
    } catch (error) {
      errors.push(`${source}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  });
  
  const results = await Promise.all(fetchPromises);
  
  // Combine and deduplicate headlines
  results.forEach(result => headlines.push(...result));
  
  // Sort by published date (newest first)
  headlines.sort((a, b) => 
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  
  // Remove duplicates by title similarity
  const uniqueHeadlines = deduplicateHeadlines(headlines);
  
  return {
    headlines: uniqueHeadlines.slice(0, maxResults),
    totalResults: uniqueHeadlines.length,
    searchedAt: new Date().toISOString(),
    sources,
    query: topic,
  };
}

/**
 * Remove duplicate headlines based on title similarity
 */
function deduplicateHeadlines(headlines: Headline[]): Headline[] {
  const seen = new Set<string>();
  const unique: Headline[] = [];
  
  for (const headline of headlines) {
    // Normalize title for comparison
    const normalized = headline.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Check if we've seen a similar title
    const words = normalized.split(' ');
    const key = words.slice(0, 5).join(' '); // First 5 words as key
    
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(headline);
    }
  }
  
  return unique;
}

/**
 * Filter headlines by date range
 */
export function filterHeadlinesByDate(
  headlines: Headline[],
  fromDate?: string,
  toDate?: string
): Headline[] {
  return headlines.filter(headline => {
    const pubDate = new Date(headline.publishedAt);
    
    if (fromDate && pubDate < new Date(fromDate)) {
      return false;
    }
    
    if (toDate && pubDate > new Date(toDate)) {
      return false;
    }
    
    return true;
  });
}

/**
 * Group headlines by source
 */
export function groupHeadlinesBySource(
  headlines: Headline[]
): Record<string, Headline[]> {
  return headlines.reduce((groups, headline) => {
    const sourceName = headline.source.name;
    if (!groups[sourceName]) {
      groups[sourceName] = [];
    }
    groups[sourceName].push(headline);
    return groups;
  }, {} as Record<string, Headline[]>);
}
