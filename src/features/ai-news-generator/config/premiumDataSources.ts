// Premium News Data Sources Configuration
// 20+ categorized sources for professional journalism

import type { DataSourceType } from '../types';

// ============================================================
// SOURCE ATTRIBUTES & METADATA
// ============================================================

export type SourceTier = 'free' | 'freemium' | 'premium' | 'enterprise';
export type SourceCategory = 
  | 'wire-service'      // AP, Reuters, AFP - raw news feeds
  | 'aggregator'        // Combines multiple sources
  | 'broadsheet'        // Quality newspapers
  | 'business'          // Financial/business news
  | 'technology'        // Tech-focused outlets
  | 'science'           // Science/research news
  | 'investigative'     // In-depth journalism
  | 'international'     // Global perspective
  | 'public-media'      // Public broadcasters
  | 'specialist';       // Niche/vertical publications

export type PoliticalLean = 'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'varied';
export type ReliabilityScore = 1 | 2 | 3 | 4 | 5; // 5 = highest reliability

export interface PremiumDataSource {
  id: string;
  name: string;
  shortName: string;
  type: DataSourceType;
  category: SourceCategory;
  tier: SourceTier;
  
  // Access configuration
  baseUrl: string;
  rssUrl?: string;
  apiEndpoint?: string;
  requiresApiKey: boolean;
  apiKeyEnvVar?: string;
  
  // Metadata for admin filtering
  description: string;
  country: string;
  languages: string[];
  politicalLean: PoliticalLean;
  reliability: ReliabilityScore;
  
  // Specializations (what topics they excel at)
  specializations: string[];
  
  // Rate limits
  rateLimit?: {
    requests: number;
    period: 'minute' | 'hour' | 'day';
  };
  
  // Status
  enabled: boolean;
  lastChecked?: string;
  status: 'active' | 'degraded' | 'offline';
}

// ============================================================
// WIRE SERVICES - Raw news, highest reliability
// ============================================================

const wireServices: PremiumDataSource[] = [
  {
    id: 'ap-news',
    name: 'Associated Press',
    shortName: 'AP',
    type: 'rss',
    category: 'wire-service',
    tier: 'freemium',
    baseUrl: 'https://apnews.com',
    rssUrl: 'https://rsshub.app/apnews/topics/apf-topnews',
    requiresApiKey: false,
    description: 'Global wire service, factual reporting, minimal bias. Gold standard for breaking news.',
    country: 'US',
    languages: ['en'],
    politicalLean: 'center',
    reliability: 5,
    specializations: ['breaking-news', 'politics', 'international', 'elections'],
    enabled: true,
    status: 'active',
  },
  {
    id: 'reuters',
    name: 'Reuters',
    shortName: 'Reuters',
    type: 'rss',
    category: 'wire-service',
    tier: 'freemium',
    baseUrl: 'https://www.reuters.com',
    rssUrl: 'https://rsshub.app/reuters/world',
    requiresApiKey: false,
    description: 'Premier global wire service. Business/financial focus. Highly factual.',
    country: 'UK',
    languages: ['en'],
    politicalLean: 'center',
    reliability: 5,
    specializations: ['business', 'finance', 'international', 'markets'],
    enabled: true,
    status: 'active',
  },
  {
    id: 'afp',
    name: 'Agence France-Presse',
    shortName: 'AFP',
    type: 'rss',
    category: 'wire-service',
    tier: 'premium',
    baseUrl: 'https://www.afp.com',
    rssUrl: 'https://rsshub.app/afp/news',
    requiresApiKey: false,
    description: 'Third largest wire service. Strong European/African coverage.',
    country: 'FR',
    languages: ['en', 'fr'],
    politicalLean: 'center',
    reliability: 5,
    specializations: ['international', 'europe', 'africa', 'middle-east'],
    enabled: true,
    status: 'active',
  },
];

