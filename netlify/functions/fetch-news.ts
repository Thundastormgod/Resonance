// Netlify Function: Fetch News Headlines
// Fetches headlines from multiple news sources

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
  };
  url: string;
  publishedAt: string;
  imageUrl?: string;
  selected?: boolean;
}

interface RequestBody {
  topic: string;
  sources: string[];
  maxResults?: number;
  language?: string;
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
  url.searchParams.set('show-fields', 'headline,trailText,thumbnail');
  url.searchParams.set('page-size', String(maxResults));
  url.searchParams.set('order-by', 'newest');
  url.searchParams.set('api-key', apiKey);
  
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
    },
    url: article.webUrl,
    publishedAt: article.webPublicationDate,
    imageUrl: article.fields?.thumbnail,
    selected: false,
  }));
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

// Fetch BBC News RSS (reliable fallback)
async function fetchBBCNews(topic: string, maxResults: number): Promise<Headline[]> {
  // BBC RSS feeds by category (use HTTPS)
  const categoryFeeds: Record<string, string> = {
    'world': 'https://feeds.bbci.co.uk/news/world/rss.xml',
    'technology': 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    'tech': 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    'ai': 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    'artificial': 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    'business': 'https://feeds.bbci.co.uk/news/business/rss.xml',
    'science': 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
    'health': 'https://feeds.bbci.co.uk/news/health/rss.xml',
    'entertainment': 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
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
    
    // Filter by topic if possible
    const filtered = headlines.filter(h => 
      h.title.toLowerCase().includes(topicLower) || 
      (h.description && h.description.toLowerCase().includes(topicLower)) ||
      topicLower === 'news' || topicLower === 'latest'
    );
    
    return (filtered.length > 0 ? filtered : headlines).slice(0, maxResults);
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
    const { topic, sources, maxResults = 20, language = 'en' } = body;
    
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
    
    const headlines: Headline[] = [];
    const resultsPerSource = Math.ceil(maxResults / sources.length);
    
    // Fetch from each source in parallel
    const fetchPromises = sources.map(async (source) => {
      try {
        switch (source) {
          case 'google-news':
            return await fetchGoogleNews(topic, resultsPerSource, language);
          case 'newsapi':
            return await fetchNewsAPI(topic, resultsPerSource);
          case 'guardian':
            return await fetchGuardian(topic, resultsPerSource);
          case 'bbc':
            return await fetchBBCNews(topic, resultsPerSource);
          default:
            console.log(`[fetch-news] Unknown source: ${source}`);
            return [];
        }
      } catch (error) {
        console.error(`Error fetching from ${source}:`, error);
        return [];
      }
    });
    
    const results = await Promise.all(fetchPromises);
    results.forEach(result => headlines.push(...result));
    
    // Sort by date and deduplicate
    headlines.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    
    const uniqueHeadlines = deduplicateHeadlines(headlines).slice(0, maxResults);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        headlines: uniqueHeadlines,
        totalResults: uniqueHeadlines.length,
        searchedAt: new Date().toISOString(),
        sources,
        query: topic,
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
