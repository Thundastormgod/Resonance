// OpenRouter AI Service
// Handles all AI operations through OpenRouter API

import type {
  OpenRouterModel,
  OpenRouterRequest,
  OpenRouterResponse,
  OpenRouterMessage,
  GeneratedArticleSample,
  StoryContent,
  GenerationConfig,
  ArticleGenerationRequest,
  ArticleGenerationResponse,
  FactCheckRequest,
  FactCheckResult,
  FactCheckClaim,
  BiasAnalysisRequest,
  BiasAnalysisResult,
  BiasInstance,
  BiasType,
  BiasLevel,
  FactCheckStatus,
  ArticleStyle,
  ArticleTone,
} from '../types';

// OpenRouter API configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Default models for different tasks
const DEFAULT_MODELS = {
  generation: 'anthropic/claude-3.5-sonnet' as OpenRouterModel,
  factCheck: 'openai/gpt-4o' as OpenRouterModel,
  biasCheck: 'anthropic/claude-3-haiku' as OpenRouterModel,
};

/**
 * Make a request to OpenRouter API
 */
export async function callOpenRouter(
  request: OpenRouterRequest,
  apiKey: string,
  siteUrl?: string,
  siteName?: string
): Promise<OpenRouterResponse> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': siteUrl || 'https://resonance.news',
    'X-Title': siteName || 'Resonance News',
  };

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: request.model,
      messages: request.messages,
      max_tokens: request.max_tokens || 4096,
      temperature: request.temperature || 0.7,
      top_p: request.top_p || 1,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `OpenRouter API error: ${response.status}`
    );
  }

  return response.json();
}

/**
 * Extract content from OpenRouter response
 */
function extractContent(response: OpenRouterResponse): string {
  return response.choices[0]?.message?.content || '';
}

/**
 * Generate article samples from source stories
 */
export async function generateArticleSamples(
  request: ArticleGenerationRequest,
  apiKey: string
): Promise<ArticleGenerationResponse> {
  const startTime = Date.now();
  const { stories, config, numberOfSamples, category } = request;
  
  // Combine source content for context
  const sourceContext = stories.map(story => 
    `### Source: ${story.source}\nTitle: ${story.title}\nPublished: ${story.publishedAt}\n\n${story.content}`
  ).join('\n\n---\n\n');

  const samples: GeneratedArticleSample[] = [];
  let totalTokensUsed = 0;

  // Generate each sample with different approaches
  const styleVariations: ArticleStyle[] = [
    config.style,
    ...getAlternativeStyles(config.style).slice(0, numberOfSamples - 1),
  ];

  for (let i = 0; i < numberOfSamples; i++) {
    const style = styleVariations[i] || config.style;
    const prompt = buildGenerationPrompt(stories, {
      ...config,
      style,
    }, category);

    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: getSystemPromptForGeneration(style, config.tone),
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await callOpenRouter(
      {
        model: DEFAULT_MODELS.generation,
        messages,
        max_tokens: Math.min(config.targetWordCount * 2, 8000),
        temperature: 0.7 + (i * 0.1), // Slight variation for diversity
      },
      apiKey
    );

    const content = extractContent(response);
    const parsed = parseGeneratedArticle(content, style, config.tone);

    samples.push({
      id: `sample-${i}-${Date.now()}`,
      ...parsed,
      style,
      tone: config.tone,
      sourceHeadlines: stories.map(s => s.headlineId),
      sourceUrls: stories.map(s => s.url),
      model: DEFAULT_MODELS.generation,
      tokensUsed: response.usage?.total_tokens || 0,
      generatedAt: new Date().toISOString(),
      selected: false,
    });

    totalTokensUsed += response.usage?.total_tokens || 0;
  }

  return {
    samples,
    totalTokensUsed,
    generationTime: Date.now() - startTime,
    model: DEFAULT_MODELS.generation,
  };
}

/**
 * Get alternative article styles for diversity
 */
function getAlternativeStyles(primaryStyle: ArticleStyle): ArticleStyle[] {
  const allStyles: ArticleStyle[] = [
    'investigative',
    'feature',
    'breaking-news',
    'analysis',
    'opinion',
    'explainer',
  ];
  return allStyles.filter(s => s !== primaryStyle);
}

/**
 * Build the generation prompt
 */
