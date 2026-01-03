// Netlify Function: Read Story Content
// Extracts full article content from URLs

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
  
  // For Google News URLs, always use fallback description
  // Google News URLs are redirect pages, not actual articles
  if (url.includes('news.google.com')) {
    console.log(`[read-stories] Google News URL detected, using fallback description`);
    
    // Use cleaned description if it has meaningful content
    const contentToUse = cleanedDescription.length >= 30 ? cleanedDescription : title;
    const wordCount = contentToUse.split(/\s+/).filter(w => w.length > 0).length;
    
    return {
      headlineId,
      url,
      title: cleanTextFromHTML(title),
      content: contentToUse,
      publishedAt: fallbackPubDate || new Date().toISOString(),
      source: fallbackSource || 'Google News',
      wordCount,
      readingTime: Math.ceil(wordCount / 200),
      extractedAt: new Date().toISOString(),
      success: true,
      error: undefined,
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

    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const success = content.length >= 50; // Lower threshold when using description

    console.log(`[read-stories] Extracted ${wordCount} words, success: ${success}`);

    return {
      headlineId,
      url,
      title: cleanTextFromHTML(title),
      content,
      author,
      publishedAt: publishedAt || new Date().toISOString(),
      source,
      wordCount,
      readingTime: Math.ceil(wordCount / 200),
      extractedAt: new Date().toISOString(),
      success,
      error: !success ? 'Content too short' : undefined,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.log(`[read-stories] Error fetching ${url}: ${errorMsg}`);
    
    // Use cleaned fallback description if available
    if (cleanedDescription.length >= 30) {
      console.log(`[read-stories] Using cleaned fallback description after error for ${url}`);
      const wordCount = cleanedDescription.split(/\s+/).filter(w => w.length > 0).length;
      return {
        headlineId,
        url,
        title: cleanTextFromHTML(title),
        content: cleanedDescription,
        publishedAt: fallbackPubDate || new Date().toISOString(),
        source: fallbackSource || extractSourceFromUrl(url),
        wordCount,
        readingTime: Math.ceil(wordCount / 200),
        extractedAt: new Date().toISOString(),
        success: true,
        error: undefined,
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
