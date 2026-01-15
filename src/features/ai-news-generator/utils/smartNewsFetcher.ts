// Smart News Fetcher
// Integrates rate limiting and caching with the fetch-news API

import { Headline, DataSourceType } from '../types';
import { 
  canMakeCall, 
  recordAPICall, 
  selectSourcesForFetch, 
  getUsageStats,
  API_LIMITS 
} from './apiRateLimiter';
import { 
  shouldUseCachedArticles, 
  cacheArticles, 
  getCachedArticles,
  getCacheStats 
} from './newsCache';

export interface FetchNewsOptions {
  topic: string;
  sources: DataSourceType[];
  maxResults?: number;
  language?: string;
  country?: string;
  category?: string;
  fromDate?: string;
  // Smart fetch options
  preferCache?: boolean; // Default true - prefer cached articles
  maxPaidCalls?: number; // Default 2 - max paid API calls per fetch
  cacheTTL?: number; // Default 4 hours
}

export interface FetchNewsResult {
  headlines: Headline[];
  fromCache: boolean;
  sourcesUsed: DataSourceType[];
  apiCallsMade: number;
  cacheHits: number;
  warnings: string[];
}

// Map our DataSourceType to API source names
const SOURCE_MAP: Record<DataSourceType, string> = {
  'google-news': 'google-news',
  'rss': 'rss',
  'newsapi': 'newsapi',
  'guardian': 'guardian',
  'bbc': 'bbc',
  'mediastack': 'mediastack',
  'reuters': 'reuters',
  'ap': 'ap',
  'nytimes': 'nytimes',
};

// Free sources that don't count against rate limits
const FREE_SOURCES: DataSourceType[] = ['google-news', 'bbc', 'reuters', 'ap', 'rss'];

/**
 * Smart news fetcher that:
 * 1. Checks cache first
 * 2. Applies rate limiting for paid APIs
 * 3. Falls back to free sources when limits are reached
 * 4. Caches results for future use
 */
