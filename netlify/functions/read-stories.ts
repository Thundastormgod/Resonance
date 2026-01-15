// Netlify Function: Read Story Content
// Extracts full article content from URLs with strict validation

interface HandlerEvent {
  httpMethod: string;
  body: string | null;
}

interface Headline {
  id: string;
  title: string;
  url: string;
  description?: string;
  source?: string | { name: string; type: string; url: string };
  pubDate?: string;
  publishedAt?: string;
}

// Validation result for content quality
interface ContentValidation {
  isValid: boolean;
  quality: 'high' | 'medium' | 'low' | 'unusable';
  score: number; // 0-100
  issues: string[];
  cleanedContent: string;
  wordCount: number;
}

// Quality thresholds
const QUALITY_THRESHOLDS = {
  MIN_WORD_COUNT: 50,          // Minimum words for usable content
  MIN_SENTENCE_COUNT: 3,       // Minimum sentences
  MAX_HTML_ARTIFACT_RATIO: 0.1, // Max 10% HTML artifacts
  MIN_AVG_WORD_LENGTH: 3,      // Filter gibberish
  MAX_AVG_WORD_LENGTH: 15,     // Filter encoded content
  MIN_ALPHANUMERIC_RATIO: 0.7, // At least 70% alphanumeric
};

interface StoryContent {
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
  // New validation fields
  contentQuality: 'high' | 'medium' | 'low' | 'unusable';
  qualityScore: number;
  validationIssues: string[];
}

// Collated story group - combines similar stories
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
  similarity: number; // 0-1 score of how similar the stories are
  // New quality fields
  averageQualityScore: number;
  hasHighQualitySource: boolean;
}

// Common stop words to ignore when extracting keywords
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who',
  'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'new', 'said', 'says',
  'after', 'before', 'about', 'over', 'into', 'through', 'during', 'including',
  'until', 'against', 'among', 'throughout', 'despite', 'towards', 'upon', 'according'
]);

// ============================================================================
// STRICT CONTENT VALIDATION
// ============================================================================

/**
 * Validates and scores content quality
 * Returns detailed validation result with quality score and issues
 */
