// Netlify Function: Combined Fact-Check + Bias Analysis
// Single LLM call to reduce latency and API costs

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

// ============ FACT CHECK TYPES ============

type VerificationSourceType = 
  | 'primary-source'
  | 'news-wire'
  | 'academic'
  | 'fact-checker'
  | 'official-records'
  | 'expert-source'
  | 'provided-source';

interface VerificationSource {
  type: VerificationSourceType;
  name: string;
  url?: string;
  reliability: number;
  quote?: string;
}

interface ClaimVerification {
  claimId: string;
  claim: string;
  originalText: string;
  location: string;
  status: 'verified' | 'partially-verified' | 'unverified' | 'disputed' | 'false' | 'needs-context';
  confidence: number;
  explanation: string;
  verificationSources: VerificationSource[];
  crossReferenceCount: number;
  suggestedCorrection?: string;
  contextNeeded?: string;
  severity: 'critical' | 'major' | 'minor' | 'informational';
  improvementAction?: string;
}

interface FactCheckResult {
  articleId: string;
  overallScore: number;
  overallStatus: 'excellent' | 'good' | 'needs-work' | 'poor' | 'unreliable';
  claims: ClaimVerification[];
  totalClaimsChecked: number;
  verifiedCount: number;
  partiallyVerifiedCount: number;
  unverifiedCount: number;
  disputedCount: number;
  falseCount: number;
  needsContextCount: number;
  categoryBreakdown: {
    category: string;
    total: number;
    verified: number;
    score: number;
  }[];
  criticalIssues: {
    claim: string;
    issue: string;
    requiredAction: string;
    impactOnScore: number;
  }[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    expectedScoreIncrease: number;
    affectedClaims: string[];
  }[];
  scoreBreakdown: {
    verificationAccuracy: number;
    sourceDiversity: number;
    claimCoverage: number;
    criticalClaimsScore: number;
  };
  pathTo88: {
    currentScore: number;
    targetScore: number;
    gap: number;
    requiredActions: {
      action: string;
      scoreImpact: number;
      difficulty: 'easy' | 'moderate' | 'complex';
    }[];
    achievable: boolean;
    estimatedEffort: string;
  };
  model: string;
  checkedAt: string;
  tokensUsed: number;
}

// ============ BIAS CHECK TYPES ============

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

interface BiasInstance {
  id: string;
  type: BiasType;
  level: BiasLevel;
  text: string;
  location: string;
  explanation: string;
  suggestedRevision: string;
  impactOnObjectivity: number;
  difficulty: 'easy' | 'moderate' | 'complex';
}

