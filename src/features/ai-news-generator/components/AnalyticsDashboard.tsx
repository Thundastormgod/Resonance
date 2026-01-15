// Analytics Dashboard Component
// Tracks token usage, costs, generation times, and quality metrics

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Coins,
  Clock,
  Zap,
  Brain,
  Target,
  Calendar,
  Download,
  RefreshCw,
  Info,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================================
// TYPES
// ============================================================

export interface TokenUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number; // USD
}

export interface GenerationMetrics {
  id: string;
  timestamp: string;
  articleTitle: string;
  
  // Time metrics
  fetchTime: number;      // ms - time to fetch headlines
  readTime: number;       // ms - time to read stories
  generationTime: number; // ms - AI generation time
  factCheckTime: number;  // ms - fact check time
  biasCheckTime: number;  // ms - bias check time
  totalTime: number;      // ms - total workflow time
  
  // Token usage
  generationTokens: TokenUsage;
  factCheckTokens?: TokenUsage;
  biasCheckTokens?: TokenUsage;
  totalTokens: number;
  totalCost: number;
  
  // Quality metrics
  factCheckScore: number;
  biasScore: number;
  overallScore: number;
  wordCount: number;
  
  // Workflow info
  stage: string;
  success: boolean;
  regenerations: number;
}

interface AnalyticsDashboardProps {
  metrics?: GenerationMetrics[];
  currentSession?: {
    startTime: string;
    articlesGenerated: number;
    totalTokens: number;
    totalCost: number;
    avgScore: number;
  };
}

// ============================================================
// PRICING CONSTANTS (OpenRouter pricing as of 2024)
// ============================================================

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'anthropic/claude-3.5-haiku': { input: 0.25, output: 1.25 },      // per 1M tokens
  'openai/gpt-4o': { input: 2.50, output: 10.00 },                   // per 1M tokens
  'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },               // per 1M tokens
  'anthropic/claude-3.5-sonnet': { input: 3.00, output: 15.00 },     // per 1M tokens
  'google/gemini-pro': { input: 0.25, output: 0.50 },                // per 1M tokens
};

// ============================================================
// MOCK DATA
// ============================================================

const MOCK_METRICS: GenerationMetrics[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    articleTitle: 'Tech Giants Report Strong Q4 Earnings',
    fetchTime: 2500,
    readTime: 4200,
    generationTime: 8500,
    factCheckTime: 5200,
    biasCheckTime: 3800,
    totalTime: 24200,
    generationTokens: {
      model: 'anthropic/claude-3.5-haiku',
      promptTokens: 2400,
      completionTokens: 1800,
      totalTokens: 4200,
      cost: 0.00285,
    },
    factCheckTokens: {
      model: 'openai/gpt-4o',
      promptTokens: 3200,
      completionTokens: 1200,
      totalTokens: 4400,
      cost: 0.020,
    },
    biasCheckTokens: {
      model: 'anthropic/claude-3.5-haiku',
      promptTokens: 2800,
      completionTokens: 1000,
      totalTokens: 3800,
      cost: 0.00195,
    },
    totalTokens: 12400,
    totalCost: 0.0248,
    factCheckScore: 87,
    biasScore: 92,
    overallScore: 89,
    wordCount: 856,
    stage: 'published',
    success: true,
    regenerations: 0,
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    articleTitle: 'Climate Summit Reaches Historic Agreement',
    fetchTime: 2100,
    readTime: 3800,
    generationTime: 9200,
    factCheckTime: 6100,
    biasCheckTime: 4100,
    totalTime: 25300,
    generationTokens: {
      model: 'anthropic/claude-3.5-haiku',
      promptTokens: 2800,
      completionTokens: 2100,
      totalTokens: 4900,
      cost: 0.00333,
    },
    factCheckTokens: {
      model: 'openai/gpt-4o',
      promptTokens: 3600,
      completionTokens: 1400,
      totalTokens: 5000,
      cost: 0.023,
    },
    biasCheckTokens: {
      model: 'anthropic/claude-3.5-haiku',
      promptTokens: 3100,
      completionTokens: 1100,
      totalTokens: 4200,
      cost: 0.00215,
    },
    totalTokens: 14100,
    totalCost: 0.02848,
    factCheckScore: 91,
    biasScore: 88,
    overallScore: 90,
    wordCount: 1024,
    stage: 'published',
    success: true,
    regenerations: 1,
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    articleTitle: 'Healthcare Innovation Breakthrough',
    fetchTime: 2800,
    readTime: 4500,
    generationTime: 7800,
    factCheckTime: 4800,
    biasCheckTime: 3500,
    totalTime: 23400,
    generationTokens: {
      model: 'anthropic/claude-3.5-haiku',
      promptTokens: 2200,
      completionTokens: 1600,
      totalTokens: 3800,
      cost: 0.00255,
    },
    factCheckTokens: {
      model: 'openai/gpt-4o',
      promptTokens: 2900,
      completionTokens: 1100,
      totalTokens: 4000,
      cost: 0.0183,
    },
    biasCheckTokens: {
      model: 'anthropic/claude-3.5-haiku',
      promptTokens: 2500,
      completionTokens: 900,
      totalTokens: 3400,
      cost: 0.00175,
    },
    totalTokens: 11200,
    totalCost: 0.0226,
    factCheckScore: 78,
    biasScore: 85,
    overallScore: 81,
    wordCount: 742,
    stage: 'editing',
    success: true,
    regenerations: 2,
  },
];

