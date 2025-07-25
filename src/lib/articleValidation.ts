/**
 * Article Validation Utilities
 * Enforces business rules for homepage article placement
 */

export interface Article {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  mainImage: any;
  excerpt: string;
  isLeadStory: boolean;
  isFeatured: boolean;
  isBreakingNews: boolean;
  readCount: number;
  mediaType: 'standard' | 'video';
  author: {
    name: string;
  };
  categories: {
    title: string;
  }[];
  isLatestUpdate: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  enforcedChanges: string[];
}

/**
 * Validates and enforces article placement rules
 */
export function validateAndEnforceArticleRules(articles: Article[]): {
  validatedArticles: Article[];
  validation: ValidationResult;
} {
  const validation: ValidationResult = {
    isValid: true,
    warnings: [],
    errors: [],
    enforcedChanges: []
  };

  const validatedArticles = [...articles];

  // RULE 1: Only one breaking news story allowed
  const breakingNewsArticles = validatedArticles.filter(a => a.isBreakingNews);
  if (breakingNewsArticles.length > 1) {
    validation.isValid = false;
    validation.errors.push(`🚨 RULE VIOLATION: ${breakingNewsArticles.length} breaking news stories found. Only 1 allowed.`);
    
    // Enforce: Keep only the most recent breaking news
    const mostRecentBreaking = breakingNewsArticles.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )[0];
    
    validatedArticles.forEach(article => {
      if (article.isBreakingNews && article._id !== mostRecentBreaking._id) {
        article.isBreakingNews = false;
        validation.enforcedChanges.push(`🔧 Removed breaking news flag from "${article.title}"`);
      }
    });
  }

  // RULE 2: Only one lead story allowed
  const leadStoryArticles = validatedArticles.filter(a => a.isLeadStory);
  if (leadStoryArticles.length > 1) {
    validation.isValid = false;
    validation.errors.push(`🚨 RULE VIOLATION: ${leadStoryArticles.length} lead stories found. Only 1 allowed.`);
    
    // Enforce: Keep only the most recent lead story
    const mostRecentLead = leadStoryArticles.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )[0];
    
    validatedArticles.forEach(article => {
      if (article.isLeadStory && article._id !== mostRecentLead._id) {
        article.isLeadStory = false;
        validation.enforcedChanges.push(`🔧 Removed lead story flag from "${article.title}"`);
      }
    });
  }

  // RULE 3: Lead story cannot also be featured (to avoid duplication)
  const leadStory = validatedArticles.find(a => a.isLeadStory);
  if (leadStory && leadStory.isFeatured) {
    validation.warnings.push(`⚠️ Lead story "${leadStory.title}" is also marked as featured. This is allowed but may cause duplication.`);
  }

  // RULE 4: Breaking news should not be lead story (different purposes)
  const breakingNewsAsLead = validatedArticles.find(a => a.isBreakingNews && a.isLeadStory);
  if (breakingNewsAsLead) {
    validation.warnings.push(`⚠️ Article "${breakingNewsAsLead.title}" is both breaking news and lead story. Consider using separate articles.`);
  }

  // RULE 5: Validate featured articles limit
  const featuredArticles = validatedArticles.filter(a => a.isFeatured && !a.isLeadStory);
  if (featuredArticles.length > 3) {
    validation.warnings.push(`⚠️ ${featuredArticles.length} featured articles found. Only first 3 will be displayed.`);
  }

  // RULE 6: Validate latest updates limit
  const latestUpdateArticles = validatedArticles.filter(a => a.isLatestUpdate);
  if (latestUpdateArticles.length > 5) {
    validation.warnings.push(`⚠️ ${latestUpdateArticles.length} latest update articles found. Only first 5 will be displayed.`);
  }

  // RULE 7: STRICT SECTION ENFORCEMENT - Only tagged articles should appear
  const untaggedArticles = validatedArticles.filter(a => 
    !a.isBreakingNews && 
    !a.isLeadStory && 
    !a.isFeatured && 
    !a.isLatestUpdate && 
    a.mediaType !== 'video' &&
    (!a.readCount || a.readCount <= 100) // Not trending
  );
  
  if (untaggedArticles.length > 0) {
    validation.warnings.push(`⚠️ ${untaggedArticles.length} articles have no homepage section tags and will not appear on homepage.`);
  }

  // Log validation results
  if (validation.errors.length > 0) {
    console.error('🚨 ARTICLE VALIDATION ERRORS:', validation.errors);
  }
  if (validation.warnings.length > 0) {
    console.warn('⚠️ ARTICLE VALIDATION WARNINGS:', validation.warnings);
  }
  if (validation.enforcedChanges.length > 0) {
    console.info('🔧 ENFORCED CHANGES:', validation.enforcedChanges);
  }

  return { validatedArticles, validation };
}

/**
 * Gets safe article selections for homepage sections
 */
export function getSafeArticleSelections(articles: Article[]) {
  const { validatedArticles, validation } = validateAndEnforceArticleRules(articles);

  // STRICT ENFORCEMENT: Only properly tagged articles are returned
  const breakingNewsArticle = validatedArticles.find(a => a.isBreakingNews);
  const leadStory = validatedArticles.find(a => a.isLeadStory);
  
  // Featured articles: Must be explicitly tagged as featured AND not the lead story
  const featuredArticles = validatedArticles.filter(a => a.isFeatured && !a.isLeadStory).slice(0, 3);
  
  // Latest updates: Must be explicitly tagged as latest update
  const latestUpdates = validatedArticles.filter(a => a.isLatestUpdate).slice(0, 5);
  
  // Video articles: Must have mediaType 'video'
  const videoArticles = validatedArticles.filter(a => a.mediaType === 'video').slice(0, 4);
  
  // Trending articles: Must have readCount > 100 (implicit trending tag)
  const trendingArticles = validatedArticles.filter(a => a.readCount && a.readCount > 100).sort((a, b) => b.readCount - a.readCount).slice(0, 5);

  return {
    breakingNewsArticle,
    leadStory,
    featuredArticles,
    latestUpdates,
    videoArticles,
    trendingArticles,
    validation
  };
}