function validateContentQuality(content: string, title: string): ContentValidation {
  const issues: string[] = [];
  let score = 100;
  
  if (!content || content.trim().length === 0) {
    return {
      isValid: false,
      quality: 'unusable',
      score: 0,
      issues: ['No content provided'],
      cleanedContent: '',
      wordCount: 0,
    };
  }

  // Clean the content first
  let cleanedContent = content;
  
  // Check 1: HTML artifacts detection
  const htmlArtifacts = [
    { pattern: /&[a-z]+;/gi, name: 'HTML entities' },
    { pattern: /<[a-z][^>]*>/gi, name: 'HTML tags' },
    { pattern: /href\s*=/gi, name: 'href attributes' },
    { pattern: /class\s*=/gi, name: 'class attributes' },
    { pattern: /style\s*=/gi, name: 'style attributes' },
    { pattern: /\b(onclick|onload|onerror)\s*=/gi, name: 'event handlers' },
  ];
  
  let htmlArtifactCount = 0;
  for (const { pattern, name } of htmlArtifacts) {
    const matches = cleanedContent.match(pattern);
    if (matches) {
      htmlArtifactCount += matches.length;
      if (matches.length > 5) {
        issues.push(`Contains ${name} (${matches.length} occurrences)`);
      }
    }
  }
  
  // Clean HTML artifacts
  cleanedContent = cleanTextFromHTML(cleanedContent);
  cleanedContent = cleanedContent
    .replace(/\b(href|font|nbsp|amp|quot|class|style)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Check 2: Word count
  const words = cleanedContent.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  
  if (wordCount < QUALITY_THRESHOLDS.MIN_WORD_COUNT) {
    issues.push(`Insufficient word count: ${wordCount} (minimum: ${QUALITY_THRESHOLDS.MIN_WORD_COUNT})`);
    score -= 40;
  } else if (wordCount < QUALITY_THRESHOLDS.MIN_WORD_COUNT * 2) {
    issues.push(`Low word count: ${wordCount}`);
    score -= 20;
  }
  
  // Check 3: Sentence count
  const sentences = cleanedContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length < QUALITY_THRESHOLDS.MIN_SENTENCE_COUNT) {
    issues.push(`Insufficient sentences: ${sentences.length}`);
    score -= 20;
  }
  
  // Check 4: Average word length (detect gibberish or encoded content)
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / Math.max(words.length, 1);
  if (avgWordLength < QUALITY_THRESHOLDS.MIN_AVG_WORD_LENGTH) {
    issues.push(`Suspicious average word length: ${avgWordLength.toFixed(1)} (possible gibberish)`);
    score -= 30;
  }
  if (avgWordLength > QUALITY_THRESHOLDS.MAX_AVG_WORD_LENGTH) {
    issues.push(`Suspicious average word length: ${avgWordLength.toFixed(1)} (possible encoded content)`);
    score -= 30;
  }
  
  // Check 5: Alphanumeric ratio
  const alphanumericChars = (cleanedContent.match(/[a-zA-Z0-9]/g) || []).length;
  const totalChars = cleanedContent.length;
  const alphaRatio = totalChars > 0 ? alphanumericChars / totalChars : 0;
  
  if (alphaRatio < QUALITY_THRESHOLDS.MIN_ALPHANUMERIC_RATIO) {
    issues.push(`Low alphanumeric ratio: ${(alphaRatio * 100).toFixed(1)}% (possible special characters/encoding issues)`);
    score -= 25;
  }
  
  // Check 6: HTML artifact ratio
  const artifactRatio = htmlArtifactCount / Math.max(wordCount, 1);
  if (artifactRatio > QUALITY_THRESHOLDS.MAX_HTML_ARTIFACT_RATIO) {
    issues.push(`High HTML artifact ratio: ${(artifactRatio * 100).toFixed(1)}%`);
    score -= 20;
  }
  
  // Check 7: Repetitive content detection
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const uniqueRatio = uniqueWords.size / Math.max(words.length, 1);
  if (uniqueRatio < 0.3 && wordCount > 20) {
    issues.push(`Highly repetitive content: ${(uniqueRatio * 100).toFixed(1)}% unique words`);
    score -= 15;
  }
  
  // Check 8: Content relevance to title
  if (title) {
    const titleKeywords = extractKeywords(title);
    const contentKeywords = extractKeywords(cleanedContent);
    const relevance = calculateSimilarity(titleKeywords, contentKeywords);
    if (relevance < 0.1 && wordCount > 50) {
      issues.push(`Content may not be relevant to title (similarity: ${(relevance * 100).toFixed(1)}%)`);
      score -= 10;
    }
  }
  
  // Ensure score stays in bounds
  score = Math.max(0, Math.min(100, score));
  
  // Determine quality level
  let quality: ContentValidation['quality'];
  if (score >= 70) {
    quality = 'high';
  } else if (score >= 50) {
    quality = 'medium';
  } else if (score >= 25) {
    quality = 'low';
  } else {
    quality = 'unusable';
  }
  
  return {
    isValid: score >= 25,
    quality,
    score,
    issues,
    cleanedContent,
    wordCount,
  };
}

/**
 * Validates a URL is properly formatted and accessible
 */
function validateUrl(url: string): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!url || typeof url !== 'string') {
    return { isValid: false, issues: ['URL is missing or invalid'] };
  }
  
  // Check URL format
  try {
    const parsed = new URL(url);
    
    // Must be http or https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      issues.push(`Invalid protocol: ${parsed.protocol}`);
    }
    
    // Check for suspicious patterns
    if (url.includes('javascript:')) {
      issues.push('Contains javascript protocol');
    }
    if (url.includes('data:')) {
      issues.push('Contains data URI');
    }
    
    // Check for Google redirect URLs and extract actual URL
    if (parsed.hostname === 'news.google.com' && parsed.pathname.includes('/articles/')) {
      issues.push('Google News redirect URL - may need extraction');
    }
    
  } catch {
    issues.push('Malformed URL');
    return { isValid: false, issues };
  }
  
  return { isValid: issues.length === 0, issues };
}

