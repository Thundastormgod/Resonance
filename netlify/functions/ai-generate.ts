// Netlify Function: AI Article Generation
// Uses OpenRouter to generate article samples with strict validation and context supplementation

// Types
interface HandlerEvent {
  httpMethod: string;
  body: string | null;
}

interface StoryContent {
  headlineId: string;
  url: string;
  title: string;
  content: string;
  author?: string;
  publishedAt: string;
  source: string;
  wordCount: number;
  keywords?: string[];
  // Quality validation fields
  contentQuality?: 'high' | 'medium' | 'low' | 'unusable';
  qualityScore?: number;
  validationIssues?: string[];
}

// Collated story group from read-stories
interface CollatedStoryGroup {
  id: string;
  topic: string;
  keywords: string[];
  stories: StoryContent[];
  combinedContent: string;
  totalWordCount: number;
  sourceCount: number;
  sources: string[];
  primaryStory: StoryContent;
  similarity: number;
  // Quality metrics
  averageQualityScore?: number;
  hasHighQualitySource?: boolean;
}

// Content quality assessment for generation
interface ContentAssessment {
  totalWordCount: number;
  qualityLevel: 'sufficient' | 'limited' | 'minimal';
  highQualitySources: number;
  mediumQualitySources: number;
  lowQualitySources: number;
  supplementationRequired: boolean;
  supplementationLevel: 'none' | 'light' | 'moderate' | 'heavy';
  recommendations: string[];
}

// ============================================================================
// CONTEXT SUPPLEMENTATION CONFIGURATION
// ============================================================================
const SUPPLEMENTATION_CONFIG = {
  // Word count thresholds for determining supplementation level
  SUFFICIENT_CONTENT: 500,      // No supplementation needed
  LIMITED_CONTENT: 200,         // Light supplementation
  MINIMAL_CONTENT: 50,          // Heavy supplementation
  
  // Quality score thresholds
  HIGH_QUALITY_THRESHOLD: 70,
  MEDIUM_QUALITY_THRESHOLD: 50,
  
  // Supplementation rules
  RULES: {
    NONE: 'Use source material directly. Synthesize and rewrite but stay close to facts.',
    LIGHT: 'Expand with relevant context. Add background information where helpful.',
    MODERATE: 'Supplement with general knowledge. Add context, explain terminology, provide background.',
    HEAVY: 'Generate comprehensive article based on topic. Use headline as guide. Research and expand significantly.',
  },
  
  // Fact verification guidelines per level
  FACT_GUIDELINES: {
    NONE: 'All facts must come from provided sources.',
    LIGHT: 'Core facts from sources. Background context can be general knowledge.',
    MODERATE: 'Key claims from sources. Context and explanation can be supplemented.',
    HEAVY: 'Topic-based generation. Clearly indicate this is based on the headline topic.',
  },
};

interface GenerationConfig {
  style: string;
  tone: string;
  targetWordCount: number;
  includeQuotes: boolean;
  includeStatistics: boolean;
  seoOptimized: boolean;
}

interface RequestBody {
  stories: StoryContent[];
  collatedGroups?: CollatedStoryGroup[];
  config: GenerationConfig;
  numberOfSamples: number;
  category?: string;
  useCollatedGroups?: boolean;
}

interface GeneratedSample {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  style: string;
  tone: string;
  wordCount: number;
  readingTime: number;
  sourceHeadlines: string[];
  sourceUrls: string[];
  model: string;
  tokensUsed: number;
  generatedAt: string;
  // New fields for collated generation
  collatedGroupId?: string;
  topic?: string;
  keywords?: string[];
  sourcesUsed?: string[];
  selected: boolean;
  // Content assessment
  contentAssessment?: ContentAssessment;
  supplementationLevel?: string;
}

// OpenRouter configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Use a faster model - Claude 3.5 Haiku for speed, or fallback to GPT-4o-mini
const DEFAULT_MODEL = 'anthropic/claude-3.5-haiku';

// ============================================================================
// CONTENT ASSESSMENT FUNCTIONS
// ============================================================================

