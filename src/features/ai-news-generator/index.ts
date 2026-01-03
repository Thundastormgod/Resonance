// AI News Generator Feature
// Human-in-the-loop workflow for AI-powered journalism

// Components
export { AINewsGenerator, default } from './components/AINewsGenerator';

// Types
export type {
  // Data Sources
  DataSourceType,
  DataSource,
  GoogleNewsConfig,
  // Premium Data Sources
  SourceTier,
  SourceCategory,
  PoliticalLean,
  ReliabilityScore,
  PremiumDataSource,
  SourceFilterOptions,
  // Headlines
  Headline,
  HeadlineSearchRequest,
  HeadlineSearchResponse,
  // Stories
  StoryContent,
  StoryReadRequest,
  StoryReadResponse,
  // OpenRouter
  OpenRouterModel,
  OpenRouterConfig,
  OpenRouterRequest,
  OpenRouterResponse,
  OpenRouterMessage,
  // Generation
  ArticleStyle,
  ArticleTone,
  GenerationConfig,
  GeneratedArticleSample,
  ArticleGenerationRequest,
  ArticleGenerationResponse,
  // Fact-checking
  FactCheckStatus,
  FactCheckClaim,
  FactCheckResult,
  FactCheckRequest,
  // Bias analysis
  BiasType,
  BiasLevel,
  BiasInstance,
  BiasAnalysisResult,
  BiasAnalysisRequest,
  // Workflow
  WorkflowStage,
  WorkflowState,
  // Final Article
  FinalArticle,
  PublishRequest,
  PublishResponse,
  // UI
  UIState,
  StageProgress,
  ApiResponse,
} from './types';

// Hooks
export {
  useAINewsGenerator,
  useWorkflowState,
  useHeadlines,
  useStories,
  useArticleSamples,
  useGenerationConfig,
  useReviewResults,
  useFinalArticle,
} from './hooks';

// Services
export {
  // Data sources
  buildGoogleNewsUrl,
  buildGoogleNewsCategoryUrl,
  parseGoogleNewsRSS,
  fetchGoogleNewsHeadlines,
  fetchNewsAPIHeadlines,
  fetchGuardianHeadlines,
  fetchRSSHeadlines,
  searchHeadlines,
  filterHeadlinesByDate,
  groupHeadlinesBySource,
} from './services/dataSourcesService';

export {
  // OpenRouter AI
  callOpenRouter,
  generateArticleSamples,
  factCheckArticle,
  analyzeBias,
  getAvailableModels,
  estimateTokens,
  estimateCost,
} from './services/openRouterService';

export {
  // Story reader
  extractArticleContent,
  readStories,
  summarizeStory,
  extractQuotes,
  extractStatistics,
} from './services/storyReaderService';

// Premium Data Sources Config
export {
  PREMIUM_DATA_SOURCES,
  DATA_SOURCES_BY_CATEGORY,
  SOURCE_CATEGORY_INFO,
  SPECIALIZATION_OPTIONS,
  getSourceById,
  getSourcesByCategory,
  getSourcesByTier,
  getSourcesByReliability,
  getSourcesBySpecialization,
  getEnabledSources,
  getFreeSources,
} from './config/premiumDataSources';
