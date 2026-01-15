import {createClient} from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'
import {SanityImageSource} from '@sanity/image-url/lib/types/types'
import groq from 'groq'

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID || 'tvi7xjbr';
const dataset = import.meta.env.VITE_SANITY_DATASET || 'production';
const apiVersion = '2023-05-03';

// SECURITY: Do not use tokens with write permissions in client-side code
// Only use public tokens or no token for read-only operations
// If VITE_SANITY_PUBLIC_TOKEN is not set or empty, we use unauthenticated reads (which work for public datasets)
const rawToken = import.meta.env.VITE_SANITY_PUBLIC_TOKEN;
// Treat empty string as no token (to override Netlify site settings if needed)
const token = (rawToken && rawToken.trim()) ? rawToken.trim() : undefined;

console.log('Sanity Project ID:', projectId);
console.log('Sanity Token configured:', !!token);

// SECURITY WARNING: Ensure token has minimal permissions (read-only)
if (token && import.meta.env.DEV) {
  console.warn('⚠️ SECURITY: Sanity token detected in client. Ensure it has read-only permissions only.');
}

// Base client config without token
const baseConfig = {
  projectId,
  dataset,
  useCdn: false, // Disable CDN for immediate updates
  apiVersion,
  perspective: 'published' as const,
  ignoreBrowserTokenWarning: true,
  stega: {
    enabled: false,
    studioUrl: 'http://localhost:3333',
  },
  requestTagPrefix: 'sanity.fetch',
  allowReconfigure: false,
};

export const client = createClient({
  ...baseConfig,
  ...(token ? { token } : {}), // Only include token if it exists
})

// Create a separate client for real-time listening (no CDN, no cache)
export const liveClient = createClient({
  ...baseConfig,
  ...(token ? { token } : {}), // Only include token if it exists
  requestTagPrefix: 'sanity.live',
})

const builder = imageUrlBuilder(client)

export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}

// Check if we have a token for live queries (listen API requires authentication)
const hasToken = !!token;
if (!hasToken) {
  console.log('ℹ️ No Sanity token configured - live queries will use polling instead');
}

// Real-time subscription helper
export function createLiveQuery<T>(query: string, params: Record<string, any> = {}) {
  return {
    query,
    params,
    // Listen for changes - only works with a valid token
    listen: (callback: (result: T[]) => void, errorCallback?: (error: Error) => void) => {
      // If no token, don't attempt live queries - they require authentication
      if (!hasToken) {
        console.log('⚠️ Skipping live query subscription - no token configured. Using initial fetch only.');
        // Do an initial fetch and return a no-op unsubscribe
        client.fetch<T[]>(query, params)
          .then(result => callback(result))
          .catch(error => {
            console.error('Error fetching initial data:', error);
            if (errorCallback) errorCallback(error);
          });
        
        // Return a mock subscription that can be unsubscribed
        return {
          unsubscribe: () => {},
        };
      }

      const subscription = liveClient.listen(query, params, {
        includeResult: true,
        visibility: 'query'
      })
      
      subscription.subscribe({
        next: (update) => {
          // Handle different types of updates from Sanity listen API
          if ('result' in update && update.result) {
            callback(update.result as unknown as T[])
          } else if ('transition' in update && update.transition === 'update') {
            // Refetch data when we get an update notification
            liveClient.fetch<T[]>(query, params)
              .then(result => callback(result))
              .catch(error => {
                console.error('Error refetching after update:', error)
                if (errorCallback) errorCallback(error)
              })
          }
        },
        error: (error) => {
          console.error('Sanity live query error:', error)
          if (errorCallback) errorCallback(error)
        }
      })
      
      return subscription
    }
  }
}

// Force immediate refresh by bypassing all caches
export async function forceRefreshArticles<T>(query: string, params: Record<string, any> = {}): Promise<T[]> {
  try {
    // Add timestamp to force cache bust
    const cacheBustParams = {
      ...params,
      _cacheBust: Date.now(),
      _forceRefresh: true
    };
    
    console.log('🔄 Force refreshing articles with cache bust:', cacheBustParams._cacheBust);
    
    // Use liveClient with cache busting
    const result = await liveClient.fetch<T[]>(query, cacheBustParams);
    
    console.log('✅ Force refresh completed, got', result.length, 'articles');
    return result;
  } catch (error) {
    console.error('❌ Force refresh failed:', error);
    throw error;
  }
}

// Polling helper for fallback real-time updates (now with force refresh)
export function createPollingQuery<T>(query: string, params: Record<string, any> = {}, intervalMs: number = 15000) {
  let intervalId: NodeJS.Timeout | null = null
  let isActive = false
  
  return {
    start: (callback: (result: T[]) => void, errorCallback?: (error: Error) => void) => {
      if (isActive) return
      
      isActive = true
      
      // Initial fetch with force refresh
      const fetchData = async () => {
        try {
          // Use force refresh for immediate updates
          const result = await forceRefreshArticles<T>(query, params)
          callback(result)
        } catch (error) {
          console.error('Polling query error:', error)
          if (errorCallback) errorCallback(error as Error)
        }
      }
      
      fetchData() // Initial call
      intervalId = setInterval(fetchData, intervalMs)
    },
    
    stop: () => {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
      isActive = false
    },
    
    isActive: () => isActive
  }
}

export { groq }
