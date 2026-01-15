// News Article Cache/Pool System
// Caches fetched articles to reduce API calls

import { Headline, DataSourceType } from '../types';

export interface CachedArticle extends Headline {
  cachedAt: string;
  expiresAt: string;
  cachedSourceType: DataSourceType; // Track which source type fetched this
}

export interface NewsCache {
  articles: CachedArticle[];
  lastUpdated: string;
  version: number;
}

export interface CacheStats {
  totalArticles: number;
  bySource: Record<string, number>;
  byCategory: Record<string, number>;
  oldestArticle: string | null;
  newestArticle: string | null;
  cacheSize: string;
}

const CACHE_KEY = 'resonance_news_cache';
const CACHE_VERSION = 1;
const DEFAULT_TTL_HOURS = 4; // Articles expire after 4 hours
const MAX_CACHE_SIZE = 500; // Maximum articles to store

// Get current cache
export function getNewsCache(): NewsCache {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) {
      return { articles: [], lastUpdated: new Date().toISOString(), version: CACHE_VERSION };
    }
    
    const cache = JSON.parse(stored) as NewsCache;
    
    // Version migration if needed
    if (cache.version !== CACHE_VERSION) {
      return { articles: [], lastUpdated: new Date().toISOString(), version: CACHE_VERSION };
    }
    
    // Remove expired articles
    const now = new Date();
    cache.articles = cache.articles.filter(article => 
      new Date(article.expiresAt) > now
    );
    
    return cache;
  } catch {
    return { articles: [], lastUpdated: new Date().toISOString(), version: CACHE_VERSION };
  }
}

// Save cache
function saveNewsCache(cache: NewsCache): void {
  try {
    // Enforce max size
    if (cache.articles.length > MAX_CACHE_SIZE) {
      // Keep newest articles
      cache.articles = cache.articles
        .sort((a, b) => new Date(b.cachedAt).getTime() - new Date(a.cachedAt).getTime())
        .slice(0, MAX_CACHE_SIZE);
    }
    
    cache.lastUpdated = new Date().toISOString();
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to save news cache:', e);
    // If storage is full, clear old entries
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      clearOldestArticles(100);
    }
  }
}

// Add articles to cache
export function cacheArticles(
  articles: Headline[],
  sourceType: DataSourceType,
  ttlHours: number = DEFAULT_TTL_HOURS
): void {
  const cache = getNewsCache();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);
  
  const newCachedArticles: CachedArticle[] = articles.map(article => ({
    ...article,
    cachedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    cachedSourceType: sourceType,
  }));
  
  // Deduplicate by URL
  const existingUrls = new Set(cache.articles.map(a => a.url));
  const uniqueNew = newCachedArticles.filter(a => !existingUrls.has(a.url));
  
  cache.articles = [...uniqueNew, ...cache.articles];
  saveNewsCache(cache);
  
  console.log(`Cached ${uniqueNew.length} new articles from ${sourceType}`);
}

// Get cached articles with filters
export function getCachedArticles(options: {
  sourceType?: DataSourceType;
  sourceName?: string;
  category?: string;
  topic?: string;
  maxAge?: number; // hours
  limit?: number;
}): CachedArticle[] {
  const cache = getNewsCache();
  let articles = cache.articles;
  
  // Filter by source type
  if (options.sourceType) {
    articles = articles.filter(a => a.cachedSourceType === options.sourceType);
  }
  
  // Filter by source name
  if (options.sourceName) {
    articles = articles.filter(a => 
      a.source.name.toLowerCase() === options.sourceName?.toLowerCase()
    );
  }
  
  // Filter by category
  if (options.category) {
    articles = articles.filter(a => 
      a.category?.toLowerCase() === options.category?.toLowerCase()
    );
  }
  
  // Filter by topic (search in title and description)
  if (options.topic) {
    const topicLower = options.topic.toLowerCase();
    articles = articles.filter(a => 
      a.title.toLowerCase().includes(topicLower) ||
      a.description?.toLowerCase().includes(topicLower)
    );
  }
  
  // Filter by max age
  if (options.maxAge) {
    const cutoff = new Date(Date.now() - options.maxAge * 60 * 60 * 1000);
    articles = articles.filter(a => new Date(a.cachedAt) > cutoff);
  }
  
  // Sort by cached time (newest first)
  articles = articles.sort((a, b) => 
    new Date(b.cachedAt).getTime() - new Date(a.cachedAt).getTime()
  );
  
  // Apply limit
  if (options.limit) {
    articles = articles.slice(0, options.limit);
  }
  
  return articles;
}

