// Netlify Function: Bias Analysis
// Uses OpenRouter AI to detect bias in articles

interface HandlerEvent {
  httpMethod: string;
  body: string | null;
}

interface GeneratedSample {
  id: string;
  title: string;
  body: string;
}

type BiasType = 'political' | 'emotional' | 'corporate' | 'sensational' | 'framing' | 'selection' | 'omission';
type BiasLevel = 'none' | 'low' | 'moderate' | 'high' | 'severe';

interface BiasInstance {
  id: string;
  type: BiasType;
  level: BiasLevel;
  text: string;
  location: string;
  explanation: string;
  suggestedRevision?: string;
}

interface BiasAnalysisResult {
  articleId: string;
  overallBiasLevel: BiasLevel;
  overallScore: number;
  instances: BiasInstance[];
  politicalLeaning?: 'left' | 'center-left' | 'center' | 'center-right' | 'right';
  tonalAnalysis: {
    objectivity: number;
    emotionality: number;
    sensationalism: number;
  };
  recommendations: string[];
  model: string;
  analyzedAt: string;
  tokensUsed: number;
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const BIAS_CHECK_MODEL = 'anthropic/claude-3-haiku';

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
      model: BIAS_CHECK_MODEL,
      messages,
      max_tokens: 3000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  return response.json();
}

function parseBiasResponse(content: string, articleId: string): BiasAnalysisResult {
  const validBiasTypes: BiasType[] = ['political', 'emotional', 'corporate', 'sensational', 'framing', 'selection', 'omission'];
  const validBiasLevels: BiasLevel[] = ['none', 'low', 'moderate', 'high', 'severe'];

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);

      const instances: BiasInstance[] = (data.instances || []).map((instance: any, index: number) => ({
        id: `bias-${index}-${Date.now()}`,
        type: validBiasTypes.includes(instance.type) ? instance.type : 'framing',
        level: validBiasLevels.includes(instance.level) ? instance.level : 'low',
        text: instance.text || '',
        location: instance.location || '',
        explanation: instance.explanation || '',
        suggestedRevision: instance.suggestedRevision,
      }));

      return {
        articleId,
        overallBiasLevel: validBiasLevels.includes(data.overallBiasLevel) 
          ? data.overallBiasLevel 
          : 'low',
        overallScore: Math.min(100, Math.max(0, data.overallScore || 75)),
        instances,
        politicalLeaning: data.politicalLeaning,
        tonalAnalysis: {
          objectivity: data.tonalAnalysis?.objectivity || 50,
          emotionality: data.tonalAnalysis?.emotionality || 50,
          sensationalism: data.tonalAnalysis?.sensationalism || 50,
        },
        recommendations: data.recommendations || [],
        model: BIAS_CHECK_MODEL,
        analyzedAt: new Date().toISOString(),
        tokensUsed: 0,
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
    model: BIAS_CHECK_MODEL,
    analyzedAt: new Date().toISOString(),
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
    const { article } = body as { article: GeneratedSample };

    if (!article) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Article is required' }),
      };
    }

    const messages = [
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

    const response = await callOpenRouter(messages, apiKey);
    const content = response.choices[0]?.message?.content || '';
    const result = parseBiasResponse(content, article.id);
    result.tokensUsed = response.usage?.total_tokens || 0;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Bias analysis error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to analyze bias',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