/**
 * Assess the quality and completeness of source content
 */
function assessContentQuality(stories: StoryContent[]): ContentAssessment {
  const totalWordCount = stories.reduce((sum, s) => sum + (s.wordCount || 0), 0);
  
  let highQualitySources = 0;
  let mediumQualitySources = 0;
  let lowQualitySources = 0;
  
  for (const story of stories) {
    const score = story.qualityScore ?? 50; // Default to medium if not provided
    if (score >= SUPPLEMENTATION_CONFIG.HIGH_QUALITY_THRESHOLD) {
      highQualitySources++;
    } else if (score >= SUPPLEMENTATION_CONFIG.MEDIUM_QUALITY_THRESHOLD) {
      mediumQualitySources++;
    } else {
      lowQualitySources++;
    }
  }
  
  // Determine quality level and supplementation
  let qualityLevel: ContentAssessment['qualityLevel'];
  let supplementationLevel: ContentAssessment['supplementationLevel'];
  let supplementationRequired: boolean;
  const recommendations: string[] = [];
  
  if (totalWordCount >= SUPPLEMENTATION_CONFIG.SUFFICIENT_CONTENT && highQualitySources > 0) {
    qualityLevel = 'sufficient';
    supplementationLevel = 'none';
    supplementationRequired = false;
    recommendations.push('Source content is sufficient for direct synthesis');
  } else if (totalWordCount >= SUPPLEMENTATION_CONFIG.LIMITED_CONTENT) {
    qualityLevel = 'limited';
    supplementationLevel = 'light';
    supplementationRequired = true;
    recommendations.push('Add background context to expand the article');
    recommendations.push('Explain key terms and concepts');
  } else if (totalWordCount >= SUPPLEMENTATION_CONFIG.MINIMAL_CONTENT) {
    qualityLevel = 'limited';
    supplementationLevel = 'moderate';
    supplementationRequired = true;
    recommendations.push('Significant expansion required');
    recommendations.push('Add historical context and background');
    recommendations.push('Provide expert perspective where relevant');
  } else {
    qualityLevel = 'minimal';
    supplementationLevel = 'heavy';
    supplementationRequired = true;
    recommendations.push('Generate article based primarily on topic/headline');
    recommendations.push('Use general knowledge to create comprehensive coverage');
    recommendations.push('Clearly indicate limited source material');
  }
  
  // Add quality-specific recommendations
  if (lowQualitySources > highQualitySources + mediumQualitySources) {
    recommendations.push('Source quality is low - verify facts carefully');
  }
  
  return {
    totalWordCount,
    qualityLevel,
    highQualitySources,
    mediumQualitySources,
    lowQualitySources,
    supplementationRequired,
    supplementationLevel,
    recommendations,
  };
}

/**
 * Build supplementation instructions based on content assessment
 */