export async function fetchNewsWithRateLimiting(
  options: FetchNewsOptions
): Promise<FetchNewsResult> {
  const {
    topic,
    sources,
    maxResults = 10,
    language = 'en',
    country,
    category,
    fromDate,
    preferCache = true,
    maxPaidCalls = 2,
    cacheTTL = 4,
  } = options;

  const warnings: string[] = [];
  let apiCallsMade = 0;
  let cacheHits = 0;

  // Step 1: Check cache if preferred
  if (preferCache) {
    const cacheCheck = shouldUseCachedArticles(topic, sources);
    if (cacheCheck.useCache) {
      console.log(`[SmartFetch] ${cacheCheck.reason}`);
      cacheHits = cacheCheck.cachedArticles.length;
      
      // Get unique source types from cache
      const uniqueSources = Array.from(
        new Set(cacheCheck.cachedArticles.map(a => a.cachedSourceType))
      );
      
      return {
        headlines: cacheCheck.cachedArticles.slice(0, maxResults),
        fromCache: true,
        sourcesUsed: uniqueSources,
        apiCallsMade: 0,
        cacheHits,
        warnings: [],
      };
    }
  }

  // Step 2: Select sources based on rate limits
  const selectedSources = selectSourcesForFetch(sources, maxPaidCalls);
  const sourcesUsed: DataSourceType[] = [];
  
  // Track which sources we couldn't use
  const skippedSources = sources.filter(s => !selectedSources.includes(s));
  if (skippedSources.length > 0) {
    warnings.push(`Skipped sources due to rate limits: ${skippedSources.join(', ')}`);
  }

  // Step 3: Check rate limits and record calls for paid sources
  const sourcesToFetch: DataSourceType[] = [];
  
  for (const source of selectedSources) {
    const typedSource = source as DataSourceType;
    const isFree = FREE_SOURCES.includes(typedSource);
    
    if (isFree) {
      sourcesToFetch.push(typedSource);
    } else {
      const check = canMakeCall(typedSource);
      if (check.allowed) {
        sourcesToFetch.push(typedSource);
        if (check.remaining !== undefined && check.remaining <= 10) {
          warnings.push(`Low API calls remaining for ${typedSource}: ${check.remaining}`);
        }
      } else {
        warnings.push(check.reason || `Cannot call ${typedSource}`);
      }
    }
  }

  // Step 4: Ensure we have at least one source
  if (sourcesToFetch.length === 0) {
    sourcesToFetch.push('google-news'); // Always fallback to free source
    warnings.push('All requested sources exhausted, falling back to Google News');
  }

  // Step 5: Make the API call
  try {
    const response = await fetch('/.netlify/functions/fetch-news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        sources: sourcesToFetch.map(s => SOURCE_MAP[s]),
        maxResults,
        language,
        country,
        category,
        fromDate,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const headlines: Headline[] = data.headlines || [];

    // Step 6: Record API calls for paid sources
    for (const source of sourcesToFetch) {
      if (!FREE_SOURCES.includes(source)) {
        recordAPICall(source);
        apiCallsMade++;
      }
      sourcesUsed.push(source);
    }

    // Step 7: Cache the results
    if (headlines.length > 0) {
      // Group by source and cache
      for (const source of sourcesToFetch) {
        const sourceHeadlines = headlines.filter(h => 
          h.source.type === SOURCE_MAP[source] || 
          (source === 'google-news' && h.source.name === 'Google News')
        );
        if (sourceHeadlines.length > 0) {
          cacheArticles(sourceHeadlines, source, cacheTTL);
        }
      }
    }

    return {
      headlines: headlines.slice(0, maxResults),
      fromCache: false,
      sourcesUsed,
      apiCallsMade,
      cacheHits: 0,
      warnings,
    };

  } catch (error) {
    console.error('[SmartFetch] API call failed:', error);
    
    // Try to return cached results on error
    const fallbackCache = getCachedArticles({ topic, limit: maxResults });
    if (fallbackCache.length > 0) {
      warnings.push('API call failed, returning cached results');
      return {
        headlines: fallbackCache,
        fromCache: true,
        sourcesUsed: [],
        apiCallsMade: 0,
        cacheHits: fallbackCache.length,
        warnings,
      };
    }
    
    throw error;
  }
}

/**
 * Get the current status of API usage and cache
 */
export function getNewsSystemStatus(): {
  apiUsage: ReturnType<typeof getUsageStats>;
  cache: ReturnType<typeof getCacheStats>;
  recommendations: string[];
} {
  const apiUsage = getUsageStats();
  const cache = getCacheStats();
  const recommendations: string[] = [];

  // Generate recommendations
  apiUsage.sources.forEach(source => {
    const remaining = source.limit - source.used;
    if (source.status === 'critical') {
      recommendations.push(
        `⚠️ ${source.source}: ${source.percentage}% used (${remaining} calls remaining). Consider using free sources.`
      );
    } else if (source.status === 'warning') {
      recommendations.push(
        `⚡ ${source.source}: ${source.percentage}% used. Monitor usage carefully.`
      );
    }
  });

  if (cache.totalArticles < 50) {
    recommendations.push(
      '💡 Cache is low. Consider prefetching trending topics to reduce API calls.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All systems nominal. API usage is within healthy limits.');
  }

  return {
    apiUsage,
    cache,
    recommendations,
  };
}

/**
 * Check if we should use a specific source or suggest alternatives
 */
export function getSourceRecommendation(requestedSource: DataSourceType): {
  canUse: boolean;
  alternative?: DataSourceType;
  reason: string;
} {
  const check = canMakeCall(requestedSource);
  
  if (check.allowed) {
    return {
      canUse: true,
      reason: `${requestedSource} available (${check.remaining} calls remaining)`,
    };
  }

  // Find alternative
  const config = API_LIMITS[requestedSource];
  
  // Suggest free alternative based on category
  if (config) {
    const freeAlternatives: Record<string, DataSourceType> = {
      'newsapi': 'google-news',
      'guardian': 'bbc',
      'mediastack': 'google-news',
      'nytimes': 'reuters',
    };
    
    const alternative = freeAlternatives[requestedSource] || 'google-news';
    
    return {
      canUse: false,
      alternative,
      reason: `${requestedSource} limit reached. Suggesting ${alternative} as free alternative.`,
    };
  }

  return {
    canUse: false,
    alternative: 'google-news',
    reason: 'Unknown source, defaulting to Google News',
  };
}

/**
 * Get optimal source mix for a topic
 */
export function getOptimalSourceMix(
  topic: string,
  preferredSources: DataSourceType[]
): DataSourceType[] {
  const optimal: DataSourceType[] = [];
  let paidCount = 0;
  const maxPaid = 2;

  // Topic-based source recommendations
  const topicLower = topic.toLowerCase();
  
  // Add topic-relevant free sources first
  if (topicLower.includes('tech') || topicLower.includes('ai') || topicLower.includes('software')) {
    if (!optimal.includes('google-news')) optimal.push('google-news');
  }
  if (topicLower.includes('business') || topicLower.includes('finance') || topicLower.includes('stock')) {
    if (!optimal.includes('reuters')) optimal.push('reuters');
  }
  if (topicLower.includes('politic') || topicLower.includes('uk') || topicLower.includes('europe')) {
    if (!optimal.includes('bbc')) optimal.push('bbc');
  }
  if (topicLower.includes('breaking') || topicLower.includes('urgent')) {
    if (!optimal.includes('ap')) optimal.push('ap');
  }

  // Add preferred sources if rate limit allows
  for (const source of preferredSources) {
    if (optimal.includes(source)) continue;
    
    const isFree = FREE_SOURCES.includes(source);
    if (isFree) {
      optimal.push(source);
    } else if (paidCount < maxPaid) {
      const check = canMakeCall(source);
      if (check.allowed && (check.remaining || 0) > 5) {
        optimal.push(source);
        paidCount++;
      }
    }
  }

  // Ensure at least one source
  if (optimal.length === 0) {
    optimal.push('google-news');
  }

  return optimal;
}