function buildGenerationPrompt(
  stories: StoryContent[],
  config: GenerationConfig,
  category?: string
): string {
  const sourceContent = stories.map(story => 
    `Source: ${story.source}
Title: ${story.title}
Published: ${story.publishedAt}
Content:
${story.content}
---`
  ).join('\n\n');

  return `Based on the following source materials, create an original ${config.style} article with a ${config.tone} tone.

TARGET SPECIFICATIONS:
- Word count: approximately ${config.targetWordCount} words
- Style: ${config.style}
- Tone: ${config.tone}
${category ? `- Category: ${category}` : ''}
${config.includeQuotes ? '- Include relevant quotes from sources' : ''}
${config.includeStatistics ? '- Include relevant statistics and data points' : ''}
${config.seoOptimized ? '- Optimize for search engines (clear headline, meta description)' : ''}

SOURCE MATERIALS:
${sourceContent}

REQUIREMENTS:
1. Create an original article that synthesizes information from ALL provided sources
2. Do NOT copy text verbatim - rewrite and synthesize
3. Maintain journalistic integrity and accuracy
4. Attribute information appropriately
5. Provide a compelling headline, excerpt, and well-structured body

OUTPUT FORMAT (use these exact headers):
HEADLINE:
[Your headline here]

EXCERPT:
[2-3 sentence summary]

BODY:
[Full article content with proper paragraphs]`;
}

/**
 * Get system prompt for article generation
 */
function getSystemPromptForGeneration(style: ArticleStyle, tone: ArticleTone): string {
  const styleGuidance: Record<ArticleStyle, string> = {
    'investigative': 'You are an investigative journalist known for uncovering important stories and presenting complex information clearly.',
    'feature': 'You are a feature writer who crafts engaging human-interest stories with rich detail and narrative flow.',
    'breaking-news': 'You are a breaking news reporter who delivers accurate, timely information in a clear, direct manner.',
    'analysis': 'You are a senior analyst who provides deep insights, context, and expert interpretation of current events.',
    'opinion': 'You are a respected columnist who presents well-reasoned perspectives backed by evidence.',
    'explainer': 'You are an explainer journalist who makes complex topics accessible to general audiences.',
  };

  const toneGuidance: Record<ArticleTone, string> = {
    'formal': 'Write in a formal, professional tone suitable for quality publications.',
    'conversational': 'Write in an approachable, conversational tone while maintaining credibility.',
    'authoritative': 'Write with authority and expertise, establishing trust through knowledge.',
    'balanced': 'Present multiple perspectives fairly while maintaining objectivity.',
    'urgent': 'Convey the importance and timeliness of the story with appropriate urgency.',
  };

  return `${styleGuidance[style]} ${toneGuidance[tone]}

You are creating content for Resonance, a professional news platform. Your articles must be:
- Original and well-researched
- Accurate and fact-based
- Engaging and readable
- Properly structured with clear sections
- Free from bias and sensationalism
- Attribution-conscious (cite sources appropriately)`;
}

/**
 * Parse the generated article content
 */
function parseGeneratedArticle(
  content: string,
  style: ArticleStyle,
  tone: ArticleTone
): { title: string; excerpt: string; body: string; wordCount: number; readingTime: number } {
  // Extract sections using headers
  const headlineMatch = content.match(/HEADLINE:\s*\n([\s\S]*?)(?=\n\s*EXCERPT:|$)/i);
  const excerptMatch = content.match(/EXCERPT:\s*\n([\s\S]*?)(?=\n\s*BODY:|$)/i);
  const bodyMatch = content.match(/BODY:\s*\n([\s\S]*?)$/i);

  const title = headlineMatch?.[1]?.trim() || 'Untitled Article';
  const excerpt = excerptMatch?.[1]?.trim() || '';
  const body = bodyMatch?.[1]?.trim() || content;

  const wordCount = body.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200); // 200 WPM average

  return {
    title,
    excerpt,
    body,
    wordCount,
    readingTime,
  };
}

/**
 * Perform fact-checking on a generated article
 */