function buildSupplementationInstructions(assessment: ContentAssessment): string {
  const level = assessment.supplementationLevel;
  const rules = SUPPLEMENTATION_CONFIG.RULES[level.toUpperCase() as keyof typeof SUPPLEMENTATION_CONFIG.RULES];
  const factGuidelines = SUPPLEMENTATION_CONFIG.FACT_GUIDELINES[level.toUpperCase() as keyof typeof SUPPLEMENTATION_CONFIG.FACT_GUIDELINES];
  
  let instructions = `
CONTENT SUPPLEMENTATION LEVEL: ${level.toUpperCase()}
Source Content Assessment: ${assessment.totalWordCount} words total (${assessment.qualityLevel} quality)
- High quality sources: ${assessment.highQualitySources}
- Medium quality sources: ${assessment.mediumQualitySources}
- Low quality sources: ${assessment.lowQualitySources}

SUPPLEMENTATION RULES:
${rules}

FACT VERIFICATION:
${factGuidelines}

RECOMMENDATIONS:
${assessment.recommendations.map(r => `- ${r}`).join('\n')}
`;

  // Add specific instructions per level
  switch (level) {
    case 'none':
      instructions += `
STRICT REQUIREMENTS:
- Only use information from provided sources
- Quote sources when attributing specific claims
- Do not add information not in the sources`;
      break;
      
    case 'light':
      instructions += `
EXPANSION GUIDELINES:
- Use source material as the foundation
- Add brief explanations of technical terms
- Include relevant background that provides context
- All core facts must be from sources`;
      break;
      
    case 'moderate':
      instructions += `
EXPANSION GUIDELINES:
- Build upon the source material significantly
- Add comprehensive background and context
- Explain the significance and implications
- Include relevant history or precedent
- Core claims from sources, context can be supplemented
- Clearly distinguish between sourced and supplemented content`;
      break;
      
    case 'heavy':
      instructions += `
GENERATION GUIDELINES:
- Use the headline/topic as your primary guide
- Generate a comprehensive article on this topic
- Draw on general knowledge about the subject
- Create a well-structured, informative piece
- Include relevant background, context, and analysis
- Note: Limited source material available
- The article should be accurate and factual based on the topic`;
      break;
  }
  
  return instructions;
}
// Call OpenRouter API with timeout
async function callOpenRouter(
  messages: { role: string; content: string }[],
  apiKey: string,
  model: string = DEFAULT_MODEL,
  maxTokens: number = 4096,
  temperature: number = 0.7
) {
  console.log(`[ai-generate] Calling OpenRouter with model: ${model}`);
  
  // Add timeout - 55 seconds to stay under Netlify's 60 second limit
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000);
  
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://resonance.news',
        'X-Title': 'Resonance News',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `OpenRouter API error: ${response.status}`);
    }

    const result = await response.json();
    console.log(`[ai-generate] OpenRouter response received, tokens: ${result.usage?.total_tokens || 'unknown'}`);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('AI generation timed out. Please try with fewer stories or a simpler request.');
    }
    throw error;
  }
}

// Get style guidance
function getStyleGuidance(style: string): string {
  const guidance: Record<string, string> = {
    'investigative': 'You are an investigative journalist known for uncovering important stories and presenting complex information clearly.',
    'feature': 'You are a feature writer who crafts engaging human-interest stories with rich detail and narrative flow.',
    'breaking-news': 'You are a breaking news reporter who delivers accurate, timely information in a clear, direct manner.',
    'analysis': 'You are a senior analyst who provides deep insights, context, and expert interpretation of current events.',
    'opinion': 'You are a respected columnist who presents well-reasoned perspectives backed by evidence.',
    'explainer': 'You are an explainer journalist who makes complex topics accessible to general audiences.',
  };
  return guidance[style] || guidance['feature'];
}

// Get tone guidance
function getToneGuidance(tone: string): string {
  const guidance: Record<string, string> = {
    'formal': 'Write in a formal, professional tone suitable for quality publications.',
    'conversational': 'Write in an approachable, conversational tone while maintaining credibility.',
    'authoritative': 'Write with authority and expertise, establishing trust through knowledge.',
    'balanced': 'Present multiple perspectives fairly while maintaining objectivity.',
    'urgent': 'Convey the importance and timeliness of the story with appropriate urgency.',
  };
  return guidance[tone] || guidance['balanced'];
}

// Build system prompt
function buildSystemPrompt(style: string, tone: string): string {
  return `${getStyleGuidance(style)} ${getToneGuidance(tone)}

You are creating content for Resonance, a professional news platform. Your articles must be:
- Original and well-researched
- Accurate and fact-based
- Engaging and readable
- Properly structured with clear sections
- Free from bias and sensationalism
- Attribution-conscious (cite sources appropriately)`;
}