// ============================================================================
// END STRICT CONTENT VALIDATION
// ============================================================================

// Extract keywords from text
function extractKeywords(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !STOP_WORDS.has(word));
  
  // Count word frequency
  const wordCount = new Map<string, number>();
  for (const word of words) {
    wordCount.set(word, (wordCount.get(word) || 0) + 1);
  }
  
  // Sort by frequency and return top keywords
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

// Calculate similarity between two sets of keywords
function calculateSimilarity(keywords1: string[], keywords2: string[]): number {
  if (keywords1.length === 0 || keywords2.length === 0) return 0;
  
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);
  
  let intersection = 0;
  for (const word of set1) {
    if (set2.has(word)) intersection++;
  }
  
  // Jaccard similarity
  const union = set1.size + set2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// Validate content is clean and usable
function validateAndCleanContent(content: string): string {
  if (!content) return '';
  
  // Check for signs of HTML garbage
  const htmlPatterns = [
    /&[a-z]+;/gi,           // HTML entities like &nbsp;
    /<[a-z][^>]*>/gi,        // HTML tags
    /href\s*=/gi,            // href attributes
    /font\s+color/gi,        // font color attributes
    /class\s*=/gi,           // class attributes
    /style\s*=/gi,           // style attributes
  ];
  
  let cleanContent = content;
  
  for (const pattern of htmlPatterns) {
    if (pattern.test(cleanContent)) {
      // Content has HTML artifacts, clean it again
      cleanContent = cleanTextFromHTML(cleanContent);
    }
  }
  
  // Remove any remaining suspicious patterns
  cleanContent = cleanContent
    .replace(/\b(href|font|nbsp|amp|quot)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return cleanContent;
}

// Collate stories into groups by similarity
function collateStories(stories: StoryContent[], similarityThreshold: number = 0.2): CollatedStoryGroup[] {
  if (stories.length === 0) return [];
  
  // Validate and clean all story content first
  const cleanedStories = stories.map(story => ({
    ...story,
    title: validateAndCleanContent(story.title),
    content: validateAndCleanContent(story.content),
  }));
  
  // Add keywords to each story
  const storiesWithKeywords = cleanedStories.map(story => ({
    ...story,
    keywords: extractKeywords(story.title + ' ' + story.content),
  }));
  
  const groups: CollatedStoryGroup[] = [];
  const assigned = new Set<string>();
  
  for (const story of storiesWithKeywords) {
    if (assigned.has(story.headlineId)) continue;
    
    // Find similar stories
    const similarStories = storiesWithKeywords.filter(s => {
      if (s.headlineId === story.headlineId || assigned.has(s.headlineId)) return false;
      const similarity = calculateSimilarity(story.keywords || [], s.keywords || []);
      return similarity >= similarityThreshold;
    });
    
    // Create group with this story and similar ones
    const groupStories = [story, ...similarStories];
    groupStories.forEach(s => assigned.add(s.headlineId));
    
    // Find common keywords across all stories in group
    const allKeywords = groupStories.flatMap(s => s.keywords || []);
    const keywordCounts = new Map<string, number>();
    for (const kw of allKeywords) {
      keywordCounts.set(kw, (keywordCounts.get(kw) || 0) + 1);
    }
    
    // Keywords that appear in multiple stories
    const commonKeywords = Array.from(keywordCounts.entries())
      .filter(([, count]) => count >= Math.ceil(groupStories.length / 2))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([kw]) => kw);
    
    // Generate topic from common keywords or primary story title
    const topic = commonKeywords.length > 0 
      ? commonKeywords.slice(0, 3).join(' ')
      : story.title.split(/\s+/).slice(0, 5).join(' ');
    
    // Combine content from all stories
    const combinedContent = groupStories
      .map(s => `[Source: ${s.source}]\n${s.title}\n${s.content}`)
      .join('\n\n---\n\n');
    
    const totalWordCount = groupStories.reduce((sum, s) => sum + s.wordCount, 0);
    const sources = [...new Set(groupStories.map(s => s.source))];
    
    // Calculate average similarity within group
    let totalSimilarity = 0;
    let comparisons = 0;
    for (let i = 0; i < groupStories.length; i++) {
      for (let j = i + 1; j < groupStories.length; j++) {
        totalSimilarity += calculateSimilarity(
          groupStories[i].keywords || [],
          groupStories[j].keywords || []
        );
        comparisons++;
      }
    }
    const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 1;
    
    // Calculate quality metrics for the group
    const qualityScores = groupStories.map(s => s.qualityScore || 0);
    const averageQualityScore = qualityScores.reduce((sum, s) => sum + s, 0) / Math.max(qualityScores.length, 1);
    const hasHighQualitySource = groupStories.some(s => s.contentQuality === 'high');
    
    groups.push({
      id: `group-${Date.now()}-${groups.length}`,
      topic,
      keywords: commonKeywords,
      stories: groupStories,
      combinedContent,
      totalWordCount,
      sourceCount: sources.length,
      sources,
      primaryStory: story,
      similarity: avgSimilarity,
      averageQualityScore,
      hasHighQualitySource,
    });
  }
  
  // Sort groups by number of stories (larger groups first)
  return groups.sort((a, b) => b.stories.length - a.stories.length);
}

