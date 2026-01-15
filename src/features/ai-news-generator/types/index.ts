// AI News Generator Types - Human-in-the-Loop Workflow
// Uses OpenRouter as the sole AI provider

// ============================================================
// DATA SOURCE TYPES
// ============================================================

// Basic source types for API calls
export type DataSourceType = 
  | 'google-news' 
  | 'rss' 
  | 'newsapi' 
  | 'guardian' 
  | 'bbc' 
  | 'mediastack'
  | 'reuters'    // Added: Wire service
  | 'ap'         // Added: Associated Press wire service
  | 'nytimes';   // Added: New York Times API

// Premium source categorization
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

// Legacy DataSource interface (kept for compatibility)
export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  enabled: boolean;
  baseUrl?: string;
  apiKey?: string;
  rssUrl?: string;
  lastFetched?: Date;
}

// Premium DataSource with full metadata
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

// Source filter options for admin UI
export interface SourceFilterOptions {
  categories?: SourceCategory[];
  tiers?: SourceTier[];
  minReliability?: ReliabilityScore;
  politicalLean?: PoliticalLean[];
  specializations?: string[];
  countries?: string[];
  requiresApiKey?: boolean;
}

export interface GoogleNewsConfig {
  language: string;
  country: string;
  maxResults: number;
}

// ============================================================
// HEADLINE TYPES - First stage of human-in-the-loop
// ============================================================

export interface Headline {
  id: string;
  title: string;
  description?: string;
  source: {
    name: string;
    type: DataSourceType;
    url: string;
  };
  url: string;
  publishedAt: string;
  imageUrl?: string;
  category?: string;
  selected?: boolean;
}

export interface HeadlineSearchRequest {
  topic: string;
  sources: DataSourceType[];
  maxResults?: number;
  language?: string;
  fromDate?: string;
  toDate?: string;
}

export interface HeadlineSearchResponse {
  headlines: Headline[];
  totalResults: number;
  searchedAt: string;
  sources: DataSourceType[];
  query: string;
}

// ============================================================
// STORY CONTENT TYPES - Reading full articles
// ============================================================

export interface StoryContent {
  headlineId: string;
  url: string;
  title: string;
  content: string;
  author?: string;
  publishedAt: string;
  source: string;
  wordCount: number;
  readingTime: number;
  extractedAt: string;
  success: boolean;
  error?: string;
  keywords?: string[];
  category?: string;
}

// Collated story group - combines similar stories by topic/keywords
export interface CollatedStoryGroup {
  id: string;
  topic: string;
  keywords: string[];
  stories: StoryContent[];
  combinedContent: string;
  totalWordCount: number;
  sourceCount: number;
  sources: string[];
  primaryStory: StoryContent;
  similarity: number; // 0-1 score of how similar the stories are
}

export interface StoryReadRequest {
  headlines: Headline[];
  collate?: boolean;
  similarityThreshold?: number;
}

export interface StoryReadResponse {
  stories: StoryContent[];
  successCount: number;
  failedCount: number;
  collatedGroups?: CollatedStoryGroup[];
  collationEnabled?: boolean;
}

// ============================================================
// OPENROUTER AI TYPES
// ============================================================

export type OpenRouterModel =
  | 'openai/gpt-4-turbo'
  | 'openai/gpt-4o'
  | 'openai/gpt-4o-mini'
  | 'anthropic/claude-3.5-sonnet'
  | 'anthropic/claude-3-opus'
  | 'anthropic/claude-3-haiku'
  | 'google/gemini-pro-1.5'
  | 'google/gemini-flash-1.5'
  | 'meta-llama/llama-3.1-70b-instruct'
  | 'meta-llama/llama-3.1-8b-instruct'
  | 'mistralai/mistral-large'
  | 'mistralai/mixtral-8x7b-instruct';

export interface OpenRouterConfig {
  apiKey: string;
  defaultModel: OpenRouterModel;
  generationModel: OpenRouterModel;
  factCheckModel: OpenRouterModel;
  biasCheckModel: OpenRouterModel;
  maxTokens: number;
  temperature: number;
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: OpenRouterModel;
  messages: OpenRouterMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    index: number;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  created: number;
}