// Build generation prompt with content assessment
function buildGenerationPrompt(
  stories: StoryContent[],
  config: GenerationConfig,
  category?: string
): string {
  // Assess content quality first
  const assessment = assessContentQuality(stories);
  const supplementationInstructions = buildSupplementationInstructions(assessment);
  
  console.log(`[ai-generate] Content assessment: ${assessment.qualityLevel}, supplementation: ${assessment.supplementationLevel}`);
  
  // Limit content per story to prevent token overflow
  const MAX_CONTENT_PER_STORY = 2000; // ~500 tokens per story
  const MAX_TOTAL_CONTENT = 10000; // ~2500 tokens total
  
  let totalLength = 0;
  const sourceContent = stories.map(story => {
    // Truncate individual story content
    let content = story.content || '';
    if (content.length > MAX_CONTENT_PER_STORY) {
      content = content.substring(0, MAX_CONTENT_PER_STORY) + '... [truncated]';
    }
    
    // Check total length
    if (totalLength + content.length > MAX_TOTAL_CONTENT) {
      const remaining = MAX_TOTAL_CONTENT - totalLength;
      if (remaining > 200) {
        content = content.substring(0, remaining) + '... [truncated]';
      } else {
        content = '[Content omitted due to length]';
      }
    }
    totalLength += content.length;
    
    // Include quality indicator
    const qualityIndicator = story.contentQuality ? ` [Quality: ${story.contentQuality}]` : '';
    
    return `Source: ${story.source}${qualityIndicator}
Title: ${story.title}
Published: ${story.publishedAt}
Content:
${content}
---`;
  }).join('\n\n');

  console.log(`[ai-generate] Total source content length: ${totalLength} chars`);

  return `Based on the following source materials, create an original ${config.style} article with a ${config.tone} tone.

${supplementationInstructions}

CRITICAL REQUIREMENTS:
- **WORD COUNT: EXACTLY ${config.targetWordCount} words** - This is a STRICT requirement. The article body must be approximately ${config.targetWordCount} words (±10%).
- Style: ${config.style}
- Tone: ${config.tone}
${category ? `- Category: ${category}` : ''}
${config.includeQuotes ? '- Include relevant quotes from sources where available' : ''}
${config.includeStatistics ? '- Include relevant statistics and data points' : ''}
${config.seoOptimized ? '- Optimize for search engines (clear headline, meta description)' : ''}

SOURCE MATERIALS:
${sourceContent}

ARTICLE REQUIREMENTS:
1. Create an original article following the supplementation guidelines above
2. **THE BODY MUST BE ${config.targetWordCount} WORDS** - count your words and expand if needed
3. Do NOT copy text verbatim - rewrite and synthesize
4. Maintain journalistic integrity and accuracy
5. Attribute information appropriately when from sources
6. Provide a compelling headline, excerpt, and well-structured body
7. Write substantial paragraphs to meet the word count requirement
8. NEVER refuse to write - always produce the requested article

OUTPUT FORMAT (use these exact headers):
HEADLINE:
[Your headline here]

EXCERPT:
[2-3 sentence summary]

BODY:
[Full article content with proper paragraphs]`;
}

