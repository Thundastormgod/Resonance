// Netlify Function: Enhanced Atomic Fact Checking
// Uses OpenRouter AI to verify individual claims against multiple verification sources

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

// Verification source categories for atomic fact-checking
type VerificationSourceType = 
  | 'primary-source'      // Direct government/official sources
  | 'news-wire'          // AP, Reuters, AFP
  | 'academic'           // Research papers, journals
  | 'fact-checker'       // Snopes, PolitiFact, etc.
  | 'official-records'   // Court documents, public records
  | 'expert-source'      // Subject matter experts
  | 'provided-source';   // Source materials provided with article

interface VerificationSource {
  type: VerificationSourceType;
  name: string;
  url?: string;
  reliability: number; // 0-100
  quote?: string;
  verificationDate?: string;
}

// Individual verification result for each claim
interface ClaimVerification {
  claimId: string;
  claim: string;
  originalText: string;
  location: string;
  status: 'verified' | 'partially-verified' | 'unverified' | 'disputed' | 'false' | 'needs-context';
  confidence: number; // 0-100
  explanation: string;
  verificationSources: VerificationSource[];
  crossReferenceCount: number;
  suggestedCorrection?: string;
  contextNeeded?: string;
  severity: 'critical' | 'major' | 'minor' | 'informational';
  improvementAction?: string;
}

// Comprehensive fact-check result
interface FactCheckResult {
  articleId: string;
  overallScore: number; // 0-100
  overallStatus: 'excellent' | 'good' | 'needs-work' | 'poor' | 'unreliable';
  
  // Claim counts by status
  claims: ClaimVerification[];
  totalClaimsChecked: number;
  verifiedCount: number;
  partiallyVerifiedCount: number;
  unverifiedCount: number;
  disputedCount: number;
  falseCount: number;
  needsContextCount: number;
  
  // Breakdown by category
  categoryBreakdown: {
    category: string;
    total: number;
    verified: number;
    score: number;
  }[];
  
  // Specific issues requiring attention
  criticalIssues: {
    claim: string;
    issue: string;
    requiredAction: string;
    impactOnScore: number;
  }[];
  
  // Actionable recommendations to improve score
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    expectedScoreIncrease: number;
    affectedClaims: string[];
  }[];
  
  // Score breakdown for transparency
  scoreBreakdown: {
    verificationAccuracy: number;
    sourceDiversity: number;
    claimCoverage: number;
    criticalClaimsScore: number;
  };
  
  // Requirements to reach 88%
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

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const FACT_CHECK_MODEL = 'openai/gpt-4o';

// Well-known fact-checking sources for reference
const FACT_CHECK_SOURCES = [
  { name: 'Snopes', type: 'fact-checker' as const, reliability: 85 },
  { name: 'PolitiFact', type: 'fact-checker' as const, reliability: 88 },
  { name: 'FactCheck.org', type: 'fact-checker' as const, reliability: 90 },
  { name: 'AP Fact Check', type: 'news-wire' as const, reliability: 92 },
  { name: 'Reuters Fact Check', type: 'news-wire' as const, reliability: 92 },
  { name: 'Full Fact (UK)', type: 'fact-checker' as const, reliability: 86 },
  { name: 'AFP Fact Check', type: 'news-wire' as const, reliability: 90 },
];

async function callOpenRouter(
  messages: { role: string; content: string }[],
  apiKey: string,
  maxTokens: number = 6000
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
      max_tokens: maxTokens,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  return response.json();
}