// Extract content from HTML
function extractContentFromHTML(html: string): string {
  // Remove scripts, styles, nav, etc.
  let cleanHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Try article tag first
  const articleMatch = cleanHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    return cleanTextFromHTML(articleMatch[1]);
  }

  // Try main tag
  const mainMatch = cleanHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) {
    return cleanTextFromHTML(mainMatch[1]);
  }

  // Extract paragraphs
  const paragraphs: string[] = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  while ((match = pRegex.exec(cleanHtml)) !== null) {
    const text = cleanTextFromHTML(match[1]).trim();
    if (text.length > 50) {
      paragraphs.push(text);
    }
  }
  
  if (paragraphs.length > 0) {
    return paragraphs.join('\n\n');
  }

  // Fallback to body
  const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? cleanTextFromHTML(bodyMatch[1]) : '';
}

// Clean HTML to plain text
function cleanTextFromHTML(html: string): string {
  if (!html) return '';
  
  let text = html
    // Remove all script and style content first
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Add newlines for block elements
    .replace(/<\/?(p|div|br|h[1-6]|li|blockquote|article|section)[^>]*>/gi, '\n')
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode all HTML entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&hellip;/gi, '...')
    .replace(/&bull;/gi, '•')
    .replace(/&copy;/gi, '©')
    .replace(/&reg;/gi, '®')
    .replace(/&trade;/gi, '™')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    // Remove any remaining & codes
    .replace(/&[a-zA-Z]+;/g, ' ')
    // Clean up whitespace
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  
  return text;
}

// Additional function to clean Google News RSS descriptions
function cleanRSSDescription(description: string): string {
  if (!description) return '';
  
  // Google News RSS often has HTML snippets like:
  // <a href="...">Source Name</a><font color="#6f6f6f">Source</font>
  let text = description
    // Remove anchor tags but keep text
    .replace(/<a[^>]*>([^<]*)<\/a>/gi, '$1')
    // Remove font tags but keep text
    .replace(/<font[^>]*>([^<]*)<\/font>/gi, '$1')
    // Remove table/tr/td tags
    .replace(/<\/?(?:table|tr|td|th|tbody|thead)[^>]*>/gi, ' ')
    // Remove img tags
    .replace(/<img[^>]*>/gi, '')
    // Clean remaining HTML
    .replace(/<[^>]+>/g, '')
    // Decode entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&[a-zA-Z]+;/g, ' ')
    // Clean whitespace
    .replace(/\s+/g, ' ')
    .trim();
  
  // Check if result looks like actual content (not just source names/links)
  // If it's too short or looks like metadata, return empty
  if (text.length < 30) return '';
  
  // Filter out lines that are just source attributions
  const lines = text.split(/\s{2,}/).filter(line => {
    const lower = line.toLowerCase();
    // Skip if it looks like a source attribution
    if (lower.match(/^(source:|from |via |by |\d+ hours? ago|\d+ min)/i)) return false;
    if (line.length < 20) return false;
    return true;
  });
  
  return lines.join(' ').trim();
}