// Build generation prompt from collated story group
function buildCollatedGenerationPrompt(
  group: CollatedStoryGroup,
  config: GenerationConfig,
  category?: string
): string {
  // Limit combined content
  const MAX_CONTENT = 8000;
  let content = group.combinedContent;
  if (content.length > MAX_CONTENT) {
    content = content.substring(0, MAX_CONTENT) + '\n... [truncated for length]';
  }

  console.log(`[ai-generate] Collated group "${group.topic}" - ${group.stories.length} stories, ${content.length} chars`);

  // Assess content quality for the collated group
  const assessment = assessContentQuality(group.stories);
  const supplementationInstructions = buildSupplementationInstructions(assessment);
  
  console.log(`[ai-generate] Collated group assessment: ${assessment.qualityLevel}, supplementation: ${assessment.supplementationLevel}`);

  return `Based on the following COLLATED SOURCE MATERIALS about "${group.topic}", create a comprehensive, unified ${config.style} article with a ${config.tone} tone.

${supplementationInstructions}

TOPIC: ${group.topic}
KEYWORDS: ${group.keywords.join(', ')}
SOURCES USED: ${group.sources.join(', ')} (${group.sourceCount} sources)
TOTAL SOURCE WORD COUNT: ${group.totalWordCount} words
${group.averageQualityScore !== undefined ? `AVERAGE QUALITY SCORE: ${group.averageQualityScore.toFixed(1)}/100` : ''}
${group.hasHighQualitySource !== undefined ? `HAS HIGH QUALITY SOURCE: ${group.hasHighQualitySource ? 'Yes' : 'No'}` : ''}

CRITICAL REQUIREMENTS:
- **WORD COUNT: EXACTLY ${config.targetWordCount} words** - This is a STRICT requirement. The article body must be approximately ${config.targetWordCount} words (±10%).
- Style: ${config.style}
- Tone: ${config.tone}
${category ? `- Category: ${category}` : ''}
${config.includeQuotes ? '- Include relevant quotes from sources where available' : ''}
${config.includeStatistics ? '- Include relevant statistics and data points' : ''}
${config.seoOptimized ? '- Optimize for search engines (clear headline, meta description)' : ''}

COLLATED SOURCE MATERIALS (${group.stories.length} related articles):
${content}

ARTICLE REQUIREMENTS:
1. Create a UNIFIED article following the supplementation guidelines above
2. **THE BODY MUST BE ${config.targetWordCount} WORDS** - count your words and expand if needed
3. Identify common themes and key facts across all sources
4. Note any conflicting information between sources and present balanced coverage
5. Do NOT copy text verbatim - rewrite and synthesize into a cohesive narrative
6. Attribute information to specific sources when relevant
7. Focus on the core topic: "${group.topic}"
8. Use keywords naturally: ${group.keywords.join(', ')}
9. Write substantial paragraphs to meet the word count requirement
10. NEVER refuse to write - always produce the requested article

OUTPUT FORMAT (use these exact headers):
HEADLINE:
[Compelling headline that captures the unified story]

EXCERPT:
[2-3 sentence summary that captures the essence of all sources]

BODY:
[Full article content - MUST BE ${config.targetWordCount} WORDS. Write detailed, comprehensive paragraphs with context, analysis, and attribution.]`;
}

// Parse generated article
function parseGeneratedArticle(content: string): { title: string; excerpt: string; body: string } {
  const headlineMatch = content.match(/HEADLINE:\s*\n([\s\S]*?)(?=\n\s*EXCERPT:|$)/i);
  const excerptMatch = content.match(/EXCERPT:\s*\n([\s\S]*?)(?=\n\s*BODY:|$)/i);
  const bodyMatch = content.match(/BODY:\s*\n([\s\S]*?)$/i);

  const title = headlineMatch?.[1]?.trim() || 'Untitled Article';
  const excerpt = excerptMatch?.[1]?.trim() || '';
  const body = bodyMatch?.[1]?.trim() || content;

  return { title, excerpt, body };
}

// Get alternative styles
function getAlternativeStyles(primaryStyle: string): string[] {
  const allStyles = ['investigative', 'feature', 'breaking-news', 'analysis', 'opinion', 'explainer'];
  return allStyles.filter(s => s !== primaryStyle);
}