// ============================================================
// NEWS AGGREGATORS - Multiple sources in one
// ============================================================

const aggregators: PremiumDataSource[] = [
  {
    id: 'google-news',
    name: 'Google News',
    shortName: 'Google',
    type: 'google-news',
    category: 'aggregator',
    tier: 'free',
    baseUrl: 'https://news.google.com',
    rssUrl: 'https://news.google.com/rss',
    requiresApiKey: false,
    description: 'Aggregates headlines from thousands of sources worldwide. Best for topic discovery.',
    country: 'US',
    languages: ['en', 'es', 'fr', 'de', 'pt', 'zh', 'ja', 'ar'],
    politicalLean: 'varied',
    reliability: 4,
    specializations: ['all-topics', 'trending', 'local', 'personalized'],
    rateLimit: { requests: 100, period: 'hour' },
    enabled: true,
    status: 'active',
  },
  {
    id: 'newsapi',
    name: 'NewsAPI.org',
    shortName: 'NewsAPI',
    type: 'newsapi',
    category: 'aggregator',
    tier: 'freemium',
    baseUrl: 'https://newsapi.org',
    apiEndpoint: 'https://newsapi.org/v2',
    requiresApiKey: true,
    apiKeyEnvVar: 'NEWSAPI_KEY',
    description: 'API aggregating 80,000+ sources. Great for programmatic access.',
    country: 'US',
    languages: ['en', 'de', 'fr', 'es', 'it', 'nl', 'no', 'pt', 'ru', 'sv', 'zh'],
    politicalLean: 'varied',
    reliability: 4,
    specializations: ['headlines', 'everything', 'sources'],
    rateLimit: { requests: 100, period: 'day' },
    enabled: true,
    status: 'active',
  },
  {
    id: 'mediastack',
    name: 'Mediastack',
    shortName: 'Mediastack',
    type: 'newsapi',
    category: 'aggregator',
    tier: 'freemium',
    baseUrl: 'https://mediastack.com',
    apiEndpoint: 'http://api.mediastack.com/v1/news',
    requiresApiKey: true,
    apiKeyEnvVar: 'MEDIASTACK_KEY',
    description: 'Real-time news API with 7,500+ sources in 50 languages.',
    country: 'AT',
    languages: ['en', 'de', 'fr', 'es', 'pt', 'it', 'ru', 'ar', 'zh'],
    politicalLean: 'varied',
    reliability: 4,
    specializations: ['breaking-news', 'multilingual', 'historical'],
    rateLimit: { requests: 500, period: 'day' },
    enabled: false,
    status: 'active',
  },
];

// ============================================================
// QUALITY BROADSHEETS - In-depth reporting
// ============================================================

