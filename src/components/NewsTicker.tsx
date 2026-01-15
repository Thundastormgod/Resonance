// News Ticker Component - Scrolling RSS headlines like TV news channels
// Now with localStorage caching to reduce API calls
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Radio, RefreshCw, ChevronRight, Zap, Globe, SearchX, AlertCircle, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Ticker-specific cache (simpler than the full newsCache for this component)
interface TickerCache {
  headlines: Record<string, { data: NewsHeadline[]; timestamp: number }>;
  version: number;
}

const TICKER_CACHE_KEY = 'resonance_ticker_cache';
const TICKER_CACHE_VERSION = 1;
const TICKER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

function getTickerCache(): TickerCache {
  try {
    const stored = localStorage.getItem(TICKER_CACHE_KEY);
    if (!stored) return { headlines: {}, version: TICKER_CACHE_VERSION };
    const cache = JSON.parse(stored) as TickerCache;
    if (cache.version !== TICKER_CACHE_VERSION) {
      return { headlines: {}, version: TICKER_CACHE_VERSION };
    }
    return cache;
  } catch {
    return { headlines: {}, version: TICKER_CACHE_VERSION };
  }
}

function saveTickerCache(cache: TickerCache): void {
  try {
    localStorage.setItem(TICKER_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to save ticker cache:', e);
  }
}

function getCachedHeadlines(topic: string): NewsHeadline[] | null {
  const cache = getTickerCache();
  const cached = cache.headlines[topic];
  if (!cached) return null;
  
  // Check if cache is still fresh
  if (Date.now() - cached.timestamp > TICKER_CACHE_TTL) {
    return null; // Cache expired
  }
  
  return cached.data;
}

function setCachedHeadlines(topic: string, headlines: NewsHeadline[]): void {
  const cache = getTickerCache();
  cache.headlines[topic] = { data: headlines, timestamp: Date.now() };
  saveTickerCache(cache);
}

// Types
interface NewsHeadline {
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
}

interface NewsTickerProps {
  topic?: string;
  autoScroll?: boolean;
  scrollSpeed?: number; // pixels per second
  className?: string;
  showSources?: boolean;
  maxHeadlines?: number;
  refreshInterval?: number; // in milliseconds
  cacheEnabled?: boolean; // Enable/disable caching (default: true)
}

// Available categories for the ticker
// Using specific keywords that will match actual headlines
const TICKER_CATEGORIES = [
  { id: 'breaking', label: 'Breaking', topic: 'latest' }, // Generic to get recent news
  { id: 'world', label: 'World', topic: 'international' }, // Better match for global news
  { id: 'politics', label: 'Politics', topic: 'politics government' },
  { id: 'tech', label: 'Tech', topic: 'technology AI' },
  { id: 'business', label: 'Business', topic: 'economy market stocks' },
  { id: 'health', label: 'Health', topic: 'health medical' },
];

export function NewsTicker({
  topic = 'breaking news',
  autoScroll = true,
  scrollSpeed = 50,
  className = '',
  showSources = true,
  maxHeadlines = 20,
  refreshInterval = 5 * 60 * 1000, // 5 minutes default
  cacheEnabled = true, // Enable caching by default
}: NewsTickerProps) {
  const [headlines, setHeadlines] = useState<NewsHeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noResults, setNoResults] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(TICKER_CATEGORIES[0]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [fromCache, setFromCache] = useState(false); // Track if data is from cache
  const tickerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const scrollPositionRef = useRef(0);

  // Fetch headlines from the API with caching
  const fetchHeadlines = useCallback(async (searchTopic: string, forceRefresh: boolean = false) => {
    setLoading(true);
    setError(null);
    setNoResults(false);
    setFromCache(false);
    
    // Check cache first (unless force refresh)
    if (cacheEnabled && !forceRefresh) {
      const cached = getCachedHeadlines(searchTopic);
      if (cached && cached.length > 0) {
        console.log(`[NewsTicker] Using cached headlines for "${searchTopic}" (${cached.length} items)`);
        setHeadlines(cached);
        setLastUpdated(new Date());
        setFromCache(true);
        setLoading(false);
        return;
      }
    }
    
    try {
      console.log(`[NewsTicker] Fetching fresh headlines for "${searchTopic}"`);
      const response = await fetch('/.netlify/functions/fetch-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: searchTopic,
          sources: ['google-news', 'bbc', 'guardian', 'newsapi'],
          maxResults: maxHeadlines,
          language: 'en',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }

      const data = await response.json();
      
      if (data.headlines && data.headlines.length > 0) {
        setHeadlines(data.headlines);
        setLastUpdated(new Date());
        setNoResults(false);
        
        // Cache the results
        if (cacheEnabled) {
          setCachedHeadlines(searchTopic, data.headlines);
          console.log(`[NewsTicker] Cached ${data.headlines.length} headlines for "${searchTopic}"`);
        }
      } else {
        // No headlines found for this category - don't clear existing headlines
        setNoResults(true);
        // Keep showing previous headlines if available
        if (headlines.length === 0) {
          setError(`No "${searchTopic}" news found right now`);
        }
      }
    } catch (err) {
      console.error('News ticker fetch error:', err);
      setError('Unable to load news feed');
    } finally {
      setLoading(false);
    }
  }, [maxHeadlines, headlines.length, cacheEnabled]);

  // Initial fetch and refresh interval
  useEffect(() => {
    fetchHeadlines(currentCategory.topic);
    
    // Refresh from API periodically (bypasses cache)
    const interval = setInterval(() => {
      fetchHeadlines(currentCategory.topic, true); // Force refresh
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [currentCategory, fetchHeadlines, refreshInterval]);

  // Auto-scroll animation
  useEffect(() => {
    if (!autoScroll || isPaused || headlines.length === 0 || !tickerRef.current) {
      return;
    }

    const ticker = tickerRef.current;
    const scrollWidth = ticker.scrollWidth;
    const clientWidth = ticker.clientWidth;
    
    if (scrollWidth <= clientWidth) return;

    let lastTime = performance.now();
    
    const animate = (currentTime: number) => {
      const delta = currentTime - lastTime;
      lastTime = currentTime;
      
      scrollPositionRef.current += (scrollSpeed * delta) / 1000;
      
      // Reset position when scrolled past content
      if (scrollPositionRef.current >= scrollWidth / 2) {
        scrollPositionRef.current = 0;
      }
      
      ticker.scrollLeft = scrollPositionRef.current;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [autoScroll, isPaused, headlines, scrollSpeed]);

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Handle category change
  const handleCategoryChange = (category: typeof TICKER_CATEGORIES[0]) => {
    setCurrentCategory(category);
    scrollPositionRef.current = 0;
    if (tickerRef.current) {
      tickerRef.current.scrollLeft = 0;
    }
  };

  return (
    <div className={`bg-deep-navy text-white overflow-hidden ${className}`}>
      {/* Ticker Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 border-b border-red-500">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 animate-pulse text-white" />
            <span className="font-bold text-sm uppercase tracking-wider">Live News</span>
          </div>
          
          {/* Category Tabs */}
          <div className="hidden sm:flex items-center gap-1 ml-4">
            {TICKER_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  currentCategory.id === cat.id
                    ? 'bg-white text-red-600'
                    : 'bg-red-500/30 text-white/90 hover:bg-red-500/50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {fromCache && (
            <span className="text-xs text-white/60 hidden sm:inline flex items-center gap-1" title="Loaded from cache">
              <Database className="h-3 w-3" />
              cached
            </span>
          )}
          {lastUpdated && (
            <span className="text-xs text-white/70 hidden sm:inline">
              Updated {formatTime(lastUpdated.toISOString())}
            </span>
          )}
          <button
            onClick={() => fetchHeadlines(currentCategory.topic, true)} // Force refresh
            disabled={loading}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Refresh (bypass cache)"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Ticker Content */}
      <div
        className="relative h-12 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {loading && headlines.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-400">Loading {currentCategory.label.toLowerCase()} news...</span>
          </div>
        ) : error && headlines.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400 gap-3">
            <SearchX className="h-5 w-5 text-gray-500" />
            <span>{error}</span>
            <button
              onClick={() => fetchHeadlines(currentCategory.topic, true)} // Force refresh
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded-full transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => handleCategoryChange(TICKER_CATEGORIES[0])}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-full transition-colors"
            >
              Show Breaking News
            </button>
          </div>
        ) : noResults && headlines.length > 0 ? (
          // Show existing headlines with a notification banner
          <>
            <div className="absolute top-0 left-0 right-0 z-20 bg-amber-500/90 text-black text-xs py-1 px-4 flex items-center justify-center gap-2">
              <AlertCircle className="h-3 w-3" />
              <span>No new "{currentCategory.label}" headlines. Showing previous results.</span>
              <button
                onClick={() => fetchHeadlines(currentCategory.topic, true)} // Force refresh
                className="ml-2 underline hover:no-underline"
              >
                Refresh
              </button>
            </div>
            <div
              ref={tickerRef}
              className="flex items-center h-full overflow-x-hidden whitespace-nowrap pt-5"
              style={{ scrollBehavior: isPaused ? 'smooth' : 'auto' }}
            >
              {[...headlines, ...headlines].map((headline, index) => (
                <a
                  key={`${headline.id}-${index}`}
                  href={headline.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-6 py-2 hover:bg-white/5 transition-colors group"
                >
                  {showSources && (
                    <Badge variant="outline" className="text-xs border-gray-600 text-gray-300 shrink-0">
                      <Globe className="h-3 w-3 mr-1" />
                      {headline.source.name}
                    </Badge>
                  )}
                  <span className="text-sm font-medium text-white group-hover:text-red-400 transition-colors">
                    {headline.title}
                  </span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {formatTime(headline.publishedAt)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-red-500 shrink-0" />
                </a>
              ))}
            </div>
          </>
        ) : (
          <div
            ref={tickerRef}
            className="flex items-center h-full overflow-x-hidden whitespace-nowrap"
            style={{ scrollBehavior: isPaused ? 'smooth' : 'auto' }}
          >
            {/* Duplicate headlines for seamless loop */}
            {[...headlines, ...headlines].map((headline, index) => (
              <a
                key={`${headline.id}-${index}`}
                href={headline.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-6 py-2 hover:bg-white/5 transition-colors group"
              >
                {/* Breaking indicator */}
                {index % headlines.length === 0 && index === 0 && (
                  <Badge variant="destructive" className="bg-red-600 text-white text-xs animate-pulse">
                    <Zap className="h-3 w-3 mr-1" />
                    BREAKING
                  </Badge>
                )}
                
                {/* Source badge */}
                {showSources && (
                  <Badge variant="outline" className="text-xs border-gray-600 text-gray-300 shrink-0">
                    <Globe className="h-3 w-3 mr-1" />
                    {headline.source.name}
                  </Badge>
                )}
                
                {/* Headline text */}
                <span className="text-sm font-medium text-white group-hover:text-red-400 transition-colors">
                  {headline.title}
                </span>
                
                {/* Time */}
                <span className="text-xs text-gray-500 shrink-0">
                  {formatTime(headline.publishedAt)}
                </span>
                
                {/* Separator */}
                <ChevronRight className="h-4 w-4 text-red-500 shrink-0" />
              </a>
            ))}
          </div>
        )}
        
        {/* Gradient overlays for smooth edges */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-gray-900 to-transparent pointer-events-none z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-gray-900 to-transparent pointer-events-none z-10" />
      </div>

      {/* Mobile Category Selector */}
      <div className="sm:hidden flex items-center gap-2 px-4 py-2 bg-gray-900 overflow-x-auto">
        {TICKER_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat)}
            className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
              currentCategory.id === cat.id
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Vertical scrolling news feed component
export function NewsTickerVertical({
  topic = 'breaking news',
  maxHeadlines = 10,
  refreshInterval = 5 * 60 * 1000,
  className = '',
  cacheEnabled = true,
}: Omit<NewsTickerProps, 'autoScroll' | 'scrollSpeed'>) {
  const [headlines, setHeadlines] = useState<NewsHeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [fromCache, setFromCache] = useState(false);

  // Fetch headlines with caching
  const fetchHeadlines = useCallback(async (forceRefresh: boolean = false) => {
    setFromCache(false);
    
    // Check cache first (unless force refresh)
    const cacheKey = `vertical_${topic}`;
    if (cacheEnabled && !forceRefresh) {
      const cached = getCachedHeadlines(cacheKey);
      if (cached && cached.length > 0) {
        console.log(`[VerticalTicker] Using cached headlines for "${topic}" (${cached.length} items)`);
        setHeadlines(cached);
        setFromCache(true);
        setLoading(false);
        return;
      }
    }
    
    try {
      console.log(`[VerticalTicker] Fetching fresh headlines for "${topic}"`);
      const response = await fetch('/.netlify/functions/fetch-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          sources: ['google-news', 'bbc', 'guardian', 'newsapi'],
          maxResults: maxHeadlines,
          language: 'en',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.headlines) {
          setHeadlines(data.headlines);
          
          // Cache the results
          if (cacheEnabled) {
            setCachedHeadlines(cacheKey, data.headlines);
            console.log(`[VerticalTicker] Cached ${data.headlines.length} headlines`);
          }
        }
      }
    } catch (err) {
      console.error('Vertical ticker error:', err);
    } finally {
      setLoading(false);
    }
  }, [topic, maxHeadlines, cacheEnabled]);

  useEffect(() => {
    fetchHeadlines();
    const interval = setInterval(() => fetchHeadlines(true), refreshInterval); // Force refresh on interval
    return () => clearInterval(interval);
  }, [fetchHeadlines, refreshInterval]);

  // Auto-rotate headlines
  useEffect(() => {
    if (headlines.length === 0) return;
    
    const rotateInterval = setInterval(() => {
      setVisibleIndex((prev) => (prev + 1) % headlines.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(rotateInterval);
  }, [headlines.length]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className={`bg-deep-navy text-white p-4 rounded-lg ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Radio className="h-4 w-4 text-red-500" />
          <span className="font-bold text-sm">Live Feed</span>
        </div>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  // No headlines found state
  if (headlines.length === 0) {
    return (
      <div className={`bg-deep-navy text-white rounded-lg overflow-hidden ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-red-600 to-red-700">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            <span className="font-bold text-sm uppercase tracking-wider">Live Feed</span>
          </div>
        </div>
        
        {/* No Results Message */}
        <div className="p-6 text-center">
          <SearchX className="h-10 w-10 mx-auto text-gray-500 mb-3" />
          <p className="text-sm text-gray-400 mb-3">
            No headlines found for "{topic}"
          </p>
          <button
            onClick={() => fetchHeadlines(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-deep-navy text-white rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-red-600 to-red-700">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 animate-pulse" />
          <span className="font-bold text-sm uppercase tracking-wider">Live Feed</span>
        </div>
        <Badge variant="secondary" className="bg-white/20 text-white text-xs">
          {headlines.length} stories
        </Badge>
      </div>

      {/* Headlines List */}
      <div className="divide-y divide-gray-700">
        <AnimatePresence mode="wait">
          {headlines.slice(0, 5).map((headline, index) => (
            <motion.a
              key={headline.id}
              href={headline.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.1 }}
              className={`block p-4 hover:bg-gray-800/50 transition-colors ${
                index === visibleIndex ? 'bg-gray-800/30' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {index === 0 && (
                  <Badge variant="destructive" className="bg-red-600 text-white text-xs shrink-0 mt-0.5">
                    NEW
                  </Badge>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-white line-clamp-2 group-hover:text-red-400">
                    {headline.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">{headline.source.name}</span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-500">{formatTime(headline.publishedAt)}</span>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-500 shrink-0" />
              </div>
            </motion.a>
          ))}
        </AnimatePresence>
      </div>

      {/* View More */}
      {headlines.length > 5 && (
        <div className="px-4 py-3 bg-gray-800/50 text-center">
          <span className="text-xs text-gray-400">
            +{headlines.length - 5} more stories
          </span>
        </div>
      )}
    </div>
  );
}

export default NewsTicker;
