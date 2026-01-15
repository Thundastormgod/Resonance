// Netlify Function: AI Article Regeneration
// Regenerate entire articles or specific paragraphs with user feedback

interface HandlerEvent {
  httpMethod: string;
  body: string | null;
}

interface RegenerationRequest {
  article: {
    id: string;
    title: string;
    excerpt: string;
    body: string;
    style: string;
    tone: string;
    sourceHeadlines: string[];
    sourceUrls: string[];
  };
  feedback: string;
  paragraphIndex?: number;         // If specified, only regenerate this paragraph
  newStyle?: string;               // Optional style override
  newTone?: string;                // Optional tone override
  targetWordCount?: number;        // Optional word count override
}

interface RegenerationResponse {
  success: boolean;
  regeneratedContent: {
    title: string;
    excerpt: string;
    body: string;
    wordCount: number;
    readingTime: number;
    changesDescription: string;
  };
  tokensUsed: number;
  model: string;
  error?: string;
}

// OpenRouter configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const REGENERATION_MODEL = 'anthropic/claude-3.5-haiku';

// Call OpenRouter API
async function callOpenRouter(messages: Array<{ role: string; content: string }>, apiKey: string) {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://resonance.news',
      'X-Title': 'Resonance News Generator',
    },
    body: JSON.stringify({
      model: REGENERATION_MODEL,
      messages,
      max_tokens: 4000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Build paragraph regeneration prompt
function buildParagraphRegenerationPrompt(
  article: RegenerationRequest['article'],
  paragraphIndex: number,
  feedback: string
): string {
  const paragraphs = article.body.split('\n').filter(p => p.trim());
  const targetParagraph = paragraphs[paragraphIndex] || '';
  
  // Build context with paragraph markers
  const contextWithMarkers = paragraphs.map((p, i) => {
    if (i === paragraphIndex) {
      return `[PARAGRAPH ${i + 1} - TO BE REGENERATED]:\n${p}`;
    }
    return `[PARAGRAPH ${i + 1}]:\n${p}`;
  }).join('\n\n');
  
  return `You are editing a news article. Regenerate ONLY paragraph ${paragraphIndex + 1} based on the user's feedback.

ARTICLE CONTEXT:
Title: ${article.title}
Style: ${article.style}
Tone: ${article.tone}

FULL ARTICLE BODY:
${contextWithMarkers}

USER FEEDBACK FOR PARAGRAPH ${paragraphIndex + 1}:
"${feedback}"

ORIGINAL PARAGRAPH TO REGENERATE:
"${targetParagraph}"

REQUIREMENTS:
1. Regenerate ONLY paragraph ${paragraphIndex + 1}
2. Apply the user's feedback while maintaining:
   - Consistent style and tone with the rest of the article
   - Factual accuracy
   - Proper flow with surrounding paragraphs
3. Keep approximately the same length unless the feedback specifically asks for changes
4. Return ONLY the new paragraph text, nothing else

NEW PARAGRAPH ${paragraphIndex + 1}:`;
}

// Build full article regeneration prompt
function buildFullRegenerationPrompt(
  article: RegenerationRequest['article'],
  feedback: string,
  newStyle?: string,
  newTone?: string,
  targetWordCount?: number
): string {
  const style = newStyle || article.style;
  const tone = newTone || article.tone;
  const wordCount = targetWordCount || article.body.split(/\s+/).filter(w => w.length > 0).length;
  
  return `You are regenerating a news article based on user feedback.

ORIGINAL ARTICLE:
Title: ${article.title}
Excerpt: ${article.excerpt}
Style: ${article.style}
Tone: ${article.tone}

BODY:
${article.body}

SOURCES USED:
${article.sourceHeadlines.map((h, i) => `- ${h}`).join('\n')}

USER FEEDBACK:
"${feedback}"

${newStyle ? `NEW STYLE: ${newStyle}` : ''}
${newTone ? `NEW TONE: ${newTone}` : ''}
${targetWordCount ? `TARGET WORD COUNT: ${targetWordCount} words` : ''}

REQUIREMENTS:
1. Apply the user's feedback to improve the article
2. Style: ${style}
3. Tone: ${tone}
4. Target word count: approximately ${wordCount} words
5. Maintain factual accuracy and source attribution
6. Preserve key information from the original unless specifically requested to change
7. Provide a brief description of what was changed

OUTPUT FORMAT (use these exact headers):
HEADLINE:
[Your headline here]

EXCERPT:
[2-3 sentence summary]

BODY:
[Full regenerated article]

CHANGES:
[Brief description of what was changed]`;
}

// Parse regeneration response
function parseRegenerationResponse(content: string, isParagraphOnly: boolean): {
  title?: string;
  excerpt?: string;
  body: string;
  changesDescription: string;
} {
  if (isParagraphOnly) {
    // For paragraph regeneration, the response is just the new paragraph
    return {
      body: content.trim(),
      changesDescription: 'Paragraph regenerated based on feedback',
    };
  }
  
  // For full regeneration, parse the structured response
  const headlineMatch = content.match(/HEADLINE:\s*\n([^\n]+)/i);
  const excerptMatch = content.match(/EXCERPT:\s*\n([\s\S]*?)(?=\n\s*BODY:)/i);
  const bodyMatch = content.match(/BODY:\s*\n([\s\S]*?)(?=\n\s*CHANGES:|$)/i);
  const changesMatch = content.match(/CHANGES:\s*\n([\s\S]*?)$/i);
  
  return {
    title: headlineMatch?.[1]?.trim(),
    excerpt: excerptMatch?.[1]?.trim(),
    body: bodyMatch?.[1]?.trim() || content,
    changesDescription: changesMatch?.[1]?.trim() || 'Article regenerated based on feedback',
  };
}

// Main handler
export const handler = async (event: HandlerEvent) => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const request: RegenerationRequest = JSON.parse(event.body || '{}');
    
    if (!request.article || !request.feedback) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: article and feedback' }),
      };
    }

    console.log('[regenerate] Request received:', {
      articleId: request.article.id,
      feedbackLength: request.feedback.length,
      paragraphIndex: request.paragraphIndex,
      newStyle: request.newStyle,
      newTone: request.newTone,
    });

    const isParagraphOnly = request.paragraphIndex !== undefined;
    
    // Build appropriate prompt
    const userPrompt = isParagraphOnly
      ? buildParagraphRegenerationPrompt(request.article, request.paragraphIndex!, request.feedback)
      : buildFullRegenerationPrompt(
          request.article,
          request.feedback,
          request.newStyle,
          request.newTone,
          request.targetWordCount
        );

    const messages = [
      {
        role: 'system',
        content: `You are a professional news editor helping to improve articles. 
You maintain journalistic standards, factual accuracy, and proper attribution.
When regenerating content, you apply user feedback thoughtfully while preserving the article's integrity.
${isParagraphOnly ? 'Return ONLY the new paragraph text, no explanations or headers.' : ''}`,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    console.log('[regenerate] Calling OpenRouter...');
    const response = await callOpenRouter(messages, apiKey);
    const content = response.choices[0]?.message?.content || '';
    console.log('[regenerate] Response length:', content.length);

    // Parse the response
    const parsed = parseRegenerationResponse(content, isParagraphOnly);
    
    // If paragraph only, reconstruct the full body
    let finalBody = parsed.body;
    let finalTitle = request.article.title;
    let finalExcerpt = request.article.excerpt;
    
    if (isParagraphOnly) {
      const paragraphs = request.article.body.split('\n').filter(p => p.trim());
      paragraphs[request.paragraphIndex!] = parsed.body;
      finalBody = paragraphs.join('\n\n');
    } else {
      finalTitle = parsed.title || request.article.title;
      finalExcerpt = parsed.excerpt || request.article.excerpt;
      finalBody = parsed.body;
    }
    
    // Calculate word count
    const wordCount = finalBody.split(/\s+/).filter(w => w.length > 0).length;
    const readingTime = Math.ceil(wordCount / 200);

    const result: RegenerationResponse = {
      success: true,
      regeneratedContent: {
        title: finalTitle,
        excerpt: finalExcerpt,
        body: finalBody,
        wordCount,
        readingTime,
        changesDescription: parsed.changesDescription,
      },
      tokensUsed: response.usage?.total_tokens || 0,
      model: REGENERATION_MODEL,
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Regeneration error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to regenerate article',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