const broadsheets: PremiumDataSource[] = [
  {
    id: 'guardian',
    name: 'The Guardian',
    shortName: 'Guardian',
    type: 'guardian',
    category: 'broadsheet',
    tier: 'freemium',
    baseUrl: 'https://www.theguardian.com',
    apiEndpoint: 'https://content.guardianapis.com',
    rssUrl: 'https://www.theguardian.com/world/rss',
    requiresApiKey: true,
    apiKeyEnvVar: 'GUARDIAN_API_KEY',
    description: 'Award-winning journalism. Strong investigative reporting. Open API.',
    country: 'UK',
    languages: ['en'],
    politicalLean: 'center-left',
    reliability: 4,
    specializations: ['investigative', 'environment', 'technology', 'politics', 'culture'],
    rateLimit: { requests: 500, period: 'day' },
    enabled: true,
    status: 'active',
  },
  {
    id: 'nytimes',
    name: 'The New York Times',
    shortName: 'NYT',
    type: 'rss',
    category: 'broadsheet',
    tier: 'premium',
    baseUrl: 'https://www.nytimes.com',
    rssUrl: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
    apiEndpoint: 'https://api.nytimes.com',
    requiresApiKey: true,
    apiKeyEnvVar: 'NYTIMES_API_KEY',
    description: 'America\'s newspaper of record. Comprehensive coverage, Pulitzer-winning journalism.',
    country: 'US',
    languages: ['en', 'es', 'zh'],
    politicalLean: 'center-left',
    reliability: 5,
    specializations: ['politics', 'international', 'investigative', 'culture', 'opinion'],
    enabled: true,
    status: 'active',
  },
  {
    id: 'washpost',
    name: 'The Washington Post',
    shortName: 'WaPo',
    type: 'rss',
    category: 'broadsheet',
    tier: 'premium',
    baseUrl: 'https://www.washingtonpost.com',
    rssUrl: 'https://feeds.washingtonpost.com/rss/world',
    requiresApiKey: false,
    description: 'Premier political coverage. Strong investigative tradition.',
    country: 'US',
    languages: ['en'],
    politicalLean: 'center-left',
    reliability: 5,
    specializations: ['politics', 'government', 'investigative', 'national-security'],
    enabled: true,
    status: 'active',
  },
  {
    id: 'wsj',
    name: 'The Wall Street Journal',
    shortName: 'WSJ',
    type: 'rss',
    category: 'broadsheet',
    tier: 'premium',
    baseUrl: 'https://www.wsj.com',
    rssUrl: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml',
    requiresApiKey: false,
    description: 'Business/financial authority. Conservative editorial, factual news.',
    country: 'US',
    languages: ['en'],
    politicalLean: 'center-right',
    reliability: 5,
    specializations: ['business', 'finance', 'markets', 'economy', 'technology'],
    enabled: true,
    status: 'active',
  },
];

// ============================================================
// BUSINESS & FINANCIAL - Market-focused
// ============================================================

const businessSources: PremiumDataSource[] = [
  {
    id: 'bloomberg',
    name: 'Bloomberg',
    shortName: 'Bloomberg',
    type: 'rss',
    category: 'business',
    tier: 'premium',
    baseUrl: 'https://www.bloomberg.com',
    rssUrl: 'https://feeds.bloomberg.com/markets/news.rss',
    requiresApiKey: false,
    description: 'Global financial data leader. Real-time markets, business news.',
    country: 'US',
    languages: ['en'],
    politicalLean: 'center',
    reliability: 5,
    specializations: ['markets', 'finance', 'economics', 'technology', 'crypto'],
    enabled: true,
    status: 'active',
  },
  {
    id: 'ft',
    name: 'Financial Times',
    shortName: 'FT',
    type: 'rss',
    category: 'business',
    tier: 'premium',
    baseUrl: 'https://www.ft.com',
    rssUrl: 'https://www.ft.com/rss/home',
    requiresApiKey: false,
    description: 'Premier international business newspaper. European perspective.',
    country: 'UK',
    languages: ['en'],
    politicalLean: 'center',
    reliability: 5,
    specializations: ['business', 'finance', 'international', 'economics', 'markets'],
    enabled: true,
    status: 'active',
  },
  {
    id: 'economist',
    name: 'The Economist',
    shortName: 'Economist',
    type: 'rss',
    category: 'business',
    tier: 'premium',
    baseUrl: 'https://www.economist.com',
    rssUrl: 'https://www.economist.com/international/rss.xml',
    requiresApiKey: false,
    description: 'In-depth analysis of world affairs, business, finance.',
    country: 'UK',
    languages: ['en'],
    politicalLean: 'center',
    reliability: 5,
    specializations: ['economics', 'international', 'politics', 'business', 'analysis'],
    enabled: true,
    status: 'active',
  },
];

// ============================================================
// TECHNOLOGY - Tech industry focus
// ============================================================