export interface OpenRouterError {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

// ============================================================
// ARTICLE GENERATION TYPES
// ============================================================

export type ArticleStyle = 
  | 'investigative'
  | 'feature'
  | 'breaking-news'
  | 'analysis'
  | 'opinion'
  | 'explainer';

export type ArticleTone =
  | 'formal'
  | 'conversational'
  | 'authoritative'
  | 'balanced'
  | 'urgent';

export interface GenerationConfig {
  style: ArticleStyle;
  tone: ArticleTone;
  targetWordCount: number;
  includeQuotes: boolean;
  includeStatistics: boolean;
  seoOptimized: boolean;
}

export interface GeneratedArticleSample {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  style: ArticleStyle;
  tone: ArticleTone;
  wordCount: number;
  readingTime: number;
  sourceHeadlines: string[]; // IDs of headlines used
  sourceUrls: string[];
  model: OpenRouterModel;
  tokensUsed: number;
  generatedAt: string;
  selected?: boolean;
}

export interface ArticleGenerationRequest {
  stories: StoryContent[];
  config: GenerationConfig;
  numberOfSamples: number;
  category?: string;
}

export interface ArticleGenerationResponse {
  samples: GeneratedArticleSample[];
  totalTokensUsed: number;
  generationTime: number;
  model: OpenRouterModel;
}

// ============================================================
// FACT-CHECKING TYPES (Enhanced with atomic verification)
// ============================================================

export type FactCheckStatus = 'verified' | 'partially-verified' | 'unverified' | 'disputed' | 'false' | 'needs-context';

export interface VerificationSource {
  type: 'primary-source' | 'news-wire' | 'academic' | 'fact-checker' | 'official-records' | 'expert-source' | 'provided-source';
  name: string;
  url?: string;
  reliability: number;
  quote?: string;
}

export interface FactCheckClaim {
  id: string;
  claimId?: string;
  claim: string;
  originalText?: string;
  location: string;
  status: FactCheckStatus;
  confidence: number;
  explanation: string;
  sources: string[];
  verificationSources?: VerificationSource[];
  crossReferenceCount?: number;
  severity?: 'critical' | 'major' | 'minor' | 'informational';
  suggestedCorrection?: string;
  improvementAction?: string;
}

export interface FactCheckResult {
  articleId: string;
  overallScore: number;
  overallStatus?: 'excellent' | 'good' | 'needs-work' | 'poor' | 'unreliable';
  claims: FactCheckClaim[];
  totalClaimsChecked: number;
  verifiedCount: number;
  partiallyVerifiedCount?: number;
  disputedCount: number;
  falseCount: number;
  unverifiedCount: number;
  needsContextCount?: number;
  categoryBreakdown?: {
    category: string;
    total: number;
    verified: number;
    score: number;
  }[];
  criticalIssues?: {
    claim: string;
    issue: string;
    requiredAction: string;
    impactOnScore: number;
  }[];
  recommendations: string[] | {
    priority: 'high' | 'medium' | 'low';
    action: string;
    expectedScoreIncrease: number;
    affectedClaims: string[];
  }[];
  scoreBreakdown?: {
    verificationAccuracy: number;
    sourceDiversity: number;
    claimCoverage: number;
    criticalClaimsScore: number;
  };
  pathTo88?: {
    currentScore: number;
    targetScore: number;
    gap: number;
    requiredActions: {
      action: string;
      scoreImpact: number;
      difficulty: 'easy' | 'moderate' | 'complex';
    }[];
    achievable: boolean;
    estimatedEffort: string;
  };
  model: OpenRouterModel;
  checkedAt: string;
  tokensUsed: number;
}

export interface FactCheckRequest {
  article: GeneratedArticleSample;
  sourceStories: StoryContent[];
}

// ============================================================
// BIAS DETECTION TYPES (Enhanced with granular analysis)
// ============================================================

export type BiasType =
  | 'political'
  | 'political-left'
  | 'political-right'
  | 'emotional'
  | 'emotional-appeal'
  | 'corporate'
  | 'corporate-interest'
  | 'sensational'
  | 'sensationalism'
  | 'framing'
  | 'framing-bias'
  | 'selection'
  | 'selection-bias'
  | 'omission'
  | 'omission-bias'
  | 'loaded-language'
  | 'confirmation-bias'
  | 'anchoring-bias'
  | 'false-balance';

export type BiasLevel = 'none' | 'minimal' | 'low' | 'moderate' | 'high' | 'severe';

export interface BiasInstance {
  id: string;
  type: BiasType;
  level: BiasLevel;
  text: string;
  location: string;
  explanation: string;
  suggestedRevision?: string;
  impactOnObjectivity?: number;
  difficulty?: 'easy' | 'moderate' | 'complex';
}

export interface BiasAnalysisResult {
  articleId: string;
  overallBiasLevel: BiasLevel;
  overallScore: number;
  instances: BiasInstance[];
  totalIssuesFound?: number;
  biasTypeBreakdown?: {
    type: BiasType;
    count: number;
    severity: BiasLevel;
    examples: string[];
  }[];
  politicalLeaning?: 'left' | 'center-left' | 'center' | 'center-right' | 'right';
  politicalAnalysis?: {
    leaning: 'far-left' | 'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'far-right';
    confidence: number;
    indicators: string[];
  };
  tonalAnalysis: {
    objectivity: number;
    emotionality: number;
    sensationalism: number;
    balanceScore?: number;
    professionalTone?: number;
  };
  sourceBalance?: {
    totalSourcesMentioned: number;
    perspectivesRepresented: number;
    missingPerspectives: string[];
    sourceCredibilityScore: number;
  };
  criticalIssues?: {
    issue: string;
    text: string;
    requiredAction: string;
    impactOnScore: number;
  }[];
  recommendations: string[] | {
    priority: 'critical' | 'high' | 'medium' | 'low';
    action: string;
    expectedScoreIncrease: number;
    affectedText?: string[];
    suggestedRewrites?: string[];
  }[];
  scoreBreakdown?: {
    languageNeutrality: number;
    perspectiveBalance: number;
    factualPresentation: number;
    emotionalRestraint: number;
    sourceCredibility: number;
  };
  pathTo88?: {
    currentScore: number;
    targetScore: number;
    gap: number;
    requiredActions: {
      action: string;
      scoreImpact: number;
      difficulty: 'easy' | 'moderate' | 'complex';
      specificEdits?: string[];
    }[];
    achievable: boolean;
    estimatedEffort: string;
  };
  model: OpenRouterModel;
  analyzedAt: string;
  tokensUsed: number;
}

export interface BiasAnalysisRequest {
  article: GeneratedArticleSample;
}

// ============================================================
// WORKFLOW STATE TYPES
// ============================================================

export type WorkflowStage =
  | 'topic-input'
  | 'fetching-headlines'
  | 'headline-selection'
  | 'reading-stories'
  | 'generating-samples'
  | 'sample-selection'
  | 'fact-checking'
  | 'bias-checking'
  | 'editing'           // NEW: Article editing stage
  | 'final-review'
  | 'publishing'
  | 'complete';

export interface WorkflowState {
  stage: WorkflowStage;
  topic: string;
  selectedSources: DataSourceType[];
  headlines: Headline[];
  selectedHeadlines: Headline[];
  stories: StoryContent[];
  collatedGroups?: CollatedStoryGroup[]; // Collated story groups for unified generation
  generationConfig: GenerationConfig;
  samples: GeneratedArticleSample[];
  selectedSample?: GeneratedArticleSample;
  factCheckResult?: FactCheckResult;
  biasAnalysisResult?: BiasAnalysisResult;
  finalArticle?: FinalArticle;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

// ============================================================
// FINAL ARTICLE TYPES - Ready for Sanity
// ============================================================

export interface FinalArticle {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  tags: string[];
  featuredImage?: {
    url: string;
    alt: string;
    caption?: string;
    credit?: string;
  };
  sourceUrls: string[];
  sourceHeadlines: string[];
  metadata: {
    style: ArticleStyle;
    tone: ArticleTone;
    wordCount: number;
    readingTime: number;
  };
  aiMetadata: {
    generationModel: OpenRouterModel;
    factCheckModel: OpenRouterModel;
    biasCheckModel: OpenRouterModel;
    totalTokensUsed: number;
    generationTime: number;
    factCheckScore: number;
    biasScore: number;
  };
  status: 'draft' | 'ready-for-review' | 'approved' | 'published';
  createdAt: string;
  publishedAt?: string;
}

export interface PublishRequest {
  article: FinalArticle;
  publishImmediately: boolean;
  scheduledFor?: string;
}

export interface PublishResponse {
  success: boolean;
  sanityDocumentId?: string;
  publishedUrl?: string;
  error?: string;
}

// ============================================================
// UI STATE TYPES
// ============================================================

export interface UIState {
  isLoading: boolean;
  loadingMessage?: string;
  error?: string;
  successMessage?: string;
  currentStage: WorkflowStage;
  progress: number; // 0-100
}

export interface StageProgress {
  stage: WorkflowStage;
  label: string;
  completed: boolean;
  current: boolean;
  skipped?: boolean;
}

// ============================================================
// API RESPONSE WRAPPER
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    duration: number;
    tokensUsed?: number;
  };
}
