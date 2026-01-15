// Netlify Function: Enhanced Bias Analysis
// Uses OpenRouter AI to detect and analyze various forms of bias with actionable feedback

interface HandlerEvent {
  httpMethod: string;
  body: string | null;
}

interface GeneratedSample {
  id: string;
  title: string;
  body: string;
}

// Bias types with detailed categorization
type BiasType = 
  | 'political-left'
  | 'political-right'
  | 'emotional-appeal'
  | 'sensationalism'
  | 'corporate-interest'
  | 'framing-bias'
  | 'selection-bias'
  | 'omission-bias'
  | 'confirmation-bias'
  | 'anchoring-bias'
  | 'loaded-language'
  | 'false-balance';

type BiasLevel = 'none' | 'minimal' | 'low' | 'moderate' | 'high' | 'severe';

// Individual bias instance with specific details
interface BiasInstance {
  id: string;
  type: BiasType;
  level: BiasLevel;
  text: string;
  location: string;
  explanation: string;
  suggestedRevision: string;
  impactOnObjectivity: number; // 0-100, how much this affects objectivity
  difficulty: 'easy' | 'moderate' | 'complex';
}

// Detailed tonal analysis
interface TonalAnalysis {
  objectivity: number;        // 0-100, higher = more objective
  emotionality: number;       // 0-100, lower = less emotional
  sensationalism: number;     // 0-100, lower = less sensational
  balanceScore: number;       // 0-100, higher = more balanced
  professionalTone: number;   // 0-100, higher = more professional
}

// Source balance analysis
interface SourceBalance {
  totalSourcesMentioned: number;
  perspectivesRepresented: number;
  missingPerspectives: string[];
  sourceCredibilityScore: number;
}

// Comprehensive bias analysis result
interface BiasAnalysisResult {
  articleId: string;
  overallBiasLevel: BiasLevel;
  overallScore: number; // 0-100, where 100 = no bias detected
  
  // Detailed instances
  instances: BiasInstance[];
  totalIssuesFound: number;
  
  // Breakdown by type
  biasTypeBreakdown: {
    type: BiasType;
    count: number;
    severity: BiasLevel;
    examples: string[];
  }[];
  
  // Political leaning analysis
  politicalAnalysis: {
    leaning: 'far-left' | 'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'far-right';
    confidence: number;
    indicators: string[];
  };
  
  // Tonal analysis
  tonalAnalysis: TonalAnalysis;
  
  // Source balance
  sourceBalance: SourceBalance;
  
  // Critical issues that must be fixed
  criticalIssues: {
    issue: string;
    text: string;
    requiredAction: string;
    impactOnScore: number;
  }[];
  
  // Actionable recommendations
  recommendations: {
    priority: 'critical' | 'high' | 'medium' | 'low';
    action: string;
    expectedScoreIncrease: number;
    affectedText: string[];
    suggestedRewrites: string[];
  }[];
  
  // Path to 88% objectivity
  pathTo88: {
    currentScore: number;
    targetScore: number;
    gap: number;
    requiredActions: {
      action: string;
      scoreImpact: number;
      difficulty: 'easy' | 'moderate' | 'complex';
      specificEdits: string[];
    }[];
    achievable: boolean;
    estimatedEffort: string;
  };
  
  // Score breakdown
  scoreBreakdown: {
    languageNeutrality: number;
    perspectiveBalance: number;
    factualPresentation: number;
    emotionalRestraint: number;
    sourceCredibility: number;
  };
  
