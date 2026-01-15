// API Rate Limiter for News Sources
// Tracks API usage to stay within free tier limits

export interface APIUsage {
  source: string;
  callsThisMonth: number;
  lastReset: string; // ISO date of month start
  lastCall: string | null; // ISO timestamp
  monthlyLimit: number;
}

export interface RateLimitConfig {
  source: string;
  monthlyLimit: number;
  dailyLimit?: number;
  requiresKey: boolean;
}

// Free tier limits for each API
export const API_LIMITS: Record<string, RateLimitConfig> = {
  'newsapi': {
    source: 'newsapi',
    monthlyLimit: 100, // 100 requests/day but we'll be conservative
    dailyLimit: 100,
    requiresKey: true,
  },
  'guardian': {
    source: 'guardian',
    monthlyLimit: 500, // 500/day, 12 calls/minute
    dailyLimit: 500,
    requiresKey: true,
  },
  'mediastack': {
    source: 'mediastack',
    monthlyLimit: 100, // 100/month on free tier
    requiresKey: true,
  },
  'nytimes': {
    source: 'nytimes',
    monthlyLimit: 500, // 500/day
    dailyLimit: 500,
    requiresKey: true,
  },
  // Free sources (no limits)
  'google-news': {
    source: 'google-news',
    monthlyLimit: Infinity,
    requiresKey: false,
  },
  'bbc': {
    source: 'bbc',
    monthlyLimit: Infinity,
    requiresKey: false,
  },
  'reuters': {
    source: 'reuters',
    monthlyLimit: Infinity,
    requiresKey: false,
  },
  'ap': {
    source: 'ap',
    monthlyLimit: Infinity,
    requiresKey: false,
  },
};

const STORAGE_KEY = 'resonance_api_usage';

// Get current month key (YYYY-MM)
function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Get all API usage from localStorage
export function getAPIUsage(): Record<string, APIUsage> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    
    const usage = JSON.parse(stored) as Record<string, APIUsage>;
    const currentMonth = getCurrentMonthKey();
    
    // Reset counts if new month
    Object.keys(usage).forEach(source => {
      if (usage[source].lastReset !== currentMonth) {
        usage[source].callsThisMonth = 0;
        usage[source].lastReset = currentMonth;
      }
    });
    
    return usage;
  } catch {
    return {};
  }
}

// Save API usage to localStorage
function saveAPIUsage(usage: Record<string, APIUsage>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  } catch (e) {
    console.warn('Failed to save API usage:', e);
  }
}

// Get usage for a specific source
export function getSourceUsage(source: string): APIUsage {
  const usage = getAPIUsage();
  const config = API_LIMITS[source];
  
  if (!usage[source]) {
    return {
      source,
      callsThisMonth: 0,
      lastReset: getCurrentMonthKey(),
      lastCall: null,
      monthlyLimit: config?.monthlyLimit ?? 100,
    };
  }
  
  return usage[source];
}

// Record an API call
export function recordAPICall(source: string): void {
  const usage = getAPIUsage();
  const config = API_LIMITS[source];
  const currentMonth = getCurrentMonthKey();
  
  if (!usage[source]) {
    usage[source] = {
      source,
      callsThisMonth: 0,
      lastReset: currentMonth,
      lastCall: null,
      monthlyLimit: config?.monthlyLimit ?? 100,
    };
  }
  
  // Reset if new month
  if (usage[source].lastReset !== currentMonth) {
    usage[source].callsThisMonth = 0;
    usage[source].lastReset = currentMonth;
  }
  
  usage[source].callsThisMonth++;
  usage[source].lastCall = new Date().toISOString();
  
  saveAPIUsage(usage);
}