// Extract author
function extractAuthor(html: string): string | undefined {
  const patterns = [
    /<meta[^>]*name="author"[^>]*content="([^"]+)"/i,
    /<meta[^>]*property="article:author"[^>]*content="([^"]+)"/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return cleanTextFromHTML(match[1]);
  }
  return undefined;
}

// Extract published date
function extractPublishedDate(html: string): string | undefined {
  const patterns = [
    /<meta[^>]*property="article:published_time"[^>]*content="([^"]+)"/i,
    /<time[^>]*datetime="([^"]+)"/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        return new Date(match[1]).toISOString();
      } catch {
        continue;
      }
    }
  }
  return undefined;
}

// Extract source name from URL
function extractSourceFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, '');
    const parts = hostname.split('.');
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  } catch {
    return 'Unknown Source';
  }
}

// Extract article content from URL
async function extractArticleContent(
  url: string,
  title: string,
  headlineId: string,
  fallbackDescription?: string,
  fallbackSource?: string,
  fallbackPubDate?: string
): Promise<StoryContent> {
  console.log(`[read-stories] Extracting content from: ${url}`);
  
  // Clean the fallback description first
  const cleanedDescription = fallbackDescription ? cleanRSSDescription(fallbackDescription) : '';
  
  // Validate URL first
  const urlValidation = validateUrl(url);
  if (!urlValidation.isValid) {
    console.log(`[read-stories] Invalid URL: ${urlValidation.issues.join(', ')}`);
  }
  
  // For Google News URLs, always use fallback description
  // Google News URLs are redirect pages, not actual articles
  if (url.includes('news.google.com')) {
    console.log(`[read-stories] Google News URL detected, using fallback description`);
    
    // Use cleaned description if it has meaningful content
    const contentToUse = cleanedDescription.length >= 30 ? cleanedDescription : title;
    const validation = validateContentQuality(contentToUse, title);
    
    return {
      headlineId,
      url,
      title: cleanTextFromHTML(title),
      content: validation.cleanedContent || contentToUse,
      publishedAt: fallbackPubDate || new Date().toISOString(),
      source: fallbackSource || 'Google News',
      wordCount: validation.wordCount,
      readingTime: Math.ceil(validation.wordCount / 200),
      extractedAt: new Date().toISOString(),
      success: validation.isValid,
      error: validation.isValid ? undefined : validation.issues.join('; '),
      contentQuality: validation.quality,
      qualityScore: validation.score,
      validationIssues: validation.issues,
    };
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`[read-stories] HTTP error ${response.status} for ${url}`);
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    console.log(`[read-stories] Received ${html.length} bytes from ${url}`);
    
    let content = extractContentFromHTML(html);
    const author = extractAuthor(html);
    const publishedAt = extractPublishedDate(html) || fallbackPubDate;
    const source = fallbackSource || extractSourceFromUrl(url);

    // If extraction failed but we have a cleaned description, use that
    if (content.length < 100 && cleanedDescription.length >= 30) {
      console.log(`[read-stories] Using cleaned fallback description for ${url}`);
      content = cleanedDescription;
    }

    // Validate the extracted content
    const validation = validateContentQuality(content, title);
    
    console.log(`[read-stories] Extracted ${validation.wordCount} words, quality: ${validation.quality}, score: ${validation.score}`);

    return {
      headlineId,
      url,
      title: cleanTextFromHTML(title),
      content: validation.cleanedContent || content,
      author,
      publishedAt: publishedAt || new Date().toISOString(),
      source,
      wordCount: validation.wordCount,
      readingTime: Math.ceil(validation.wordCount / 200),
      extractedAt: new Date().toISOString(),
      success: validation.isValid,
      error: !validation.isValid ? validation.issues.join('; ') : undefined,
      contentQuality: validation.quality,
      qualityScore: validation.score,
      validationIssues: validation.issues,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.log(`[read-stories] Error fetching ${url}: ${errorMsg}`);
    
    // Use cleaned fallback description if available
    if (cleanedDescription.length >= 30) {
      console.log(`[read-stories] Using cleaned fallback description after error for ${url}`);
      const validation = validateContentQuality(cleanedDescription, title);
      
      return {
        headlineId,
        url,
        title: cleanTextFromHTML(title),
        content: validation.cleanedContent || cleanedDescription,
        publishedAt: fallbackPubDate || new Date().toISOString(),
        source: fallbackSource || extractSourceFromUrl(url),
        wordCount: validation.wordCount,
        readingTime: Math.ceil(validation.wordCount / 200),
        extractedAt: new Date().toISOString(),
        success: validation.isValid,
        error: validation.isValid ? undefined : validation.issues.join('; '),
        contentQuality: validation.quality,
        qualityScore: validation.score,
        validationIssues: validation.issues,
      };
    }
    
    return {
      headlineId,
      url,
      title,
      content: '',
      publishedAt: fallbackPubDate || new Date().toISOString(),
      source: fallbackSource || extractSourceFromUrl(url),
      wordCount: 0,
      readingTime: 0,
      extractedAt: new Date().toISOString(),
      success: false,
      error: errorMsg,
      contentQuality: 'unusable',
      qualityScore: 0,
      validationIssues: [errorMsg],
    };
  }
}