  model: string;
  analyzedAt: string;
  tokensUsed: number;
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const BIAS_CHECK_MODEL = 'anthropic/claude-3.5-haiku';

async function callOpenRouter(
  messages: { role: string; content: string }[],
  apiKey: string,
  maxTokens: number = 5000
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
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  return response.json();
}

function calculatePathTo88(
  currentScore: number,
  instances: BiasInstance[],
  criticalIssues: { issue: string; text: string; requiredAction: string; impactOnScore: number }[]
): BiasAnalysisResult['pathTo88'] {
  const targetScore = 88;
  const gap = targetScore - currentScore;
  const requiredActions: BiasAnalysisResult['pathTo88']['requiredActions'] = [];
  
  if (gap <= 0) {
    return {
      currentScore,
      targetScore,
      gap: 0,
      requiredActions: [],
      achievable: true,
      estimatedEffort: 'Already meeting target!'
    };
  }

  // Group instances by severity
  const severeInstances = instances.filter(i => i.level === 'severe' || i.level === 'high');
  const moderateInstances = instances.filter(i => i.level === 'moderate');
  const minorInstances = instances.filter(i => i.level === 'low' || i.level === 'minimal');
  
  // Priority 1: Fix severe/high bias instances
  if (severeInstances.length > 0) {
    const impact = Math.min(25, severeInstances.length * 8);
    requiredActions.push({
      action: `Rewrite ${severeInstances.length} severely biased passage(s)`,
      scoreImpact: impact,
      difficulty: 'complex',
      specificEdits: severeInstances.slice(0, 3).map(i => i.suggestedRevision)
    });
  }
  
  // Priority 2: Fix moderate bias
  if (moderateInstances.length > 0) {
    const impact = Math.min(15, moderateInstances.length * 4);
    requiredActions.push({
      action: `Adjust ${moderateInstances.length} moderately biased phrase(s)`,
      scoreImpact: impact,
      difficulty: 'moderate',
      specificEdits: moderateInstances.slice(0, 3).map(i => i.suggestedRevision)
    });
  }
  
  // Priority 3: Fix loaded language
  const loadedLanguage = instances.filter(i => i.type === 'loaded-language');
  if (loadedLanguage.length > 0) {
    const impact = Math.min(10, loadedLanguage.length * 2);
    requiredActions.push({
      action: `Replace ${loadedLanguage.length} instance(s) of loaded language with neutral terms`,
      scoreImpact: impact,
      difficulty: 'easy',
      specificEdits: loadedLanguage.slice(0, 3).map(i => i.suggestedRevision)
    });
  }
  
  // Priority 4: Address critical issues
  criticalIssues.slice(0, 2).forEach(issue => {
    requiredActions.push({
      action: issue.requiredAction,
      scoreImpact: issue.impactOnScore,
      difficulty: 'complex',
      specificEdits: [issue.text]
    });
  });
  
  const totalPossibleIncrease = requiredActions.reduce((sum, a) => sum + a.scoreImpact, 0);
  const achievable = currentScore + totalPossibleIncrease >= targetScore;
  
  let estimatedEffort = 'Unknown';
  if (gap <= 5) estimatedEffort = '5-10 minutes of minor edits';
  else if (gap <= 12) estimatedEffort = '15-20 minutes of focused editing';
  else if (gap <= 20) estimatedEffort = '30-45 minutes of careful revision';
  else estimatedEffort = 'Substantial rewriting recommended';
  
  return {
    currentScore,
    targetScore,
    gap,
    requiredActions: requiredActions.slice(0, 5),
    achievable,
    estimatedEffort
  };
}

function parseBiasResponse(content: string, articleId: string): BiasAnalysisResult {
  const validBiasTypes: BiasType[] = [
    'political-left', 'political-right', 'emotional-appeal', 'sensationalism',
    'corporate-interest', 'framing-bias', 'selection-bias', 'omission-bias',
    'confirmation-bias', 'anchoring-bias', 'loaded-language', 'false-balance'
  ];
  const validBiasLevels: BiasLevel[] = ['none', 'minimal', 'low', 'moderate', 'high', 'severe'];

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);

      const instances: BiasInstance[] = (data.instances || []).map((instance: any, index: number) => ({
        id: `bias-${index}-${Date.now()}`,
        type: validBiasTypes.includes(instance.type) ? instance.type : 'framing-bias',
        level: validBiasLevels.includes(instance.level) ? instance.level : 'low',
        text: String(instance.text || ''),
        location: String(instance.location || ''),
        explanation: String(instance.explanation || ''),
        suggestedRevision: String(instance.suggestedRevision || ''),
        impactOnObjectivity: Number(instance.impactOnObjectivity) || 5,
        difficulty: ['easy', 'moderate', 'complex'].includes(instance.difficulty) 
          ? instance.difficulty : 'moderate',
      }));

      const overallScore = Math.min(100, Math.max(0, Number(data.overallScore) || 75));
      
      let overallBiasLevel: BiasLevel;
      if (overallScore >= 95) overallBiasLevel = 'none';
      else if (overallScore >= 88) overallBiasLevel = 'minimal';
      else if (overallScore >= 75) overallBiasLevel = 'low';
      else if (overallScore >= 60) overallBiasLevel = 'moderate';
      else if (overallScore >= 40) overallBiasLevel = 'high';
      else overallBiasLevel = 'severe';