function calculatePathTo88(
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
  const needsContextClaims = claims.filter(c => c.status === 'needs-context');
  
  if (falseClaims.length > 0) {
    const impact = Math.min(20, falseClaims.length * 5);
    requiredActions.push({
      action: `Correct ${falseClaims.length} false claim(s): ${falseClaims.slice(0, 2).map(c => c.claim.substring(0, 40)).join('; ')}`,
      scoreImpact: impact,
      difficulty: 'moderate'
    });
  }
  
  if (disputedClaims.length > 0) {
    const impact = Math.min(15, disputedClaims.length * 4);
    requiredActions.push({
      action: `Clarify ${disputedClaims.length} disputed claim(s) with additional sources`,
      scoreImpact: impact,
      difficulty: 'moderate'
    });
  }
  
  if (unverifiedClaims.length > 0) {
    const impact = Math.min(12, unverifiedClaims.length * 3);
    requiredActions.push({
      action: `Add sources for ${unverifiedClaims.length} unverified claim(s)`,
      scoreImpact: impact,
      difficulty: 'easy'
    });
  }
  
  if (needsContextClaims.length > 0) {
    const impact = Math.min(8, needsContextClaims.length * 2);
    requiredActions.push({
      action: `Add context to ${needsContextClaims.length} claim(s)`,
      scoreImpact: impact,
      difficulty: 'easy'
    });
  }
  
  criticalIssues.slice(0, 2).forEach(issue => {
    requiredActions.push({
      action: issue.requiredAction,
      scoreImpact: issue.impactOnScore,
      difficulty: 'complex'
    });
  });
  
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

function parseFactCheckResponse(content: string, articleId: string): FactCheckResult {
  const validStatuses = ['verified', 'partially-verified', 'unverified', 'disputed', 'false', 'needs-context'];
  const validSeverities = ['critical', 'major', 'minor', 'informational'];
  
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      
      const claims: ClaimVerification[] = (data.claims || []).map((claim: any, index: number) => ({
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
              url: src.url,
              reliability: Number(src.reliability) || 50,
              quote: src.quote,
            }))
          : [],
        crossReferenceCount: Number(claim.crossReferenceCount) || 0,
        suggestedCorrection: claim.suggestedCorrection,
        contextNeeded: claim.contextNeeded,
        severity: validSeverities.includes(claim.severity) ? claim.severity : 'minor',
        improvementAction: claim.improvementAction,
      }));

      const verifiedCount = claims.filter(c => c.status === 'verified').length;
      const partiallyVerifiedCount = claims.filter(c => c.status === 'partially-verified').length;
      const unverifiedCount = claims.filter(c => c.status === 'unverified').length;
      const disputedCount = claims.filter(c => c.status === 'disputed').length;
      const falseCount = claims.filter(c => c.status === 'false').length;
      const needsContextCount = claims.filter(c => c.status === 'needs-context').length;
      
      const overallScore = Math.min(100, Math.max(0, Number(data.overallScore) || 50));
      
      let overallStatus: FactCheckResult['overallStatus'];
      if (overallScore >= 90) overallStatus = 'excellent';
      else if (overallScore >= 75) overallStatus = 'good';
      else if (overallScore >= 60) overallStatus = 'needs-work';
      else if (overallScore >= 40) overallStatus = 'poor';
      else overallStatus = 'unreliable';
      
      const criticalIssues = Array.isArray(data.criticalIssues) 
        ? data.criticalIssues.map((issue: any) => ({
            claim: String(issue.claim || ''),
            issue: String(issue.issue || ''),
            requiredAction: String(issue.requiredAction || ''),
            impactOnScore: Number(issue.impactOnScore) || 5,
          }))
        : [];
      
      const recommendations = Array.isArray(data.recommendations)
        ? data.recommendations.map((rec: any) => ({
            priority: ['high', 'medium', 'low'].includes(rec.priority) ? rec.priority : 'medium',
            action: String(rec.action || ''),
            expectedScoreIncrease: Number(rec.expectedScoreIncrease) || 3,
            affectedClaims: Array.isArray(rec.affectedClaims) ? rec.affectedClaims : [],
          }))
        : [];
      
      const categoryBreakdown = Array.isArray(data.categoryBreakdown)
        ? data.categoryBreakdown.map((cat: any) => ({
            category: String(cat.category || 'general'),
            total: Number(cat.total) || 0,
            verified: Number(cat.verified) || 0,
            score: Number(cat.score) || 50,
          }))
        : [];
      
      const scoreBreakdown = {
        verificationAccuracy: Number(data.scoreBreakdown?.verificationAccuracy) || overallScore,
        sourceDiversity: Number(data.scoreBreakdown?.sourceDiversity) || 50,
        claimCoverage: Number(data.scoreBreakdown?.claimCoverage) || 50,
        criticalClaimsScore: Number(data.scoreBreakdown?.criticalClaimsScore) || overallScore,
      };
      
      const pathTo88 = calculatePathTo88(overallScore, claims, criticalIssues);

      return {
        articleId,
        overallScore,
        overallStatus,
        claims,
        totalClaimsChecked: claims.length,
        verifiedCount,
        partiallyVerifiedCount,
        unverifiedCount,
        disputedCount,
        falseCount,
        needsContextCount,
        categoryBreakdown,
        criticalIssues,
        recommendations,
        scoreBreakdown,
        pathTo88,
        model: FACT_CHECK_MODEL,
        checkedAt: new Date().toISOString(),
        tokensUsed: 0,
      };
    }
  } catch (e) {
    console.error('Failed to parse fact-check response:', e);
    console.error('Content was:', content.substring(0, 500));
  }

  // Return default result on parse failure
  return {
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
      issue: 'Unable to parse fact-check results',
      requiredAction: 'Manual review required - re-run fact check',
      impactOnScore: 20
    }],
    recommendations: [{
      priority: 'high',
      action: 'Re-run fact-check or perform manual verification',
      expectedScoreIncrease: 0,
      affectedClaims: []
    }],
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
      requiredActions: [{
        action: 'Re-run automated fact-check',
        scoreImpact: 0,
        difficulty: 'easy'
      }],
      achievable: false,
      estimatedEffort: 'Unable to estimate - analysis failed'
    },
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

    const factCheckingSources = FACT_CHECK_SOURCES.map(s => s.name).join(', ');

    const messages = [
      {
        role: 'system',
        content: `You are an expert fact-checker performing ATOMIC fact verification. Break down the article into individual verifiable claims and verify each one.

## VERIFICATION STANDARDS
- "verified": Confirmed by 2+ reliable sources
- "partially-verified": Core accurate but details uncertain  
- "unverified": Cannot find sufficient evidence
- "disputed": Conflicting information exists
- "false": Contradicted by reliable evidence
- "needs-context": Accurate but potentially misleading

## SEVERITY LEVELS
- "critical": Central to article's thesis
- "major": Important supporting fact
- "minor": Peripheral detail
- "informational": Background context

Cross-reference with: ${factCheckingSources}

IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, just the JSON object.`,
      },
      {
        role: 'user',
        content: `ARTICLE TO FACT-CHECK:
Title: ${article.title}

${article.body}

SOURCE MATERIALS:
${sourceContext || 'No source materials provided'}

Return this exact JSON structure (no markdown):
{
  "overallScore": 75,
  "claims": [
    {
      "claim": "specific claim text",
      "originalText": "exact quote from article that contains this claim",
      "location": "paragraph 1",
      "status": "verified",
      "confidence": 85,
      "explanation": "why this status",
      "verificationSources": [
        {"type": "news-wire", "name": "Reuters", "reliability": 92}
      ],
      "crossReferenceCount": 2,
      "severity": "major",
      "improvementAction": "specific fix if needed",
      "suggestedCorrection": "corrected version of originalText if status is false/disputed/needs-context"
    }
  ],
  "categoryBreakdown": [
    {"category": "statistic", "total": 3, "verified": 2, "score": 67}
  ],
  "criticalIssues": [
    {"claim": "problematic claim", "issue": "what is wrong", "requiredAction": "how to fix", "impactOnScore": 10}
  ],
  "recommendations": [
    {"priority": "high", "action": "specific action", "expectedScoreIncrease": 5, "affectedClaims": []}
  ],
  "scoreBreakdown": {
    "verificationAccuracy": 75,
    "sourceDiversity": 60,
    "claimCoverage": 80,
    "criticalClaimsScore": 70
  }
}

CRITICAL: For each claim with status "false", "disputed", or "needs-context", you MUST provide:
1. "originalText" - The EXACT text from the article (copy-paste) 
2. "suggestedCorrection" - A corrected version that should replace the originalText
3. "improvementAction" - Brief description of what change is needed`,
      },
    ];

    console.log('[fact-check] Calling OpenRouter...');
    const response = await callOpenRouter(messages, apiKey);
    const content = response.choices[0]?.message?.content || '';
    console.log('[fact-check] Response length:', content.length);
    
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