const techSources: PremiumDataSource[] = [
  {
    id: 'techcrunch',
    name: 'TechCrunch',
    shortName: 'TC',
    type: 'rss',
    category: 'technology',
    tier: 'free',
    baseUrl: 'https://techcrunch.com',
    rssUrl: 'https://techcrunch.com/feed/',
    requiresApiKey: false,
    description: 'Startup ecosystem, venture capital, technology business.',
    country: 'US',
    languages: ['en'],
    politicalLean: 'center',
    reliability: 4,
    specializations: ['startups', 'venture-capital', 'apps', 'ai', 'crypto'],
    enabled: true,
    status: 'active',
  },
  {
    id: 'wired',
    name: 'WIRED',
    shortName: 'WIRED',
    type: 'rss',
    category: 'technology',
    tier: 'free',
    baseUrl: 'https://www.wired.com',
    rssUrl: 'https://www.wired.com/feed/rss',
    requiresApiKey: false,
    description: 'Technology, science, culture, and how they change the world.',
    country: 'US',
    languages: ['en'],
    politicalLean: 'center-left',
    reliability: 4,
    specializations: ['technology', 'science', 'culture', 'security', 'ai'],
    enabled: true,
    status: 'active',
  },
  {
    id: 'ars-technica',
    name: 'Ars Technica',
    shortName: 'Ars',
    type: 'rss',
    category: 'technology',
    tier: 'free',
    baseUrl: 'https://arstechnica.com',
    rssUrl: 'https://feeds.arstechnica.com/arstechnica/index',
    requiresApiKey: false,
    description: 'Deep-dive technology journalism. Strong technical accuracy.',
    country: 'US',
    languages: ['en'],
    politicalLean: 'center',
    reliability: 5,
    specializations: ['technology', 'science', 'policy', 'gaming', 'space'],
    enabled: true,
    status: 'active',
  },
  {
    id: 'the-verge',
    name: 'The Verge',
    shortName: 'Verge',
    type: 'rss',
    category: 'technology',
    tier: 'free',
    baseUrl: 'https://www.theverge.com',
    rssUrl: 'https://www.theverge.com/rss/index.xml',
    requiresApiKey: false,
    description: 'Technology, science, art, culture. Accessible tech journalism.',
    country: 'US',
    languages: ['en'],
    politicalLean: 'center-left',
    reliability: 4,
    specializations: ['technology', 'consumer-tech', 'entertainment', 'policy'],
    enabled: true,
    status: 'active',
  },
];

// ============================================================
// SCIENCE & HEALTH
// ============================================================

const scienceSources: PremiumDataSource[] = [
  {
    id: 'nature',
    name: 'Nature',
    shortName: 'Nature',
    type: 'rss',
    category: 'science',
    tier: 'freemium',
    baseUrl: 'https://www.nature.com',
    rssUrl: 'https://www.nature.com/nature.rss',
    requiresApiKey: false,
    description: 'Premier scientific journal. Peer-reviewed research news.',
    country: 'UK',
    languages: ['en'],
    politicalLean: 'center',
    reliability: 5,
    specializations: ['science', 'research', 'biology', 'physics', 'medicine'],
    enabled: true,
    status: 'active',
  },
  {
    id: 'science-mag',
    name: 'Science Magazine',
    shortName: 'Science',
    type: 'rss',
    category: 'science',
    tier: 'freemium',
    baseUrl: 'https://www.science.org',
    rssUrl: 'https://www.science.org/rss/news_current.xml',
    requiresApiKey: false,
    description: 'AAAS journal. Cutting-edge scientific research and news.',
    country: 'US',
    languages: ['en'],
    politicalLean: 'center',
    reliability: 5,
    specializations: ['science', 'research', 'climate', 'health', 'space'],
    enabled: true,
    status: 'active',
  },
  {
    id: 'stat-news',
    name: 'STAT News',
    shortName: 'STAT',
    type: 'rss',
    category: 'science',
    tier: 'freemium',
    baseUrl: 'https://www.statnews.com',
    rssUrl: 'https://www.statnews.com/feed/',
    requiresApiKey: false,
    description: 'Health, medicine, life sciences. Biotech and pharma focus.',
    country: 'US',
    languages: ['en'],
    politicalLean: 'center',
    reliability: 5,
    specializations: ['health', 'medicine', 'biotech', 'pharma', 'public-health'],
    enabled: true,
    status: 'active',
  },
];

