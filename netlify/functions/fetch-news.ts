// Netlify Function: Fetch News Headlines
// Fetches headlines from multiple news sources including:
// - Google News (free, RSS-based)
// - NewsAPI (freemium, API key required)
// - The Guardian (free tier available)
// - BBC News (free, RSS-based)
// - MediaStack (freemium)
// - New York Times (API key required)

// ============================================
// IN-MEMORY SERVER-SIDE CACHE
// Reduces redundant API calls within the same serverless instance
// ============================================
interface CacheEntry {
  headlines: Headline[];
  timestamp: number;
  expiresAt: number;
}

const SERVER_CACHE: Map<string, CacheEntry> = new Map();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes server-side cache

function getCacheKey(topic: string, sources: string[]): string {
  return `${topic.toLowerCase().trim()}_${sources.sort().join('_')}`;
}

function getFromServerCache(key: string): Headline[] | null {
  const entry = SERVER_CACHE.get(key);
  if (!entry) return null;
  
  // Check if expired
  if (Date.now() > entry.expiresAt) {
    SERVER_CACHE.delete(key);
    return null;
  }
  
  console.log(`[fetch-news] SERVER CACHE HIT for "${key}" (${entry.headlines.length} headlines)`);
  return entry.headlines;
}

function setServerCache(key: string, headlines: Headline[]): void {
  SERVER_CACHE.set(key, {
    headlines,
    timestamp: Date.now(),
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  
  // Cleanup old entries (keep cache size reasonable)
  if (SERVER_CACHE.size > 50) {
    const oldestKey = SERVER_CACHE.keys().next().value;
    if (oldestKey) SERVER_CACHE.delete(oldestKey);
  }
  
  console.log(`[fetch-news] Cached ${headlines.length} headlines for "${key}" (cache size: ${SERVER_CACHE.size})`);
}

// Handler types for Netlify Functions
interface HandlerEvent {
  httpMethod: string;
  body: string | null;
  headers: Record<string, string>;
  queryStringParameters: Record<string, string> | null;
}

// Types
interface Headline {
  id: string;
  title: string;
  description?: string;
  source: {
    name: string;
    type: string;
    url: string;
    reliability?: number; // 1-5 scale
    category?: string;
  };
  url: string;
  publishedAt: string;
  imageUrl?: string;
  selected?: boolean;
  author?: string;
  keywords?: string[];
}

interface RequestBody {
  topic: string;
  sources: string[];
  maxResults?: number;
  language?: string;
  country?: string;
  category?: string;
  fromDate?: string; // ISO date string
  bypassCache?: boolean; // Option to bypass server cache
}

// Parse Google News RSS
function parseGoogleNewsRSS(xmlString: string): Headline[] {
  const headlines: Headline[] = [];
  
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
      
      const imgMatch = /<img.*?src="(.*?)"/.exec(description);
      const imageUrl = imgMatch ? imgMatch[1] : undefined;
      
      const cleanDescription = description
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();
      
      headlines.push({
        id: `google-news-${index}-${Date.now()}`,
        title,
        description: cleanDescription || undefined,
        source: {
          name: sourceName,
          type: 'google-news',
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

// Fetch Google News headlines
async function fetchGoogleNews(topic: string, maxResults: number, language: string = 'en'): Promise<Headline[]> {
  const encodedTopic = encodeURIComponent(topic);
  const url = `https://news.google.com/rss/search?q=${encodedTopic}&hl=${language}&gl=US&ceid=US:${language}`;
  
  console.log(`[fetch-news] Fetching Google News for topic: "${topic}"`);
  console.log(`[fetch-news] URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    
    console.log(`[fetch-news] Google News response status: ${response.status}`);
    
    if (!response.ok) {
      console.error(`[fetch-news] Google News fetch failed: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const xmlText = await response.text();
    console.log(`[fetch-news] Received XML length: ${xmlText.length} characters`);
    console.log(`[fetch-news] XML preview: ${xmlText.substring(0, 200)}...`);
    
    const headlines = parseGoogleNewsRSS(xmlText);
    console.log(`[fetch-news] Parsed ${headlines.length} headlines from Google News`);
    
    return headlines.slice(0, maxResults);
  } catch (error) {
    console.error(`[fetch-news] Error fetching Google News:`, error);
    return [];
  }
}

// Fetch NewsAPI headlines
async function fetchNewsAPI(topic: string, maxResults: number): Promise<Headline[]> {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) {
    console.warn('NEWSAPI_KEY not configured');
    return [];
  }
  
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
    console.error(`NewsAPI fetch failed: ${response.status}`);
    return [];
  }
  
  const data = await response.json();
  
  return (data.articles || []).map((article: any, index: number) => ({
    id: `newsapi-${index}-${Date.now()}`,
    title: article.title,
    description: article.description,
    source: {
      name: article.source?.name || 'NewsAPI',
      type: 'newsapi',
      url: article.url,
    },
    url: article.url,
    publishedAt: article.publishedAt,
    imageUrl: article.urlToImage,
    selected: false,
  }));
}

// Fetch Guardian headlines
async function fetchGuardian(topic: string, maxResults: number): Promise<Headline[]> {
  const apiKey = process.env.GUARDIAN_API_KEY;
  if (!apiKey) {
    console.warn('GUARDIAN_API_KEY not configured');
    return [];
  }
  
  const url = new URL('https://content.guardianapis.com/search');
  url.searchParams.set('q', topic);
  url.searchParams.set('show-fields', 'headline,trailText,thumbnail,byline');
  url.searchParams.set('page-size', String(maxResults));
  url.searchParams.set('order-by', 'newest');
  url.searchParams.set('api-key', apiKey);
  
  console.log(`[fetch-news] Fetching Guardian for topic: "${topic}"`);
  
  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error(`Guardian API fetch failed: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    return (data.response?.results || []).map((article: any, index: number) => ({
      id: `guardian-${index}-${Date.now()}`,
      title: article.fields?.headline || article.webTitle,
      description: article.fields?.trailText,
      source: {
        name: 'The Guardian',
        type: 'guardian',
        url: article.webUrl,
        reliability: 4,
        category: article.sectionName,
      },
      url: article.webUrl,
      publishedAt: article.webPublicationDate,
      imageUrl: article.fields?.thumbnail,
      author: article.fields?.byline,
      selected: false,
    }));
  } catch (error) {
    console.error(`[fetch-news] Guardian fetch error:`, error);
    return [];
  }
}

// Fetch MediaStack headlines (freemium API)
async function fetchMediaStack(topic: string, maxResults: number, country: string = 'us'): Promise<Headline[]> {
  const apiKey = process.env.MEDIASTACK_API_KEY;
  if (!apiKey) {
    console.warn('MEDIASTACK_API_KEY not configured');
    return [];
  }
  
  // MediaStack free tier uses HTTP only
  const url = new URL('http://api.mediastack.com/v1/news');
  url.searchParams.set('access_key', apiKey);
  url.searchParams.set('keywords', topic);
  url.searchParams.set('countries', country);
  url.searchParams.set('limit', String(maxResults));
  url.searchParams.set('sort', 'published_desc');
  url.searchParams.set('languages', 'en');
  
  console.log(`[fetch-news] Fetching MediaStack for topic: "${topic}"`);
  
  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error(`MediaStack fetch failed: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.error(`MediaStack API error:`, data.error);
      return [];
    }
    
    return (data.data || []).map((article: any, index: number) => ({
      id: `mediastack-${index}-${Date.now()}`,
      title: article.title,
      description: article.description,
      source: {
        name: article.source || 'MediaStack',
        type: 'mediastack',
        url: article.url,
        reliability: 3,
        category: article.category,
      },
      url: article.url,
      publishedAt: article.published_at,
      imageUrl: article.image,
      author: article.author,
      selected: false,
    }));
  } catch (error) {
    console.error(`[fetch-news] MediaStack fetch error:`, error);
    return [];
  }
}

// Fetch New York Times headlines
async function fetchNYTimes(topic: string, maxResults: number): Promise<Headline[]> {
  const apiKey = process.env.NYTIMES_API_KEY;
  if (!apiKey) {
    console.warn('NYTIMES_API_KEY not configured');
    return [];
  }
  
  const url = new URL('https://api.nytimes.com/svc/search/v2/articlesearch.json');
  url.searchParams.set('q', topic);
  url.searchParams.set('sort', 'newest');
  url.searchParams.set('api-key', apiKey);
  
  console.log(`[fetch-news] Fetching NYTimes for topic: "${topic}"`);
  
  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error(`NYTimes fetch failed: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    return (data.response?.docs || []).slice(0, maxResults).map((article: any, index: number) => {
      // Find main image
      const mainImage = article.multimedia?.find((m: any) => m.subtype === 'xlarge' || m.type === 'image');
      const imageUrl = mainImage ? `https://www.nytimes.com/${mainImage.url}` : undefined;
      
      return {
        id: `nytimes-${index}-${Date.now()}`,
        title: article.headline?.main || article.headline?.print_headline,
        description: article.abstract || article.lead_paragraph,
        source: {
          name: 'The New York Times',
          type: 'nytimes',
          url: article.web_url,
          reliability: 5,
          category: article.section_name,
        },
        url: article.web_url,
        publishedAt: article.pub_date,
        imageUrl,
        author: article.byline?.original?.replace('By ', ''),
        keywords: article.keywords?.map((k: any) => k.value) || [],
        selected: false,
      };
    });
  } catch (error) {
    console.error(`[fetch-news] NYTimes fetch error:`, error);
    return [];
  }
}

// Fetch Reuters headlines via RSS
async function fetchReuters(topic: string, maxResults: number): Promise<Headline[]> {
  // Reuters category feeds
  const categoryFeeds: Record<string, string> = {
    'business': 'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best',
    'technology': 'https://www.reutersagency.com/feed/?best-topics=tech&post_type=best',
    'world': 'https://www.reutersagency.com/feed/?best-topics=world&post_type=best',
    'politics': 'https://www.reutersagency.com/feed/?best-topics=political-general&post_type=best',
    'default': 'https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best',
  };
  
  const topicLower = topic.toLowerCase();
  let feedUrl = categoryFeeds['default'];
  
  for (const [category, url] of Object.entries(categoryFeeds)) {
    if (topicLower.includes(category)) {
      feedUrl = url;
      break;
    }
  }
  
  console.log(`[fetch-news] Fetching Reuters from: ${feedUrl}`);
  
  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    
    if (!response.ok) {
      console.error(`[fetch-news] Reuters fetch failed: ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const headlines = parseGenericRSS(xmlText, 'reuters');
    
    // Add reliability and filter
    const filtered = headlines.map(h => ({
      ...h,
      source: { ...h.source, reliability: 5, name: 'Reuters' },
    }));
    
    // Return all - strict filtering will happen at the end
    return filtered.slice(0, maxResults);
  } catch (error) {
    console.error(`[fetch-news] Reuters fetch error:`, error);
    return [];
  }
}

// Fetch Associated Press via RSS
async function fetchAP(topic: string, maxResults: number): Promise<Headline[]> {
  // AP RSS feeds
  const feedUrl = 'https://rsshub.app/apnews/topics/apf-topnews';
  
  console.log(`[fetch-news] Fetching AP News`);
  
  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    
    if (!response.ok) {
      console.error(`[fetch-news] AP fetch failed: ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const headlines = parseGenericRSS(xmlText, 'ap');
    
    // Add reliability
    const filtered = headlines.map(h => ({
      ...h,
      source: { ...h.source, reliability: 5, name: 'Associated Press' },
    }));
    
    // Return all - strict filtering will happen at the end
    return filtered.slice(0, maxResults);
  } catch (error) {
    console.error(`[fetch-news] AP fetch error:`, error);
    return [];
  }
}

// Deduplicate headlines
function deduplicateHeadlines(headlines: Headline[]): Headline[] {
  const seen = new Set<string>();
  const unique: Headline[] = [];
  
  for (const headline of headlines) {
    const normalized = headline.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const words = normalized.split(' ');
    const key = words.slice(0, 5).join(' ');
    
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(headline);
    }
  }
  
  return unique;
}

// Strict topic matching - filters headlines that actually match the search topic
function strictTopicFilter(headlines: Headline[], topic: string): Headline[] {
  // Normalize the topic into searchable terms
  const topicLower = topic.toLowerCase().trim();
  
  // Special broad categories that should return most/all headlines from relevant feeds
  // These are categories where the feed itself is already filtered (BBC World, etc.)
  const broadCategories = [
    'latest', 'breaking', 'world', 'international', 'global', 
    'top stories', 'headlines', 'news', 'current events'
  ];
  
  // Check if this is a broad category search
  const isBroadCategory = broadCategories.some(cat => topicLower.includes(cat));
  
  if (isBroadCategory) {
    console.log(`[fetch-news] Broad category "${topic}" - returning all headlines from feeds`);
    return headlines; // Return all headlines for broad categories
  }
  
  // Split topic into individual keywords (handle multi-word searches)
  const topicKeywords = topicLower
    .split(/[\s,]+/)
    .filter(word => word.length > 2) // Ignore very short words
    .map(word => word.replace(/[^\w]/g, '')); // Remove special chars
  
  // Common words to ignore in matching
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just'
  ]);
  
  // Filter out stop words from search keywords
  const meaningfulKeywords = topicKeywords.filter(word => !stopWords.has(word));
  
  // If no meaningful keywords after filtering, use original keywords
  const searchKeywords = meaningfulKeywords.length > 0 ? meaningfulKeywords : topicKeywords;
  
  console.log(`[fetch-news] Strict filter - searching for keywords: ${searchKeywords.join(', ')}`);
  
  return headlines.filter(headline => {
    const titleLower = headline.title.toLowerCase();
    const descLower = (headline.description || '').toLowerCase();
    const combinedText = `${titleLower} ${descLower}`;
    
    // Check if ANY of the search keywords appear in title or description
    const hasMatch = searchKeywords.some(keyword => {
      // Check for exact word match or partial match for longer keywords
      if (keyword.length >= 4) {
        return combinedText.includes(keyword);
      } else {
        // For short keywords, require word boundary match
        const wordBoundaryRegex = new RegExp(`\\b${keyword}\\b`, 'i');
        return wordBoundaryRegex.test(combinedText);
      }
    });
    
    return hasMatch;
  });
}