// ============================================================
// HELPERS
// ============================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

function calculateTrend(current: number, previous: number): { value: number; direction: 'up' | 'down' | 'neutral' } {
  if (previous === 0) return { value: 0, direction: 'neutral' };
  const change = ((current - previous) / previous) * 100;
  return {
    value: Math.abs(change),
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
  };
}

// ============================================================
// COMPONENT
// ============================================================

export function AnalyticsDashboard({
  metrics = MOCK_METRICS,
  currentSession,
}: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');

  // Filter metrics by time range
  const filteredMetrics = useMemo(() => {
    const now = Date.now();
    const ranges: Record<string, number> = {
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000,
      'all': Infinity,
    };
    const cutoff = now - ranges[timeRange];
    return metrics.filter(m => new Date(m.timestamp).getTime() > cutoff);
  }, [metrics, timeRange]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (filteredMetrics.length === 0) {
      return {
        totalArticles: 0,
        successRate: 0,
        totalTokens: 0,
        totalCost: 0,
        avgTime: 0,
        avgScore: 0,
        avgWordCount: 0,
        totalRegenerations: 0,
      };
    }

    const successful = filteredMetrics.filter(m => m.success);
    return {
      totalArticles: filteredMetrics.length,
      successRate: (successful.length / filteredMetrics.length) * 100,
      totalTokens: filteredMetrics.reduce((sum, m) => sum + m.totalTokens, 0),
      totalCost: filteredMetrics.reduce((sum, m) => sum + m.totalCost, 0),
      avgTime: filteredMetrics.reduce((sum, m) => sum + m.totalTime, 0) / filteredMetrics.length,
      avgScore: filteredMetrics.reduce((sum, m) => sum + m.overallScore, 0) / filteredMetrics.length,
      avgWordCount: filteredMetrics.reduce((sum, m) => sum + m.wordCount, 0) / filteredMetrics.length,
      totalRegenerations: filteredMetrics.reduce((sum, m) => sum + m.regenerations, 0),
    };
  }, [filteredMetrics]);

  // Model usage breakdown
  const modelUsage = useMemo(() => {
    const usage: Record<string, { tokens: number; cost: number; calls: number }> = {};
    
    filteredMetrics.forEach(m => {
      // Generation
      const genModel = m.generationTokens.model;
      if (!usage[genModel]) usage[genModel] = { tokens: 0, cost: 0, calls: 0 };
      usage[genModel].tokens += m.generationTokens.totalTokens;
      usage[genModel].cost += m.generationTokens.cost;
      usage[genModel].calls += 1;

      // Fact check
      if (m.factCheckTokens) {
        const fcModel = m.factCheckTokens.model;
        if (!usage[fcModel]) usage[fcModel] = { tokens: 0, cost: 0, calls: 0 };
        usage[fcModel].tokens += m.factCheckTokens.totalTokens;
        usage[fcModel].cost += m.factCheckTokens.cost;
        usage[fcModel].calls += 1;
      }

      // Bias check
      if (m.biasCheckTokens) {
        const bcModel = m.biasCheckTokens.model;
        if (!usage[bcModel]) usage[bcModel] = { tokens: 0, cost: 0, calls: 0 };
        usage[bcModel].tokens += m.biasCheckTokens.totalTokens;
        usage[bcModel].cost += m.biasCheckTokens.cost;
        usage[bcModel].calls += 1;
      }
    });

    return Object.entries(usage)
      .sort((a, b) => b[1].cost - a[1].cost)
      .map(([model, data]) => ({ model, ...data }));
  }, [filteredMetrics]);

  // Time breakdown
  const timeBreakdown = useMemo(() => {
    if (filteredMetrics.length === 0) return null;

    const total = filteredMetrics.reduce((sum, m) => sum + m.totalTime, 0);
    const avgFetch = filteredMetrics.reduce((sum, m) => sum + m.fetchTime, 0) / filteredMetrics.length;
    const avgRead = filteredMetrics.reduce((sum, m) => sum + m.readTime, 0) / filteredMetrics.length;
    const avgGen = filteredMetrics.reduce((sum, m) => sum + m.generationTime, 0) / filteredMetrics.length;
    const avgFact = filteredMetrics.reduce((sum, m) => sum + m.factCheckTime, 0) / filteredMetrics.length;
    const avgBias = filteredMetrics.reduce((sum, m) => sum + m.biasCheckTime, 0) / filteredMetrics.length;
    const avgTotal = total / filteredMetrics.length;

    return [
      { name: 'Fetch Headlines', time: avgFetch, percent: (avgFetch / avgTotal) * 100 },
      { name: 'Read Stories', time: avgRead, percent: (avgRead / avgTotal) * 100 },
      { name: 'AI Generation', time: avgGen, percent: (avgGen / avgTotal) * 100 },
      { name: 'Fact Check', time: avgFact, percent: (avgFact / avgTotal) * 100 },
      { name: 'Bias Check', time: avgBias, percent: (avgBias / avgTotal) * 100 },
    ];
  }, [filteredMetrics]);

  // Export data
  const exportData = () => {
    const data = {
      exportDate: new Date().toISOString(),
      timeRange,
      summary: stats,
      modelUsage,
      metrics: filteredMetrics,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resonance-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Analytics Dashboard</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Articles */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Articles Generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalArticles}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="text-green-500">{stats.successRate.toFixed(0)}%</span> success rate
            </div>
          </CardContent>
        </Card>

        {/* Total Cost */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Coins className="h-3 w-3" />
              Total Cost
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stats.totalCost)}</div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalCost / Math.max(stats.totalArticles, 1))} per article
            </div>
          </CardContent>
        </Card>

        {/* Total Tokens */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Brain className="h-3 w-3" />
              Total Tokens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatNumber(stats.totalTokens)}</div>
            <div className="text-xs text-muted-foreground">
              ~{formatNumber(Math.round(stats.totalTokens / Math.max(stats.totalArticles, 1)))} per article
            </div>
          </CardContent>
        </Card>

        {/* Avg Quality */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              Avg Quality Score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${
              stats.avgScore >= 88 ? 'text-green-500' :
              stats.avgScore >= 75 ? 'text-yellow-500' : 'text-red-500'
            }`}>
              {stats.avgScore.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">
              Target: 88%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Time Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Average Time Breakdown
                </CardTitle>
                <CardDescription>
                  Avg total: {formatDuration(stats.avgTime)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {timeBreakdown?.map((item) => (
                  <div key={item.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>{item.name}</span>
                      <span className="text-muted-foreground">{formatDuration(item.time)}</span>
                    </div>
                    <Progress value={item.percent} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quality Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Quality Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Excellent (≥88%)</span>
                    <span className="font-medium text-green-500">
                      {filteredMetrics.filter(m => m.overallScore >= 88).length}
                    </span>
                  </div>
                  <Progress 
                    value={(filteredMetrics.filter(m => m.overallScore >= 88).length / Math.max(filteredMetrics.length, 1)) * 100} 
                    className="h-2 bg-green-100"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Good (75-87%)</span>
                    <span className="font-medium text-yellow-500">
                      {filteredMetrics.filter(m => m.overallScore >= 75 && m.overallScore < 88).length}
                    </span>
                  </div>
                  <Progress 
                    value={(filteredMetrics.filter(m => m.overallScore >= 75 && m.overallScore < 88).length / Math.max(filteredMetrics.length, 1)) * 100} 
                    className="h-2 bg-yellow-100"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Needs Work (&lt;75%)</span>
                    <span className="font-medium text-red-500">
                      {filteredMetrics.filter(m => m.overallScore < 75).length}
                    </span>
                  </div>
                  <Progress 
                    value={(filteredMetrics.filter(m => m.overallScore < 75).length / Math.max(filteredMetrics.length, 1)) * 100} 
                    className="h-2 bg-red-100"
                  />
                </div>
                <Separator />
                <div className="text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Avg regenerations per article:</span>
                    <span>{(stats.totalRegenerations / Math.max(stats.totalArticles, 1)).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg word count:</span>
                    <span>{Math.round(stats.avgWordCount)} words</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="mt-4 space-y-4">
          {/* Model Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Cost by Model</CardTitle>
              <CardDescription>Token usage and costs per AI model</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modelUsage.map((model) => (
                  <div key={model.model} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-sm">{model.model}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {model.calls} calls
                        </Badge>
                      </div>
                      <span className="font-bold">{formatCurrency(model.cost)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatNumber(model.tokens)} tokens</span>
                      <span>
                        {formatCurrency(model.cost / model.calls)} avg/call
                      </span>
                    </div>
                    <Progress 
                      value={(model.cost / stats.totalCost) * 100} 
                      className="h-1.5 mt-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cost Projection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Cost Projection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground">Daily (est)</div>
                  <div className="text-lg font-bold">
                    {formatCurrency(stats.totalCost / Math.max(filteredMetrics.length, 1) * 10)}
                  </div>
                  <div className="text-xs text-muted-foreground">~10 articles</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground">Weekly (est)</div>
                  <div className="text-lg font-bold">
                    {formatCurrency(stats.totalCost / Math.max(filteredMetrics.length, 1) * 50)}
                  </div>
                  <div className="text-xs text-muted-foreground">~50 articles</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground">Monthly (est)</div>
                  <div className="text-lg font-bold">
                    {formatCurrency(stats.totalCost / Math.max(filteredMetrics.length, 1) * 200)}
                  </div>
                  <div className="text-xs text-muted-foreground">~200 articles</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Avg Generation Time</span>
                    </div>
                    <div className="text-2xl font-bold">{formatDuration(stats.avgTime)}</div>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Success Rate</span>
                    </div>
                    <div className="text-2xl font-bold text-green-500">{stats.successRate.toFixed(0)}%</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <RefreshCw className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">Regeneration Rate</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {((stats.totalRegenerations / Math.max(stats.totalArticles, 1))).toFixed(1)}x
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">Target Hit Rate</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {((filteredMetrics.filter(m => m.overallScore >= 88).length / Math.max(filteredMetrics.length, 1)) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Generation History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredMetrics.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No data for selected period</p>
                  </div>
                ) : (
                  filteredMetrics.map((metric) => (
                    <div key={metric.id} className="p-3 rounded-lg border hover:bg-muted/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-sm">{metric.articleTitle}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatTimeAgo(metric.timestamp)} • {metric.wordCount} words • {formatDuration(metric.totalTime)}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={
                            metric.overallScore >= 88 ? 'bg-green-100 text-green-800' :
                            metric.overallScore >= 75 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {metric.overallScore}%
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatCurrency(metric.totalCost)}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          Fact: {metric.factCheckScore}%
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Bias: {metric.biasScore}%
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {formatNumber(metric.totalTokens)} tokens
                        </Badge>
                        {metric.regenerations > 0 && (
                          <Badge variant="outline" className="text-xs text-orange-600">
                            {metric.regenerations} regen
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AnalyticsDashboard;