// ============================================================
// PUBLIC MEDIA - Non-profit broadcasters
// ============================================================

const publicMedia: PremiumDataSource[] = [
  {
    id: 'bbc',
    name: 'BBC News',
    shortName: 'BBC',
    type: 'bbc',
    category: 'public-media',
    tier: 'free',
    baseUrl: 'https://www.bbc.com/news',
    rssUrl: 'https://feeds.bbci.co.uk/news/rss.xml',
    requiresApiKey: false,
    description: 'World\'s largest broadcaster. Comprehensive global coverage.',
    country: 'UK',
    languages: ['en'],
    politicalLean: 'center',
    reliability: 5,
    specializations: ['international', 'politics', 'breaking-news', 'analysis'],
    enabled: true,
    status: 'active',
  },
  {
    id: 'npr',
    name: 'NPR',
    shortName: 'NPR',
    type: 'rss',
    category: 'public-media',
    tier: 'free',
    baseUrl: 'https://www.npr.org',
    rssUrl: 'https://feeds.npr.org/1001/rss.xml',
    requiresApiKey: false,
    description: 'US public radio. In-depth reporting, strong audio content.',
    country: 'US',
    languages: ['en'],
    politicalLean: 'center-left',
    reliability: 5,
    specializations: ['politics', 'culture', 'science', 'arts', 'national'],
    enabled: true,
    status: 'active',
  },
  {
    id: 'pbs',
    name: 'PBS NewsHour',
    shortName: 'PBS',
    type: 'rss',
    category: 'public-media',
    tier: 'free',
    baseUrl: 'https://www.pbs.org/newshour',
    rssUrl: 'https://www.pbs.org/newshour/feeds/rss/headlines',
    requiresApiKey: false,
    description: 'US public television news. Nonpartisan, in-depth analysis.',
    country: 'US',
    languages: ['en'],
    politicalLean: 'center',
    reliability: 5,
    specializations: ['politics', 'education', 'science', 'arts', 'health'],
    enabled: true,
    status: 'active',
  },
];

// ============================================================
// INTERNATIONAL PERSPECTIVE
// ============================================================

const internationalSources: PremiumDataSource[] = [
  {
    id: 'al-jazeera',
    name: 'Al Jazeera',
    shortName: 'AJ',
    type: 'rss',
    category: 'international',
    tier: 'free',
    baseUrl: 'https://www.aljazeera.com',
    rssUrl: 'https://www.aljazeera.com/xml/rss/all.xml',
    requiresApiKey: false,
    description: 'Middle East perspective. Strong coverage of Global South.',
    country: 'QA',
    languages: ['en', 'ar'],
    politicalLean: 'center',
    reliability: 4,
    specializations: ['middle-east', 'international', 'africa', 'asia'],
    enabled: true,
    status: 'active',
  },
  {
    id: 'dw',
    name: 'Deutsche Welle',
    shortName: 'DW',
    type: 'rss',
    category: 'international',
    tier: 'free',
    baseUrl: 'https://www.dw.com',
    rssUrl: 'https://rss.dw.com/rdf/rss-en-all',
    requiresApiKey: false,
    description: 'German international broadcaster. European perspective.',
    country: 'DE',
    languages: ['en', 'de', 'es', 'pt', 'ar'],
    politicalLean: 'center',
    reliability: 5,
    specializations: ['europe', 'international', 'culture', 'environment'],
    enabled: true,
    status: 'active',
  },
];

// ============================================================
// COMBINED REGISTRY
// ============================================================