// Fetch BBC News RSS (reliable fallback)
async function fetchBBCNews(topic: string, maxResults: number): Promise<Headline[]> {
  // BBC RSS feeds by category (use HTTPS)
  const categoryFeeds: Record<string, string> = {
    'world': 'https://feeds.bbci.co.uk/news/world/rss.xml',
    'international': 'https://feeds.bbci.co.uk/news/world/rss.xml',
    'global': 'https://feeds.bbci.co.uk/news/world/rss.xml',
    'politics': 'https://feeds.bbci.co.uk/news/politics/rss.xml',
    'government': 'https://feeds.bbci.co.uk/news/politics/rss.xml',
    'technology': 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    'tech': 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    'ai': 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    'artificial': 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    'business': 'https://feeds.bbci.co.uk/news/business/rss.xml',
    'economy': 'https://feeds.bbci.co.uk/news/business/rss.xml',
    'market': 'https://feeds.bbci.co.uk/news/business/rss.xml',
    'stocks': 'https://feeds.bbci.co.uk/news/business/rss.xml',
    'science': 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
    'health': 'https://feeds.bbci.co.uk/news/health/rss.xml',
    'medical': 'https://feeds.bbci.co.uk/news/health/rss.xml',
    'entertainment': 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
    'latest': 'https://feeds.bbci.co.uk/news/rss.xml',
    'breaking': 'https://feeds.bbci.co.uk/news/rss.xml',
    'default': 'https://feeds.bbci.co.uk/news/rss.xml',
  };
  
  // Try to match topic to a category
  const topicLower = topic.toLowerCase();
  let feedUrl = categoryFeeds['default'];
  
  for (const [category, url] of Object.entries(categoryFeeds)) {
    if (topicLower.includes(category)) {
      feedUrl = url;
      break;
    }
  }
  
  console.log(`[fetch-news] Fetching BBC News from: ${feedUrl}`);
  
  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    
    if (!response.ok) {
      console.error(`[fetch-news] BBC fetch failed: ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    console.log(`[fetch-news] BBC RSS length: ${xmlText.length}`);
    
    const headlines = parseGenericRSS(xmlText, 'bbc');
    console.log(`[fetch-news] Parsed ${headlines.length} BBC headlines`);
    
    // Strict filter - only return headlines that match the topic
    // Don't fallback to returning everything
    return headlines.slice(0, maxResults);
  } catch (error) {
    console.error(`[fetch-news] BBC fetch error:`, error);
    return [];
  }
}

// Parse generic RSS (works with most feeds including BBC)
function parseGenericRSS(xmlString: string, sourceType: string): Headline[] {
  const headlines: Headline[] = [];
  
  // More flexible regex patterns for BBC RSS format
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  
  let match;
  let index = 0;
  
  while ((match = itemRegex.exec(xmlString)) !== null && index < 50) {
    const itemContent = match[1];
    
    // Extract title - handle CDATA
    let title = '';
    const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    if (titleMatch) {
      title = titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '').trim();
    }
    
    // Extract link
    let url = '';
    const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
    if (linkMatch) {
      url = linkMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    }
    
    // Extract pubDate
    let publishedAt = new Date().toISOString();
    const pubDateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);
    if (pubDateMatch) {
      try {
        publishedAt = new Date(pubDateMatch[1]).toISOString();
      } catch (e) {
        publishedAt = new Date().toISOString();
      }
    }
    
    // Extract description - handle CDATA
    let description = '';
    const descMatch = itemContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
    if (descMatch) {
      description = descMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '').trim();
    }
    
    // Extract image from media:thumbnail
    let imageUrl: string | undefined;
    const mediaMatch = itemContent.match(/<media:thumbnail[^>]*url="([^"]+)"/);
    if (mediaMatch) {
      imageUrl = mediaMatch[1];
    }
    
    if (title && url) {
      headlines.push({
        id: `${sourceType}-${index}-${Date.now()}`,
        title,
        description: description || undefined,
        source: {
          name: sourceType === 'bbc' ? 'BBC News' : sourceType.toUpperCase(),
          type: sourceType,
          url,
        },
        url,
        publishedAt,
        imageUrl,
        selected: false,
      });
        
      index++;
    }
  }
  
  return headlines;
}

// Main handler
export const handler = async (event: HandlerEvent) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
  
  try {
    const body: RequestBody = JSON.parse(event.body || '{}');
    const { topic, sources, maxResults = 20, language = 'en', country = 'us', bypassCache = false } = body;
    
    if (!topic) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Topic is required' }),
      };
    }
    
    if (!sources || sources.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'At least one source is required' }),
      };
    }
    
    // Check server-side cache first (unless bypass requested)
    const cacheKey = getCacheKey(topic, sources);
    if (!bypassCache) {
      const cachedHeadlines = getFromServerCache(cacheKey);
      if (cachedHeadlines) {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
          },
          body: JSON.stringify({
            headlines: cachedHeadlines.slice(0, maxResults),
            totalResults: Math.min(cachedHeadlines.length, maxResults),
            searchedAt: new Date().toISOString(),
            sources,
            cached: true,
            query: topic,
          }),
        };
      }
    }
    
    console.log(`[fetch-news] ${bypassCache ? 'BYPASS CACHE - ' : 'CACHE MISS - '}Starting fetch for topic: "${topic}" from sources: ${sources.join(', ')}`);
    
    const headlines: Headline[] = [];
    const resultsPerSource = Math.ceil(maxResults / sources.length);
    const sourceResults: Record<string, number> = {};
    
    // Fetch from each source in parallel
    const fetchPromises = sources.map(async (source) => {
      try {
        let result: Headline[] = [];
        
        switch (source) {
          case 'google-news':
            result = await fetchGoogleNews(topic, resultsPerSource, language);
            break;
          case 'newsapi':
            result = await fetchNewsAPI(topic, resultsPerSource);
            break;
          case 'guardian':
            result = await fetchGuardian(topic, resultsPerSource);
            break;
          case 'bbc':
            result = await fetchBBCNews(topic, resultsPerSource);
            break;
          case 'mediastack':
            result = await fetchMediaStack(topic, resultsPerSource, country);
            break;
          case 'nytimes':
            result = await fetchNYTimes(topic, resultsPerSource);
            break;
          case 'reuters':
            result = await fetchReuters(topic, resultsPerSource);
            break;
          case 'ap':
            result = await fetchAP(topic, resultsPerSource);
            break;
          default:
            console.log(`[fetch-news] Unknown source: ${source}`);
            return [];
        }
        
        sourceResults[source] = result.length;
        return result;
      } catch (error) {
        console.error(`Error fetching from ${source}:`, error);
        sourceResults[source] = 0;
        return [];
      }
    });
    
    const results = await Promise.all(fetchPromises);
    results.forEach(result => headlines.push(...result));
    
    // Sort by date and deduplicate
    headlines.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    
    const dedupedHeadlines = deduplicateHeadlines(headlines);
    
    // STRICT TOPIC FILTER: Only return headlines that actually match the search topic
    const filteredHeadlines = strictTopicFilter(dedupedHeadlines, topic);
    
    console.log(`[fetch-news] After strict filter: ${filteredHeadlines.length} of ${dedupedHeadlines.length} headlines match topic "${topic}"`);
    
    const uniqueHeadlines = filteredHeadlines.slice(0, maxResults);
    
    console.log(`[fetch-news] Fetch complete. Total: ${uniqueHeadlines.length} unique headlines`);
    console.log(`[fetch-news] Source breakdown:`, sourceResults);
    
    // Cache the results for subsequent requests
    if (uniqueHeadlines.length > 0) {
      setServerCache(cacheKey, filteredHeadlines); // Cache all filtered, not just sliced
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
      },
      body: JSON.stringify({
        headlines: uniqueHeadlines,
        totalResults: uniqueHeadlines.length,
        searchedAt: new Date().toISOString(),
        sources,
        sourceResults,
        query: topic,
        cached: false,
        filterStats: {
          beforeFilter: dedupedHeadlines.length,
          afterFilter: filteredHeadlines.length,
        },
      }),
    };
  } catch (error) {
    console.error('Fetch news error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to fetch headlines',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