interface BiasAnalysisResult {
  articleId: string;
  overallBiasLevel: BiasLevel;
  overallScore: number;
  instances: BiasInstance[];
  totalIssuesFound: number;
  biasTypeBreakdown: {
    type: BiasType;
    count: number;
    severity: BiasLevel;
    examples: string[];
  }[];
  politicalAnalysis: {
    leaning: 'far-left' | 'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'far-right';
    confidence: number;
    indicators: string[];
  };
  tonalAnalysis: {
    objectivity: number;
    emotionality: number;
    sensationalism: number;
    balanceScore: number;
    professionalTone: number;
  };
  sourceBalance: {
    totalSourcesMentioned: number;
    perspectivesRepresented: number;
    missingPerspectives: string[];
    sourceCredibilityScore: number;
  };
  criticalIssues: {
    issue: string;
    text: string;
    requiredAction: string;
    impactOnScore: number;
  }[];
  recommendations: {
    priority: 'critical' | 'high' | 'medium' | 'low';
    action: string;
    expectedScoreIncrease: number;
    affectedText: string[];
    suggestedRewrites: string[];
  }[];
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

// Combined response type
interface CombinedReviewResult {
  factCheck: FactCheckResult;
  biasAnalysis: BiasAnalysisResult;
  combinedScore: number;
  model: string;
  reviewedAt: string;
  tokensUsed: number;
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const REVIEW_MODEL = 'openai/gpt-4o';

const FACT_CHECK_SOURCES = [
  { name: 'Snopes', type: 'fact-checker' as const, reliability: 85 },
  { name: 'PolitiFact', type: 'fact-checker' as const, reliability: 88 },
  { name: 'FactCheck.org', type: 'fact-checker' as const, reliability: 90 },
  { name: 'AP Fact Check', type: 'news-wire' as const, reliability: 92 },
  { name: 'Reuters Fact Check', type: 'news-wire' as const, reliability: 92 },
];

async function callOpenRouter(
  messages: { role: string; content: string }[],
  apiKey: string,
  maxTokens: number = 8000
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
      model: REVIEW_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  return response.json();
}

function calculateFactCheckPathTo88(
  currentScore: number,
  claims: ClaimVerification[],
  criticalIssues: { claim: string; issue: string; requiredAction: string; impactOnScore: number }[]
): FactCheckResult['pathTo88'] {
  const targetScore = 88;
  const gap = targetScore - currentScore;
  const requiredActions: FactCheckResult['pathTo88']['requiredActions'] = [];
  
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

  const falseClaims = claims.filter(c => c.status === 'false');
  const disputedClaims = claims.filter(c => c.status === 'disputed');
  const unverifiedClaims = claims.filter(c => c.status === 'unverified');
  
  if (falseClaims.length > 0) {
    requiredActions.push({
      action: `Correct ${falseClaims.length} false claim(s)`,
      scoreImpact: Math.min(20, falseClaims.length * 5),
      difficulty: 'moderate'
    });
  }
  
  if (disputedClaims.length > 0) {
    requiredActions.push({
      action: `Clarify ${disputedClaims.length} disputed claim(s)`,
      scoreImpact: Math.min(15, disputedClaims.length * 4),
      difficulty: 'moderate'
    });
  }
  
  if (unverifiedClaims.length > 0) {
    requiredActions.push({
      action: `Add sources for ${unverifiedClaims.length} unverified claim(s)`,
      scoreImpact: Math.min(12, unverifiedClaims.length * 3),
      difficulty: 'easy'
    });
  }

  const totalPossibleIncrease = requiredActions.reduce((sum, a) => sum + a.scoreImpact, 0);
  const achievable = currentScore + totalPossibleIncrease >= targetScore;
  
  let estimatedEffort = 'Unknown';
  if (gap <= 5) estimatedEffort = '5-10 minutes of quick edits';
  else if (gap <= 15) estimatedEffort = '15-30 minutes of focused editing';
  else if (gap <= 25) estimatedEffort = '30-60 minutes of substantial revision';
  else estimatedEffort = 'Significant rewriting may be required';
  
  return {
    currentScore,
    targetScore,
    gap,
    requiredActions: requiredActions.slice(0, 5),
    achievable,
    estimatedEffort
  };
}

function calculateBiasPathTo88(
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

  const severeInstances = instances.filter(i => i.level === 'severe' || i.level === 'high');
  const moderateInstances = instances.filter(i => i.level === 'moderate');
  
  if (severeInstances.length > 0) {
    requiredActions.push({
      action: `Rewrite ${severeInstances.length} severely biased passage(s)`,
      scoreImpact: Math.min(25, severeInstances.length * 8),
      difficulty: 'complex',
      specificEdits: severeInstances.slice(0, 3).map(i => i.suggestedRevision)
    });
  }
  
  if (moderateInstances.length > 0) {
    requiredActions.push({
      action: `Adjust ${moderateInstances.length} moderately biased phrase(s)`,
      scoreImpact: Math.min(15, moderateInstances.length * 4),
      difficulty: 'moderate',
      specificEdits: moderateInstances.slice(0, 3).map(i => i.suggestedRevision)
    });
  }

  const totalPossibleIncrease = requiredActions.reduce((sum, a) => sum + a.scoreImpact, 0);
  const achievable = currentScore + totalPossibleIncrease >= targetScore;
  
  let estimatedEffort = 'Unknown';
  if (gap <= 5) estimatedEffort = '5-10 minutes of minor edits';
  else if (gap <= 12) estimatedEffort = '15-20 minutes of focused editing';
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

function parseReviewResponse(content: string, articleId: string): CombinedReviewResult {
  const validStatuses = ['verified', 'partially-verified', 'unverified', 'disputed', 'false', 'needs-context'];
  const validSeverities = ['critical', 'major', 'minor', 'informational'];
  const validBiasTypes: BiasType[] = [
    'political-left', 'political-right', 'emotional-appeal', 'sensationalism',
    'corporate-interest', 'framing-bias', 'selection-bias', 'omission-bias',
    'confirmation-bias', 'anchoring-bias', 'loaded-language', 'false-balance'
  ];
  const validBiasLevels: BiasLevel[] = ['none', 'minimal', 'low', 'moderate', 'high', 'severe'];
  const politicalLeanings = ['far-left', 'left', 'center-left', 'center', 'center-right', 'right', 'far-right'];

  const now = new Date().toISOString();

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      const factData = data.factCheck || {};
      const biasData = data.biasAnalysis || {};

      // Parse fact-check claims
      const claims: ClaimVerification[] = (factData.claims || []).map((claim: any, index: number) => ({
        claimId: `claim-${index}-${Date.now()}`,
        claim: String(claim.claim || ''),
        originalText: String(claim.originalText || claim.claim || ''),
        location: String(claim.location || 'Unknown'),
        status: validStatuses.includes(claim.status) ? claim.status : 'unverified',
        confidence: Math.min(100, Math.max(0, Number(claim.confidence) || 50)),
        explanation: String(claim.explanation || ''),
        verificationSources: Array.isArray(claim.verificationSources) 
          ? claim.verificationSources.map((src: any) => ({
              type: src.type || 'provided-source',
              name: String(src.name || 'Unknown'),
              reliability: Number(src.reliability) || 50,
            }))
          : [],
        crossReferenceCount: Number(claim.crossReferenceCount) || 0,
        suggestedCorrection: claim.suggestedCorrection,
        severity: validSeverities.includes(claim.severity) ? claim.severity : 'minor',
        improvementAction: claim.improvementAction,
      }));

      const factScore = Math.min(100, Math.max(0, Number(factData.overallScore) || 50));
      let factStatus: FactCheckResult['overallStatus'];
      if (factScore >= 90) factStatus = 'excellent';
      else if (factScore >= 75) factStatus = 'good';
      else if (factScore >= 60) factStatus = 'needs-work';
      else if (factScore >= 40) factStatus = 'poor';
      else factStatus = 'unreliable';

      const factCriticalIssues = Array.isArray(factData.criticalIssues) 
        ? factData.criticalIssues.map((issue: any) => ({
            claim: String(issue.claim || ''),
            issue: String(issue.issue || ''),
            requiredAction: String(issue.requiredAction || ''),
            impactOnScore: Number(issue.impactOnScore) || 5,
          }))
        : [];

      // Parse bias instances
      const instances: BiasInstance[] = (biasData.instances || []).map((instance: any, index: number) => ({
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

      const biasScore = Math.min(100, Math.max(0, Number(biasData.overallScore) || 75));
      let biasLevel: BiasLevel;
      if (biasScore >= 95) biasLevel = 'none';
      else if (biasScore >= 88) biasLevel = 'minimal';
      else if (biasScore >= 75) biasLevel = 'low';
      else if (biasScore >= 60) biasLevel = 'moderate';
      else if (biasScore >= 40) biasLevel = 'high';
      else biasLevel = 'severe';

      const biasCriticalIssues = Array.isArray(biasData.criticalIssues)
        ? biasData.criticalIssues.map((issue: any) => ({
            issue: String(issue.issue || ''),
            text: String(issue.text || ''),
            requiredAction: String(issue.requiredAction || ''),
            impactOnScore: Number(issue.impactOnScore) || 5,
          }))
        : [];

      const factCheck: FactCheckResult = {
        articleId,
        overallScore: factScore,
        overallStatus: factStatus,
        claims,
        totalClaimsChecked: claims.length,
        verifiedCount: claims.filter(c => c.status === 'verified').length,
        partiallyVerifiedCount: claims.filter(c => c.status === 'partially-verified').length,
        unverifiedCount: claims.filter(c => c.status === 'unverified').length,
        disputedCount: claims.filter(c => c.status === 'disputed').length,
        falseCount: claims.filter(c => c.status === 'false').length,
        needsContextCount: claims.filter(c => c.status === 'needs-context').length,
        categoryBreakdown: Array.isArray(factData.categoryBreakdown)
          ? factData.categoryBreakdown.map((cat: any) => ({
              category: String(cat.category || 'general'),
              total: Number(cat.total) || 0,
              verified: Number(cat.verified) || 0,
              score: Number(cat.score) || 50,
            }))
          : [],
        criticalIssues: factCriticalIssues,
        recommendations: Array.isArray(factData.recommendations)
          ? factData.recommendations.map((rec: any) => ({
              priority: ['high', 'medium', 'low'].includes(rec.priority) ? rec.priority : 'medium',
              action: String(rec.action || ''),
              expectedScoreIncrease: Number(rec.expectedScoreIncrease) || 3,
              affectedClaims: Array.isArray(rec.affectedClaims) ? rec.affectedClaims : [],
            }))
          : [],
        scoreBreakdown: {
          verificationAccuracy: Number(factData.scoreBreakdown?.verificationAccuracy) || factScore,
          sourceDiversity: Number(factData.scoreBreakdown?.sourceDiversity) || 50,
          claimCoverage: Number(factData.scoreBreakdown?.claimCoverage) || 50,
          criticalClaimsScore: Number(factData.scoreBreakdown?.criticalClaimsScore) || factScore,
        },
        pathTo88: calculateFactCheckPathTo88(factScore, claims, factCriticalIssues),
        model: REVIEW_MODEL,
        checkedAt: now,
        tokensUsed: 0,
      };

      const biasAnalysis: BiasAnalysisResult = {
        articleId,
        overallBiasLevel: biasLevel,
        overallScore: biasScore,
        instances,
        totalIssuesFound: instances.length,
        biasTypeBreakdown: Array.isArray(biasData.biasTypeBreakdown)
          ? biasData.biasTypeBreakdown.map((bt: any) => ({
              type: validBiasTypes.includes(bt.type) ? bt.type : 'framing-bias',
              count: Number(bt.count) || 0,
              severity: validBiasLevels.includes(bt.severity) ? bt.severity : 'low',
              examples: Array.isArray(bt.examples) ? bt.examples : [],
            }))
          : [],
        politicalAnalysis: {
          leaning: politicalLeanings.includes(biasData.politicalAnalysis?.leaning) 
            ? biasData.politicalAnalysis.leaning 
            : 'center',
          confidence: Number(biasData.politicalAnalysis?.confidence) || 50,
          indicators: Array.isArray(biasData.politicalAnalysis?.indicators) 
            ? biasData.politicalAnalysis.indicators 
            : [],
        },
        tonalAnalysis: {
          objectivity: Number(biasData.tonalAnalysis?.objectivity) || biasScore,
          emotionality: Number(biasData.tonalAnalysis?.emotionality) || 30,
          sensationalism: Number(biasData.tonalAnalysis?.sensationalism) || 20,
          balanceScore: Number(biasData.tonalAnalysis?.balanceScore) || biasScore,
          professionalTone: Number(biasData.tonalAnalysis?.professionalTone) || biasScore,
        },
        sourceBalance: {
          totalSourcesMentioned: Number(biasData.sourceBalance?.totalSourcesMentioned) || 0,
          perspectivesRepresented: Number(biasData.sourceBalance?.perspectivesRepresented) || 1,
          missingPerspectives: Array.isArray(biasData.sourceBalance?.missingPerspectives) 
            ? biasData.sourceBalance.missingPerspectives 
            : [],
          sourceCredibilityScore: Number(biasData.sourceBalance?.sourceCredibilityScore) || 50,
        },
        criticalIssues: biasCriticalIssues,
        recommendations: Array.isArray(biasData.recommendations)
          ? biasData.recommendations.map((rec: any) => ({
              priority: ['critical', 'high', 'medium', 'low'].includes(rec.priority) 
                ? rec.priority : 'medium',
              action: String(rec.action || ''),
              expectedScoreIncrease: Number(rec.expectedScoreIncrease) || 3,
              affectedText: Array.isArray(rec.affectedText) ? rec.affectedText : [],
              suggestedRewrites: Array.isArray(rec.suggestedRewrites) ? rec.suggestedRewrites : [],
            }))
          : [],
        pathTo88: calculateBiasPathTo88(biasScore, instances, biasCriticalIssues),
        scoreBreakdown: {
          languageNeutrality: Number(biasData.scoreBreakdown?.languageNeutrality) || biasScore,
          perspectiveBalance: Number(biasData.scoreBreakdown?.perspectiveBalance) || biasScore,
          factualPresentation: Number(biasData.scoreBreakdown?.factualPresentation) || biasScore,
          emotionalRestraint: Number(biasData.scoreBreakdown?.emotionalRestraint) || biasScore,
          sourceCredibility: Number(biasData.scoreBreakdown?.sourceCredibility) || biasScore,
        },
        model: REVIEW_MODEL,
        analyzedAt: now,
        tokensUsed: 0,
      };

      return {
        factCheck,
        biasAnalysis,
        combinedScore: Math.round((factScore + biasScore) / 2),
        model: REVIEW_MODEL,
        reviewedAt: now,
        tokensUsed: 0,
      };
    }
  } catch (e) {
    console.error('Failed to parse review response:', e);
    console.error('Content was:', content.substring(0, 500));
  }

  // Return default result on parse failure
  return createDefaultResult(articleId);
}

function createDefaultResult(articleId: string): CombinedReviewResult {
  const now = new Date().toISOString();
  
  return {
    factCheck: {
      articleId,
      overallScore: 50,
      overallStatus: 'needs-work',
      claims: [],
      totalClaimsChecked: 0,
      verifiedCount: 0,
      partiallyVerifiedCount: 0,
      unverifiedCount: 0,
      disputedCount: 0,
      falseCount: 0,
      needsContextCount: 0,
      categoryBreakdown: [],
      criticalIssues: [{
        claim: 'Analysis Error',
        issue: 'Unable to parse review results',
        requiredAction: 'Re-run article review',
        impactOnScore: 20
      }],
      recommendations: [],
      scoreBreakdown: {
        verificationAccuracy: 50,
        sourceDiversity: 0,
        claimCoverage: 0,
        criticalClaimsScore: 50,
      },
      pathTo88: {
        currentScore: 50,
        targetScore: 88,
        gap: 38,
        requiredActions: [],
        achievable: false,
        estimatedEffort: 'Unable to estimate'
      },
      model: REVIEW_MODEL,
      checkedAt: now,
      tokensUsed: 0,
    },
    biasAnalysis: {
      articleId,
      overallBiasLevel: 'low',
      overallScore: 75,
      instances: [],
      totalIssuesFound: 0,
      biasTypeBreakdown: [],
      politicalAnalysis: { leaning: 'center', confidence: 50, indicators: [] },
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
      criticalIssues: [],
      recommendations: [],
      pathTo88: {
        currentScore: 75,
        targetScore: 88,
        gap: 13,
        requiredActions: [],
        achievable: false,
        estimatedEffort: 'Unable to estimate'
      },
      scoreBreakdown: {
        languageNeutrality: 75,
        perspectiveBalance: 75,
        factualPresentation: 75,
        emotionalRestraint: 75,
        sourceCredibility: 75,
      },
      model: REVIEW_MODEL,
      analyzedAt: now,
      tokensUsed: 0,
    },
    combinedScore: 63,
    model: REVIEW_MODEL,
    reviewedAt: now,
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
      sourceStories?: StoryContent[];
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

    const factCheckingSources = FACT_CHECK_SOURCES.map(s => s.name).join(', ');

    const messages = [
      {
        role: 'system',
        content: `You are an expert journalist reviewer performing BOTH fact-checking AND bias analysis in a single comprehensive review.

## PART 1: FACT-CHECK
Break down claims and verify each one:
- "verified": Confirmed by 2+ reliable sources
- "partially-verified": Core accurate but details uncertain  
- "unverified": Cannot find sufficient evidence
- "disputed": Conflicting information exists
- "false": Contradicted by reliable evidence
- "needs-context": Accurate but potentially misleading

Severity: "critical" | "major" | "minor" | "informational"
Cross-reference with: ${factCheckingSources}

## PART 2: BIAS ANALYSIS
Detect bias types:
- political-left/political-right: Partisan framing
- emotional-appeal: Designed to evoke emotions
- sensationalism: Exaggeration
- loaded-language: Words with strong connotations
- framing-bias: How presentation affects perception
- omission-bias: Important context left out

Bias levels: "none" | "minimal" | "low" | "moderate" | "high" | "severe"

For EVERY issue found, provide a specific suggested fix/rewrite.

IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks.`,
      },
      {
        role: 'user',
        content: `ARTICLE TO REVIEW:
Title: ${article.title}

${article.body}

${sourceContext ? `SOURCE MATERIALS:\n${sourceContext}` : ''}

Return this exact JSON structure:
{
  "factCheck": {
    "overallScore": 75,
    "claims": [
      {
        "claim": "specific claim",
        "originalText": "exact quote from article",
        "location": "paragraph 1",
        "status": "verified",
        "confidence": 85,
        "explanation": "why this status",
        "verificationSources": [{"type": "news-wire", "name": "Reuters", "reliability": 92}],
        "crossReferenceCount": 2,
        "severity": "major",
        "suggestedCorrection": "corrected text if needed",
        "improvementAction": "how to fix"
      }
    ],
    "criticalIssues": [{"claim": "...", "issue": "...", "requiredAction": "...", "impactOnScore": 10}],
    "recommendations": [{"priority": "high", "action": "...", "expectedScoreIncrease": 5, "affectedClaims": []}],
    "scoreBreakdown": {"verificationAccuracy": 75, "sourceDiversity": 60, "claimCoverage": 80, "criticalClaimsScore": 70}
  },
  "biasAnalysis": {
    "overallScore": 78,
    "instances": [
      {
        "type": "loaded-language",
        "level": "moderate",
        "text": "exact biased text",
        "location": "paragraph 2",
        "explanation": "why biased",
        "suggestedRevision": "neutral alternative",
        "impactOnObjectivity": 8,
        "difficulty": "easy"
      }
    ],
    "politicalAnalysis": {"leaning": "center", "confidence": 70, "indicators": []},
    "tonalAnalysis": {"objectivity": 75, "emotionality": 30, "sensationalism": 20, "balanceScore": 80, "professionalTone": 85},
    "sourceBalance": {"totalSourcesMentioned": 3, "perspectivesRepresented": 2, "missingPerspectives": [], "sourceCredibilityScore": 75},
    "criticalIssues": [{"issue": "...", "text": "...", "requiredAction": "...", "impactOnScore": 10}],
    "recommendations": [{"priority": "high", "action": "...", "expectedScoreIncrease": 8, "affectedText": [], "suggestedRewrites": []}],
    "scoreBreakdown": {"languageNeutrality": 78, "perspectiveBalance": 75, "factualPresentation": 82, "emotionalRestraint": 80, "sourceCredibility": 70}
  }
}`,
      },
    ];

    console.log('[review-article] Calling OpenRouter with combined fact-check + bias analysis...');
    const startTime = Date.now();
    const response = await callOpenRouter(messages, apiKey);
    const duration = Date.now() - startTime;
    const content = response.choices[0]?.message?.content || '';
    console.log(`[review-article] Response received in ${duration}ms, length: ${content.length}`);
    
    const result = parseReviewResponse(content, article.id);
    result.tokensUsed = response.usage?.total_tokens || 0;
    result.factCheck.tokensUsed = result.tokensUsed;
    result.biasAnalysis.tokensUsed = result.tokensUsed;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Review article error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to review article',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