// Main handler
export const handler = async (event: HandlerEvent) => {
  console.log('[read-stories] Request received');
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { headlines, collate = true, similarityThreshold = 0.2 } = body as { 
      headlines: Headline[]; 
      collate?: boolean;
      similarityThreshold?: number;
    };

    console.log(`[read-stories] Processing ${headlines?.length || 0} headlines, collate: ${collate}`);

    if (!headlines || headlines.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Headlines are required' }),
      };
    }

    // Process in parallel with concurrency limit
    const concurrencyLimit = 3;
    const results: StoryContent[] = [];

    for (let i = 0; i < headlines.length; i += concurrencyLimit) {
      const batch = headlines.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.all(
        batch.map(h => {
          // Extract source name whether it's a string or object
          const sourceName = typeof h.source === 'string' 
            ? h.source 
            : h.source?.name;
          // Use publishedAt or pubDate
          const pubDate = h.publishedAt || h.pubDate;
          
          return extractArticleContent(
            h.url, 
            h.title, 
            h.id,
            h.description,
            sourceName,
            pubDate
          );
        })
      );
      results.push(...batchResults);
    }

    const successfulStories = results.filter(r => r.success);
    const successCount = successfulStories.length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`[read-stories] Completed: ${successCount} success, ${failedCount} failed`);

    // Collate similar stories if enabled
    let collatedGroups: CollatedStoryGroup[] = [];
    if (collate && successfulStories.length > 0) {
      collatedGroups = collateStories(successfulStories, similarityThreshold);
      console.log(`[read-stories] Collated into ${collatedGroups.length} groups`);
      collatedGroups.forEach((group, i) => {
        console.log(`[read-stories] Group ${i + 1}: "${group.topic}" - ${group.stories.length} stories, keywords: ${group.keywords.join(', ')}`);
      });
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stories: results,
        successCount,
        failedCount,
        // Include collated groups for unified article generation
        collatedGroups,
        collationEnabled: collate,
      }),
    };
  } catch (error) {
    console.error('[read-stories] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to read stories',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
