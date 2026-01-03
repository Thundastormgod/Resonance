// Netlify Function: Fact Check Article
// Uses OpenRouter AI to verify claims in an article

interface HandlerEvent {
  httpMethod: string;
  body: string | null;
}

interface GeneratedSample {
  id: string;
  title: string;
  body: string;
}

interface StoryContent {
  content: string;
  source: string;
}

interface FactCheckClaim {
  id: string;
  claim: string;
  location: string;
  status: 'verified' | 'unverified' | 'disputed' | 'false';
  confidence: number;
  explanation: string;
  sources: string[];
  suggestedCorrection?: string;
}

interface FactCheckResult {
  articleId: string;
  overallScore: number;
  claims: FactCheckClaim[];
  totalClaimsChecked: number;
  verifiedCount: number;
  disputedCount: number;
  falseCount: number;
  unverifiedCount: number;
  recommendations: string[];
  model: string;
  checkedAt: string;
  tokensUsed: number;
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const FACT_CHECK_MODEL = 'openai/gpt-4o';

async function callOpenRouter(
  messages: { role: string; content: string }[],
  apiKey: string
) {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://resonance.news',
      'X-Title': 'Resonance News',
    },
    body: JSON.stringify({
      model: FACT_CHECK_MODEL,
      messages,
      max_tokens: 4000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  return response.json();
}

function parseFactCheckResponse(content: string, articleId: string): FactCheckResult {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      
      const claims: FactCheckClaim[] = (data.claims || []).map((claim: any, index: number) => ({
        id: `claim-${index}-${Date.now()}`,
        claim: claim.claim || '',
        location: claim.location || '',
        status: ['verified', 'unverified', 'disputed', 'false'].includes(claim.status) 
          ? claim.status 
          : 'unverified',
        confidence: Math.min(100, Math.max(0, claim.confidence || 50)),
        explanation: claim.explanation || '',
        sources: claim.sources || [],
        suggestedCorrection: claim.suggestedCorrection,
      }));

      return {
        articleId,
        overallScore: Math.min(100, Math.max(0, data.overallScore || 50)),
        claims,
        totalClaimsChecked: claims.length,
        verifiedCount: claims.filter(c => c.status === 'verified').length,
        disputedCount: claims.filter(c => c.status === 'disputed').length,
        falseCount: claims.filter(c => c.status === 'false').length,
        unverifiedCount: claims.filter(c => c.status === 'unverified').length,
        recommendations: data.recommendations || [],
        model: FACT_CHECK_MODEL,
        checkedAt: new Date().toISOString(),
        tokensUsed: 0,
      };
    }
  } catch (e) {
    console.error('Failed to parse fact-check response:', e);
  }

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
    model: FACT_CHECK_MODEL,
    checkedAt: new Date().toISOString(),
    tokensUsed: 0,
  };
}

export const handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'OpenRouter API key not configured' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { article, sourceStories } = body as { 
      article: GeneratedSample; 
      sourceStories: StoryContent[];
    };

    if (!article) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Article is required' }),
      };
    }

    const sourceContext = sourceStories?.map(story =>
      `Source: ${story.source}\nContent: ${story.content}`
    ).join('\n\n---\n\n') || '';

    const messages = [
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

    const response = await callOpenRouter(messages, apiKey);
    const content = response.choices[0]?.message?.content || '';
    const result = parseFactCheckResponse(content, article.id);
    result.tokensUsed = response.usage?.total_tokens || 0;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Fact-check error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fact-check article',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