// Check if we can make a call to a source
export function canMakeCall(source: string): { allowed: boolean; reason?: string; remaining?: number } {
  const config = API_LIMITS[source];
  
  // Free sources always allowed
  if (!config?.requiresKey || config.monthlyLimit === Infinity) {
    return { allowed: true, remaining: Infinity };
  }
  
  const usage = getSourceUsage(source);
  const remaining = config.monthlyLimit - usage.callsThisMonth;
  
  if (remaining <= 0) {
    return {
      allowed: false,
      reason: `Monthly limit reached for ${source} (${config.monthlyLimit} calls/month)`,
      remaining: 0,
    };
  }
  
  // Warning if low on calls
  if (remaining <= 10) {
    console.warn(`Low API calls remaining for ${source}: ${remaining}`);
  }
  
  return { allowed: true, remaining };
}

// Get best available source based on limits and reliability
export function getBestAvailableSource(
  preferredSources: string[],
  topic?: string
): { source: string; reason: string } {
  // Priority: User preference → Paid APIs with remaining calls → Free sources
  
  // First, try user's preferred sources
  for (const source of preferredSources) {
    const check = canMakeCall(source);
    if (check.allowed) {
      return { source, reason: 'User preferred source' };
    }
  }
  
  // Fallback to free sources based on topic
  const freeSources = ['google-news', 'bbc', 'reuters', 'ap'];
  
  // Topic-based source selection for free sources
  if (topic) {
    const topicLower = topic.toLowerCase();
    if (topicLower.includes('business') || topicLower.includes('finance')) {
      return { source: 'reuters', reason: 'Best for business/finance topics' };
    }
    if (topicLower.includes('tech') || topicLower.includes('science')) {
      return { source: 'google-news', reason: 'Wide tech coverage' };
    }
    if (topicLower.includes('politics') || topicLower.includes('uk')) {
      return { source: 'bbc', reason: 'Strong political coverage' };
    }
  }
  
  // Default to Google News (most comprehensive free option)
  return { source: 'google-news', reason: 'Default free source' };
}

// Get usage statistics for dashboard
export function getUsageStats(): {
  sources: Array<{
    source: string;
    used: number;
    limit: number;
    percentage: number;
    status: 'ok' | 'warning' | 'critical';
  }>;
  totalPaidCalls: number;
  freeSources: string[];
} {
  const usage = getAPIUsage();
  const paidSources = Object.entries(API_LIMITS)
    .filter(([, config]) => config.requiresKey && config.monthlyLimit !== Infinity);
  
  const sources = paidSources.map(([source, config]) => {
    const sourceUsage = usage[source]?.callsThisMonth ?? 0;
    const percentage = (sourceUsage / config.monthlyLimit) * 100;
    
    let status: 'ok' | 'warning' | 'critical' = 'ok';
    if (percentage >= 90) status = 'critical';
    else if (percentage >= 70) status = 'warning';
    
    return {
      source,
      used: sourceUsage,
      limit: config.monthlyLimit,
      percentage: Math.round(percentage),
      status,
    };
  });
  
  const totalPaidCalls = sources.reduce((sum, s) => sum + s.used, 0);
  const freeSources = Object.entries(API_LIMITS)
    .filter(([, config]) => !config.requiresKey || config.monthlyLimit === Infinity)
    .map(([source]) => source);
  
  return { sources, totalPaidCalls, freeSources };
}

// Smart source selector that balances quality and API usage
export function selectSourcesForFetch(
  requestedSources: string[],
  maxPaidCalls: number = 2
): string[] {
  const selected: string[] = [];
  let paidCallsUsed = 0;
  
  for (const source of requestedSources) {
    const config = API_LIMITS[source];
    const check = canMakeCall(source);
    
    if (!check.allowed) continue;
    
    // Free source - always include
    if (!config?.requiresKey || config.monthlyLimit === Infinity) {
      selected.push(source);
      continue;
    }
    
    // Paid source - check budget
    if (paidCallsUsed < maxPaidCalls && check.remaining && check.remaining > 5) {
      selected.push(source);
      paidCallsUsed++;
    }
  }
  
  // Ensure at least one source
  if (selected.length === 0) {
    selected.push('google-news');
  }
  
  return selected;
}

// Reset usage for testing
export function resetUsage(source?: string): void {
  if (source) {
    const usage = getAPIUsage();
    delete usage[source];
    saveAPIUsage(usage);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}