export const PREMIUM_DATA_SOURCES: PremiumDataSource[] = [
  ...wireServices,
  ...aggregators,
  ...broadsheets,
  ...businessSources,
  ...techSources,
  ...scienceSources,
  ...publicMedia,
  ...internationalSources,
];

// Export categorized for easy access
export const DATA_SOURCES_BY_CATEGORY = {
  'wire-service': wireServices,
  'aggregator': aggregators,
  'broadsheet': broadsheets,
  'business': businessSources,
  'technology': techSources,
  'science': scienceSources,
  'public-media': publicMedia,
  'international': internationalSources,
};

// Quick lookups
export const getSourceById = (id: string): PremiumDataSource | undefined => 
  PREMIUM_DATA_SOURCES.find(s => s.id === id);

export const getSourcesByCategory = (category: SourceCategory): PremiumDataSource[] =>
  PREMIUM_DATA_SOURCES.filter(s => s.category === category);

export const getSourcesByTier = (tier: SourceTier): PremiumDataSource[] =>
  PREMIUM_DATA_SOURCES.filter(s => s.tier === tier);

export const getSourcesByReliability = (minReliability: ReliabilityScore): PremiumDataSource[] =>
  PREMIUM_DATA_SOURCES.filter(s => s.reliability >= minReliability);

export const getSourcesBySpecialization = (spec: string): PremiumDataSource[] =>
  PREMIUM_DATA_SOURCES.filter(s => s.specializations.includes(spec));

export const getEnabledSources = (): PremiumDataSource[] =>
  PREMIUM_DATA_SOURCES.filter(s => s.enabled);

export const getFreeSources = (): PremiumDataSource[] =>
  PREMIUM_DATA_SOURCES.filter(s => s.tier === 'free' || s.tier === 'freemium');

// Category metadata for UI
export const SOURCE_CATEGORY_INFO: Record<SourceCategory, { name: string; description: string; icon: string }> = {
  'wire-service': {
    name: 'Wire Services',
    description: 'Raw news feeds from AP, Reuters, AFP. Highest reliability, minimal bias.',
    icon: '📡',
  },
  'aggregator': {
    name: 'Aggregators',
    description: 'Combine multiple sources. Best for broad topic discovery.',
    icon: '🔗',
  },
  'broadsheet': {
    name: 'Quality Newspapers',
    description: 'In-depth reporting from major newspapers. Award-winning journalism.',
    icon: '📰',
  },
  'business': {
    name: 'Business & Finance',
    description: 'Market-focused outlets. Financial data, economic analysis.',
    icon: '💼',
  },
  'technology': {
    name: 'Technology',
    description: 'Tech industry coverage. Startups, AI, consumer tech.',
    icon: '💻',
  },
  'science': {
    name: 'Science & Health',
    description: 'Peer-reviewed research, medical news, scientific breakthroughs.',
    icon: '🔬',
  },
  'investigative': {
    name: 'Investigative',
    description: 'Long-form investigative journalism. Deep research.',
    icon: '🔍',
  },
  'international': {
    name: 'International',
    description: 'Global perspective. Non-Western viewpoints.',
    icon: '🌍',
  },
  'public-media': {
    name: 'Public Media',
    description: 'Non-profit broadcasters. Nonpartisan, educational.',
    icon: '📻',
  },
  'specialist': {
    name: 'Specialist',
    description: 'Niche publications. Deep expertise in specific domains.',
    icon: '📋',
  },
};

// Specialization options for filtering
export const SPECIALIZATION_OPTIONS = [
  'all-topics',
  'breaking-news',
  'politics',
  'international',
  'business',
  'finance',
  'markets',
  'technology',
  'ai',
  'science',
  'health',
  'medicine',
  'environment',
  'climate',
  'culture',
  'sports',
  'investigative',
  'analysis',
  'opinion',
] as const;

export type Specialization = typeof SPECIALIZATION_OPTIONS[number];