// Main handler
export const handler = async (event: HandlerEvent) => {
  console.log('[ai-generate] Request received');
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log('[ai-generate] ERROR: OpenRouter API key not configured');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'OpenRouter API key not configured' }),
    };
  }

  try {
    const body: RequestBody = JSON.parse(event.body || '{}');
    const { 
      stories, 
      collatedGroups,
      config, 
      numberOfSamples = 1, 
      category,
      useCollatedGroups = true // Default to using collated groups if available
    } = body;

    // Determine if we should use collated groups
    const hasCollatedGroups = collatedGroups && collatedGroups.length > 0;
    const shouldUseCollated = useCollatedGroups && hasCollatedGroups;

    console.log(`[ai-generate] Mode: ${shouldUseCollated ? 'COLLATED' : 'STANDARD'}`);

    if (shouldUseCollated) {
      console.log(`[ai-generate] Using ${collatedGroups!.length} collated groups`);
      
      // Generate one article per collated group (or limited number)
      const groupsToProcess = collatedGroups!.slice(0, Math.max(1, numberOfSamples));
      const samples: GeneratedSample[] = [];
      let totalTokensUsed = 0;
      const startTime = Date.now();

      for (const group of groupsToProcess) {
        console.log(`[ai-generate] Processing group: "${group.topic}" (${group.stories.length} stories)`);
        
        const messages = [
          {
            role: 'system',
            content: buildSystemPrompt(config.style, config.tone),
          },
          {
            role: 'user',
            content: buildCollatedGenerationPrompt(group, config, category),
          },
        ];

        const response = await callOpenRouter(
          messages,
          apiKey,
          DEFAULT_MODEL,
          Math.min(config.targetWordCount * 2, 2000),
          0.7
        );

        const content = response.choices[0]?.message?.content || '';
        const parsed = parseGeneratedArticle(content);
        const wordCount = parsed.body.split(/\s+/).length;

        samples.push({
          id: `sample-collated-${Date.now()}`,
          ...parsed,
          style: config.style,
          tone: config.tone,
          wordCount,
          readingTime: Math.ceil(wordCount / 200),
          sourceHeadlines: group.stories.map(s => s.headlineId),
          sourceUrls: group.stories.map(s => s.url),
          model: DEFAULT_MODEL,
          tokensUsed: response.usage?.total_tokens || 0,
          generatedAt: new Date().toISOString(),
          selected: false,
          // Collated-specific fields
          collatedGroupId: group.id,
          topic: group.topic,
          keywords: group.keywords,
          sourcesUsed: group.sources,
        });

        totalTokensUsed += response.usage?.total_tokens || 0;
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          samples,
          totalTokensUsed,
          generationTime: Date.now() - startTime,
          model: DEFAULT_MODEL,
          mode: 'collated',
          groupsProcessed: groupsToProcess.length,
        }),
      };
    }

    // Standard mode - use individual stories
    // Limit to 1 sample to stay within timeout
    const actualSamples = Math.min(numberOfSamples, 1);
    console.log(`[ai-generate] Processing ${stories?.length || 0} stories, generating ${actualSamples} sample(s)`);

    if (!stories || stories.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Stories are required' }),
      };
    }

    // Log story content sizes
    stories.forEach((s, i) => {
      console.log(`[ai-generate] Story ${i + 1}: "${s.title?.substring(0, 50)}..." - ${s.content?.length || 0} chars`);
    });

    const samples: GeneratedSample[] = [];
    let totalTokensUsed = 0;
    const startTime = Date.now();

    // Get style variations
    const styles = [
      config.style,
      ...getAlternativeStyles(config.style).slice(0, actualSamples - 1),
    ];

    // Generate samples (limited to stay within timeout)
    for (let i = 0; i < actualSamples; i++) {
      const style = styles[i] || config.style;
      
      const messages = [
        {
          role: 'system',
          content: buildSystemPrompt(style, config.tone),
        },
        {
          role: 'user',
          content: buildGenerationPrompt(stories, { ...config, style }, category),
        },
      ];

      const response = await callOpenRouter(
        messages,
        apiKey,
        DEFAULT_MODEL,
        Math.min(config.targetWordCount * 2, 2000),
        0.7 + (i * 0.1)
      );

      const content = response.choices[0]?.message?.content || '';
      const parsed = parseGeneratedArticle(content);
      const wordCount = parsed.body.split(/\s+/).length;

      samples.push({
        id: `sample-${i}-${Date.now()}`,
        ...parsed,
        style,
        tone: config.tone,
        wordCount,
        readingTime: Math.ceil(wordCount / 200),
        sourceHeadlines: stories.map(s => s.headlineId),
        sourceUrls: stories.map(s => s.url),
        model: DEFAULT_MODEL,
        tokensUsed: response.usage?.total_tokens || 0,
        generatedAt: new Date().toISOString(),
        selected: false,
      });

      totalTokensUsed += response.usage?.total_tokens || 0;
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        samples,
        totalTokensUsed,
        generationTime: Date.now() - startTime,
        model: DEFAULT_MODEL,
        mode: 'standard',
      }),
    };
  } catch (error) {
    console.error('AI generation error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to generate articles',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