      const biasTypeBreakdown = Array.isArray(data.biasTypeBreakdown)
        ? data.biasTypeBreakdown.map((bt: any) => ({
            type: validBiasTypes.includes(bt.type) ? bt.type : 'framing-bias',
            count: Number(bt.count) || 0,
            severity: validBiasLevels.includes(bt.severity) ? bt.severity : 'low',
            examples: Array.isArray(bt.examples) ? bt.examples : [],
          }))
        : [];

      const politicalLeanings = ['far-left', 'left', 'center-left', 'center', 'center-right', 'right', 'far-right'];
      const politicalAnalysis = {
        leaning: politicalLeanings.includes(data.politicalAnalysis?.leaning) 
          ? data.politicalAnalysis.leaning 
          : 'center',
        confidence: Number(data.politicalAnalysis?.confidence) || 50,
        indicators: Array.isArray(data.politicalAnalysis?.indicators) 
          ? data.politicalAnalysis.indicators 
          : [],
      };

      const tonalAnalysis = {
        objectivity: Number(data.tonalAnalysis?.objectivity) || overallScore,
        emotionality: Number(data.tonalAnalysis?.emotionality) || 30,
        sensationalism: Number(data.tonalAnalysis?.sensationalism) || 20,
        balanceScore: Number(data.tonalAnalysis?.balanceScore) || overallScore,
        professionalTone: Number(data.tonalAnalysis?.professionalTone) || overallScore,
      };

      const sourceBalance = {
        totalSourcesMentioned: Number(data.sourceBalance?.totalSourcesMentioned) || 0,
        perspectivesRepresented: Number(data.sourceBalance?.perspectivesRepresented) || 1,
        missingPerspectives: Array.isArray(data.sourceBalance?.missingPerspectives) 
          ? data.sourceBalance.missingPerspectives 
          : [],
        sourceCredibilityScore: Number(data.sourceBalance?.sourceCredibilityScore) || 50,
      };

      const criticalIssues = Array.isArray(data.criticalIssues)
        ? data.criticalIssues.map((issue: any) => ({
            issue: String(issue.issue || ''),
            text: String(issue.text || ''),
            requiredAction: String(issue.requiredAction || ''),
            impactOnScore: Number(issue.impactOnScore) || 5,
          }))
        : [];

      const recommendations = Array.isArray(data.recommendations)
        ? data.recommendations.map((rec: any) => ({
            priority: ['critical', 'high', 'medium', 'low'].includes(rec.priority) 
              ? rec.priority : 'medium',
            action: String(rec.action || ''),
            expectedScoreIncrease: Number(rec.expectedScoreIncrease) || 3,
            affectedText: Array.isArray(rec.affectedText) ? rec.affectedText : [],
            suggestedRewrites: Array.isArray(rec.suggestedRewrites) ? rec.suggestedRewrites : [],
          }))
        : [];

      const scoreBreakdown = {
        languageNeutrality: Number(data.scoreBreakdown?.languageNeutrality) || overallScore,
        perspectiveBalance: Number(data.scoreBreakdown?.perspectiveBalance) || overallScore,
        factualPresentation: Number(data.scoreBreakdown?.factualPresentation) || overallScore,
        emotionalRestraint: Number(data.scoreBreakdown?.emotionalRestraint) || overallScore,
        sourceCredibility: Number(data.scoreBreakdown?.sourceCredibility) || overallScore,
      };

      const pathTo88 = calculatePathTo88(overallScore, instances, criticalIssues);