export async function factCheckArticle(
  request: FactCheckRequest,
  apiKey: string
): Promise<FactCheckResult> {
  const { article, sourceStories } = request;

  const sourceContext = sourceStories.map(story =>
    `Source: ${story.source}\nContent: ${story.content}`
  ).join('\n\n---\n\n');

  const messages: OpenRouterMessage[] = [
    {
      role: 'system',
      content: `You are a professional fact-checker for a news organization. Your job is to verify claims made in articles against source materials and general knowledge.

You must:
1. Identify specific factual claims in the article
2. Verify each claim against the provided source materials
3. Flag any claims that cannot be verified or appear incorrect
4. Provide clear explanations and suggested corrections
5. Rate the overall factual accuracy

Be thorough but fair - don't flag stylistic choices or opinions as factual errors.`,
    },
    {
      role: 'user',
      content: `ARTICLE TO FACT-CHECK:
Title: ${article.title}
Content:
${article.body}

SOURCE MATERIALS FOR VERIFICATION:
${sourceContext}

Please analyze this article and provide a fact-check report in the following JSON format:
{
  "overallScore": <0-100>,
  "claims": [
    {
      "claim": "<the specific claim>",
      "location": "<where in the article>",
      "status": "<verified|unverified|disputed|false>",
      "confidence": <0-100>,
      "explanation": "<why this rating>",
      "sources": ["<source references>"],
      "suggestedCorrection": "<if needed>"
    }
  ],
  "recommendations": ["<general recommendations>"]
}`,
    },
  ];

  const response = await callOpenRouter(
    {
      model: DEFAULT_MODELS.factCheck,
      messages,
      max_tokens: 4000,
      temperature: 0.3, // Lower temperature for accuracy
    },
    apiKey
  );

  const content = extractContent(response);
  const parsed = parseFactCheckResponse(content, article.id);

  return {
    ...parsed,
    model: DEFAULT_MODELS.factCheck,
    checkedAt: new Date().toISOString(),
    tokensUsed: response.usage?.total_tokens || 0,
  };
}

/**
 * Parse fact-check response
 */
function parseFactCheckResponse(content: string, articleId: string): Omit<FactCheckResult, 'model' | 'checkedAt' | 'tokensUsed'> {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      
      const claims: FactCheckClaim[] = (data.claims || []).map((claim: any, index: number) => ({
        id: `claim-${index}-${Date.now()}`,
        claim: claim.claim || '',
        location: claim.location || '',
        status: validateFactCheckStatus(claim.status),
        confidence: Math.min(100, Math.max(0, claim.confidence || 50)),
        explanation: claim.explanation || '',
        sources: claim.sources || [],
        suggestedCorrection: claim.suggestedCorrection,
      }));

      const verifiedCount = claims.filter(c => c.status === 'verified').length;
      const disputedCount = claims.filter(c => c.status === 'disputed').length;
      const falseCount = claims.filter(c => c.status === 'false').length;
      const unverifiedCount = claims.filter(c => c.status === 'unverified').length;

      return {
        articleId,
        overallScore: Math.min(100, Math.max(0, data.overallScore || 50)),
        claims,
        totalClaimsChecked: claims.length,
        verifiedCount,
        disputedCount,
        falseCount,
        unverifiedCount,
        recommendations: data.recommendations || [],
      };
    }
  } catch (e) {
    console.error('Failed to parse fact-check response:', e);
  }

  // Return default if parsing fails
  return {
    articleId,
    overallScore: 50,
    claims: [],
    totalClaimsChecked: 0,
    verifiedCount: 0,
    disputedCount: 0,
    falseCount: 0,
    unverifiedCount: 0,
    recommendations: ['Unable to parse fact-check results. Manual review recommended.'],
  };
}

/**
 * Validate fact-check status
 */
function validateFactCheckStatus(status: string): FactCheckStatus {
  const validStatuses: FactCheckStatus[] = ['verified', 'unverified', 'disputed', 'false'];
  return validStatuses.includes(status as FactCheckStatus) 
    ? (status as FactCheckStatus) 
    : 'unverified';
}

/**
 * Perform bias analysis on a generated article
 */
export async function analyzeBias(
  request: BiasAnalysisRequest,
  apiKey: string
): Promise<BiasAnalysisResult> {
  const { article } = request;

  const messages: OpenRouterMessage[] = [
    {
      role: 'system',
      content: `You are a media bias analyst specializing in identifying various forms of bias in news content. Your analysis should be objective and focused on improving journalistic quality.

Types of bias to look for:
- Political bias (left/right leaning language or framing)
- Emotional bias (language designed to evoke emotional responses)
- Corporate bias (favorable coverage due to business interests)
- Sensational bias (exaggeration or dramatic language)
- Framing bias (how the story is presented affects perception)
- Selection bias (what information is included/excluded)
- Omission bias (important context left out)

Be fair and constructive - the goal is to help improve the article, not to criticize.`,
    },
    {
      role: 'user',
      content: `ARTICLE TO ANALYZE:
Title: ${article.title}
Content:
${article.body}

Please analyze this article for bias and provide a report in the following JSON format:
{
  "overallBiasLevel": "<none|low|moderate|high|severe>",
  "overallScore": <0-100, where 100 is no bias>,
  "instances": [
    {
      "type": "<political|emotional|corporate|sensational|framing|selection|omission>",
      "level": "<none|low|moderate|high|severe>",
      "text": "<the biased text>",
      "location": "<where in the article>",
      "explanation": "<why this is biased>",
      "suggestedRevision": "<improved version>"
    }
  ],
  "politicalLeaning": "<left|center-left|center|center-right|right>",
  "tonalAnalysis": {
    "objectivity": <0-100>,
    "emotionality": <0-100>,
    "sensationalism": <0-100>
  },
  "recommendations": ["<suggestions for improvement>"]
}`,
    },
  ];

  const response = await callOpenRouter(
    {
      model: DEFAULT_MODELS.biasCheck,
      messages,
      max_tokens: 3000,
      temperature: 0.3,
    },
    apiKey
  );

  const content = extractContent(response);
  const parsed = parseBiasResponse(content, article.id);

  return {
    ...parsed,
    model: DEFAULT_MODELS.biasCheck,
    analyzedAt: new Date().toISOString(),
    tokensUsed: response.usage?.total_tokens || 0,
  };
}