// Check if we have enough cached articles for a topic
export function hasCachedArticles(
  topic: string,
  minCount: number = 3,
  maxAgeHours: number = 2
): boolean {
  const articles = getCachedArticles({
    topic,
    maxAge: maxAgeHours,
  });
  
  return articles.length >= minCount;
}

// Get cache statistics
export function getCacheStats(): CacheStats {
  const cache = getNewsCache();
  
  const bySource: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  
  cache.articles.forEach(article => {
    const sourceName = article.source.name;
    bySource[sourceName] = (bySource[sourceName] || 0) + 1;
    if (article.category) {
      byCategory[article.category] = (byCategory[article.category] || 0) + 1;
    }
  });
  
  const sortedByDate = [...cache.articles].sort((a, b) => 
    new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  );
  
  // Estimate cache size
  const cacheSize = new Blob([JSON.stringify(cache)]).size;
  const formattedSize = cacheSize > 1024 * 1024 
    ? `${(cacheSize / (1024 * 1024)).toFixed(2)} MB`
    : `${(cacheSize / 1024).toFixed(2)} KB`;
  
  return {
    totalArticles: cache.articles.length,
    bySource,
    byCategory,
    oldestArticle: sortedByDate[0]?.publishedAt || null,
    newestArticle: sortedByDate[sortedByDate.length - 1]?.publishedAt || null,
    cacheSize: formattedSize,
  };
}

// Clear old articles
export function clearOldestArticles(count: number): void {
  const cache = getNewsCache();
  
  // Sort by cached time (oldest first)
  cache.articles = cache.articles
    .sort((a, b) => new Date(b.cachedAt).getTime() - new Date(a.cachedAt).getTime())
    .slice(0, Math.max(0, cache.articles.length - count));
  
  saveNewsCache(cache);
}

// Clear cache for a specific source type
export function clearSourceCache(sourceType: DataSourceType): void {
  const cache = getNewsCache();
  cache.articles = cache.articles.filter(a => a.cachedSourceType !== sourceType);
  saveNewsCache(cache);
}

// Clear entire cache
export function clearAllCache(): void {
  localStorage.removeItem(CACHE_KEY);
}

// Smart fetch decision - should we use cache or fetch new?
export function shouldUseCachedArticles(
  topic: string,
  requestedSources: DataSourceType[]
): {
  useCache: boolean;
  cachedArticles: CachedArticle[];
  reason: string;
} {
  // Check if we have fresh cached articles
  const cachedArticles = getCachedArticles({
    topic,
    maxAge: 2, // 2 hours
    limit: 10,
  });
  
  if (cachedArticles.length >= 5) {
    return {
      useCache: true,
      cachedArticles,
      reason: `Found ${cachedArticles.length} fresh cached articles for "${topic}"`,
    };
  }
  
  // Check if we have any cached articles from requested sources
  const sourceCached = requestedSources.flatMap(sourceType => 
    getCachedArticles({ sourceType, topic, maxAge: 4, limit: 5 })
  );
  
  if (sourceCached.length >= 3) {
    return {
      useCache: true,
      cachedArticles: sourceCached,
      reason: `Using ${sourceCached.length} cached articles to preserve API calls`,
    };
  }
  
  return {
    useCache: false,
    cachedArticles: [],
    reason: 'Insufficient cached articles, fetching fresh data',
  };
}

// Pre-fetch and cache trending topics
export async function prefetchTrendingTopics(
  fetchFunction: (topic: string, source: DataSourceType) => Promise<Headline[]>,
  topics: string[] = ['technology', 'business', 'politics', 'science', 'health']
): Promise<void> {
  const freeSources: DataSourceType[] = ['google-news', 'bbc'];
  
  for (const topic of topics) {
    // Check if we already have cached articles
    if (hasCachedArticles(topic, 5, 4)) {
      console.log(`Skipping prefetch for "${topic}" - already cached`);
      continue;
    }
    
    // Fetch from free sources only
    for (const source of freeSources) {
      try {
        const articles = await fetchFunction(topic, source);
        cacheArticles(articles, source, 6); // Cache for 6 hours
        console.log(`Prefetched ${articles.length} articles for "${topic}" from ${source}`);
      } catch (e) {
        console.warn(`Failed to prefetch "${topic}" from ${source}:`, e);
      }
    }
  }
}

// Export cache for backup
export function exportCache(): string {
  const cache = getNewsCache();
  return JSON.stringify(cache, null, 2);
}

// Import cache from backup
export function importCache(jsonString: string): boolean {
  try {
    const cache = JSON.parse(jsonString) as NewsCache;
    if (cache.articles && Array.isArray(cache.articles)) {
      saveNewsCache(cache);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