      return {
        articleId,
        overallBiasLevel,
        overallScore,
        instances,
        totalIssuesFound: instances.length,
        biasTypeBreakdown,
        politicalAnalysis,
        tonalAnalysis,
        sourceBalance,
        criticalIssues,
        recommendations,
        pathTo88,
        scoreBreakdown,
        model: BIAS_CHECK_MODEL,
        analyzedAt: new Date().toISOString(),
        tokensUsed: 0,
      };
    }
  } catch (e) {
    console.error('Failed to parse bias response:', e);
    console.error('Content was:', content.substring(0, 500));
  }

  // Default result on parse failure
  return {
    articleId,
    overallBiasLevel: 'low',
    overallScore: 75,
    instances: [],
    totalIssuesFound: 0,
    biasTypeBreakdown: [],
    politicalAnalysis: {
      leaning: 'center',
      confidence: 50,
      indicators: [],
    },
    tonalAnalysis: {
      objectivity: 75,
      emotionality: 25,
      sensationalism: 20,
      balanceScore: 75,
      professionalTone: 75,
    },
    sourceBalance: {
      totalSourcesMentioned: 0,
      perspectivesRepresented: 1,
      missingPerspectives: [],
      sourceCredibilityScore: 50,
    },
    criticalIssues: [{
      issue: 'Analysis Error',
      text: 'Unable to parse bias analysis',
      requiredAction: 'Re-run bias analysis',
      impactOnScore: 10
    }],
    recommendations: [{
      priority: 'high',
      action: 'Re-run bias analysis or perform manual review',
      expectedScoreIncrease: 0,
      affectedText: [],
      suggestedRewrites: [],
    }],
    pathTo88: {
      currentScore: 75,
      targetScore: 88,
      gap: 13,
      requiredActions: [{
        action: 'Re-run automated bias analysis',
        scoreImpact: 0,
        difficulty: 'easy',
        specificEdits: []
      }],
      achievable: false,
      estimatedEffort: 'Unable to estimate - analysis failed'
    },
    scoreBreakdown: {
      languageNeutrality: 75,
      perspectiveBalance: 75,
      factualPresentation: 75,
      emotionalRestraint: 75,
      sourceCredibility: 75,
    },
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
        content: `You are a media bias analyst. Analyze articles for various forms of bias and provide specific, actionable feedback to improve objectivity.

## BIAS TYPES TO DETECT
- political-left/political-right: Partisan language or framing
- emotional-appeal: Language designed to evoke emotions
- sensationalism: Exaggeration or dramatic language
- corporate-interest: Favorable coverage due to business interests
- framing-bias: How presentation affects perception
- selection-bias: Cherry-picked information
- omission-bias: Important context left out
- loaded-language: Words with strong connotations
- false-balance: Giving equal weight to unequal positions

## SEVERITY LEVELS
- none: No bias detected
- minimal: Very slight, easily overlooked
- low: Minor issues, professional standard
- moderate: Noticeable bias, affects perception
- high: Significant bias, needs revision
- severe: Major bias, compromises credibility

Be constructive - provide specific rewrites for every issue found.

IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks.`,
      },
      {
        role: 'user',
        content: `ARTICLE TO ANALYZE:
Title: ${article.title}

${article.body}

Return this exact JSON structure (no markdown):
{
  "overallScore": 78,
  "instances": [
    {
      "type": "loaded-language",
      "level": "moderate",
      "text": "exact biased text from article",
      "location": "paragraph 2",
      "explanation": "why this is biased",
      "suggestedRevision": "neutral alternative text",
      "impactOnObjectivity": 8,
      "difficulty": "easy"
    }
  ],
  "biasTypeBreakdown": [
    {"type": "loaded-language", "count": 2, "severity": "moderate", "examples": ["example1"]}
  ],
  "politicalAnalysis": {
    "leaning": "center",
    "confidence": 70,
    "indicators": ["specific indicators found"]
  },
  "tonalAnalysis": {
    "objectivity": 75,
    "emotionality": 30,
    "sensationalism": 20,
    "balanceScore": 80,
    "professionalTone": 85
  },
  "sourceBalance": {
    "totalSourcesMentioned": 3,
    "perspectivesRepresented": 2,
    "missingPerspectives": ["opposing viewpoint"],
    "sourceCredibilityScore": 75
  },
  "criticalIssues": [
    {"issue": "issue type", "text": "problematic text", "requiredAction": "specific fix", "impactOnScore": 10}
  ],
  "recommendations": [
    {
      "priority": "high",
      "action": "specific action to take",
      "expectedScoreIncrease": 8,
      "affectedText": ["text that needs change"],
      "suggestedRewrites": ["improved version"]
    }
  ],
  "scoreBreakdown": {
    "languageNeutrality": 78,
    "perspectiveBalance": 75,
    "factualPresentation": 82,
    "emotionalRestraint": 80,
    "sourceCredibility": 70
  }
}`,
      },
    ];

    console.log('[bias-check] Calling OpenRouter...');
    const response = await callOpenRouter(messages, apiKey);
    const content = response.choices[0]?.message?.content || '';
    console.log('[bias-check] Response length:', content.length);
    
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