/**
 * Parse bias analysis response
 */
function parseBiasResponse(content: string, articleId: string): Omit<BiasAnalysisResult, 'model' | 'analyzedAt' | 'tokensUsed'> {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);

      const instances: BiasInstance[] = (data.instances || []).map((instance: any, index: number) => ({
        id: `bias-${index}-${Date.now()}`,
        type: validateBiasType(instance.type),
        level: validateBiasLevel(instance.level),
        text: instance.text || '',
        location: instance.location || '',
        explanation: instance.explanation || '',
        suggestedRevision: instance.suggestedRevision,
      }));

      return {
        articleId,
        overallBiasLevel: validateBiasLevel(data.overallBiasLevel),
        overallScore: Math.min(100, Math.max(0, data.overallScore || 75)),
        instances,
        politicalLeaning: data.politicalLeaning,
        tonalAnalysis: {
          objectivity: data.tonalAnalysis?.objectivity || 50,
          emotionality: data.tonalAnalysis?.emotionality || 50,
          sensationalism: data.tonalAnalysis?.sensationalism || 50,
        },
        recommendations: data.recommendations || [],
      };
    }
  } catch (e) {
    console.error('Failed to parse bias response:', e);
  }

  return {
    articleId,
    overallBiasLevel: 'low',
    overallScore: 75,
    instances: [],
    tonalAnalysis: {
      objectivity: 50,
      emotionality: 50,
      sensationalism: 50,
    },
    recommendations: ['Unable to parse bias analysis. Manual review recommended.'],
  };
}

/**
 * Validate bias type
 */
function validateBiasType(type: string): BiasType {
  const validTypes: BiasType[] = ['political', 'emotional', 'corporate', 'sensational', 'framing', 'selection', 'omission'];
  return validTypes.includes(type as BiasType) ? (type as BiasType) : 'framing';
}

/**
 * Validate bias level
 */
function validateBiasLevel(level: string): BiasLevel {
  const validLevels: BiasLevel[] = ['none', 'low', 'moderate', 'high', 'severe'];
  return validLevels.includes(level as BiasLevel) ? (level as BiasLevel) : 'low';
}

/**
 * Get available OpenRouter models
 */
export function getAvailableModels(): { id: OpenRouterModel; name: string; description: string }[] {
  return [
    { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'OpenAI\'s most capable model' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and cost-effective' },
    { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', description: 'High capability with large context' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Excellent for writing' },
    { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', description: 'Most capable Claude model' },
    { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', description: 'Fast and efficient' },
    { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', description: 'Google\'s advanced model' },
    { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5', description: 'Fast Google model' },
    { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', description: 'Open source, capable' },
    { id: 'mistralai/mistral-large', name: 'Mistral Large', description: 'Strong European model' },
  ];
}

/**
 * Estimate token usage for text
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Calculate cost estimate (approximate)
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: OpenRouterModel
): number {
  // Approximate costs per 1M tokens (varies by model)
  const costPerMillion: Record<string, { input: number; output: number }> = {
    'openai/gpt-4o': { input: 2.5, output: 10 },
    'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
    'anthropic/claude-3.5-sonnet': { input: 3, output: 15 },
    'anthropic/claude-3-haiku': { input: 0.25, output: 1.25 },
    'google/gemini-pro-1.5': { input: 1.25, output: 5 },
    'google/gemini-flash-1.5': { input: 0.075, output: 0.3 },
    'meta-llama/llama-3.1-70b-instruct': { input: 0.52, output: 0.75 },
  };

  const modelCost = costPerMillion[model] || { input: 1, output: 3 };
  
  return (
    (inputTokens / 1_000_000) * modelCost.input +
    (outputTokens / 1_000_000) * modelCost.output
  );
}
