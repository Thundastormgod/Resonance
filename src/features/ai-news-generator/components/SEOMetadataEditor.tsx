// SEO & Metadata Editor Component
// Allows editing meta title, description, keywords, and social sharing tags

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Search,
  Globe,
  Twitter,
  Facebook,
  Linkedin,
  Eye,
  AlertCircle,
  CheckCircle2,
  Copy,
  RefreshCw,
  Sparkles,
  Tag,
  X,
  Plus,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

// ============================================================
// TYPES
// ============================================================

export interface SEOMetadata {
  // Basic SEO
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  canonicalUrl?: string;
  
  // Open Graph (Facebook, LinkedIn)
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: 'article' | 'website' | 'blog';
  
  // Twitter Card
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  
  // Schema.org / Structured Data
  articleType?: 'NewsArticle' | 'Article' | 'BlogPosting' | 'Opinion';
  publishDate?: string;
  modifiedDate?: string;
  author?: string;
  
  // Technical
  noIndex?: boolean;
  noFollow?: boolean;
}

interface SEOScore {
  overall: number;
  title: { score: number; issues: string[]; suggestions: string[] };
  description: { score: number; issues: string[]; suggestions: string[] };
  keywords: { score: number; issues: string[]; suggestions: string[] };
  social: { score: number; issues: string[]; suggestions: string[] };
}

interface SEOMetadataEditorProps {
  articleTitle: string;
  articleExcerpt: string;
  articleBody: string;
  currentMetadata?: SEOMetadata;
  onMetadataChange: (metadata: SEOMetadata) => void;
  onGenerateSuggestions?: () => void;
}

// ============================================================
// CONSTANTS
// ============================================================

const TITLE_MIN_LENGTH = 30;
const TITLE_MAX_LENGTH = 60;
const TITLE_OPTIMAL_LENGTH = 55;

const DESC_MIN_LENGTH = 120;
const DESC_MAX_LENGTH = 160;
const DESC_OPTIMAL_LENGTH = 155;

const MIN_KEYWORDS = 3;
const MAX_KEYWORDS = 10;
const OPTIMAL_KEYWORDS = 5;

// Common stop words to exclude from auto-generated keywords
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'that', 'this', 'these', 'those', 'it', 'its', 'they', 'them',
  'their', 'he', 'she', 'him', 'her', 'we', 'us', 'our', 'you', 'your',
  'not', 'no', 'nor', 'so', 'than', 'too', 'very', 'just', 'also', 'only',
]);

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function extractKeywords(text: string, limit: number = 10): string[] {
  // Simple keyword extraction - count word frequency
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !STOP_WORDS.has(word));

  const frequency: Record<string, number> = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function calculateSEOScore(metadata: SEOMetadata, articleBody: string): SEOScore {
  const scores: SEOScore = {
    overall: 0,
    title: { score: 0, issues: [], suggestions: [] },
    description: { score: 0, issues: [], suggestions: [] },
    keywords: { score: 0, issues: [], suggestions: [] },
    social: { score: 0, issues: [], suggestions: [] },
  };

  // Title scoring
  const titleLen = metadata.metaTitle.length;
  if (titleLen === 0) {
    scores.title.score = 0;
    scores.title.issues.push('Meta title is empty');
    scores.title.suggestions.push('Add a compelling meta title for search results');
  } else if (titleLen < TITLE_MIN_LENGTH) {
    scores.title.score = 40;
    scores.title.issues.push(`Title too short (${titleLen}/${TITLE_MIN_LENGTH} min chars)`);
    scores.title.suggestions.push('Add more descriptive words to your title');
  } else if (titleLen > TITLE_MAX_LENGTH) {
    scores.title.score = 60;
    scores.title.issues.push(`Title too long (${titleLen}/${TITLE_MAX_LENGTH} max chars) - may be truncated`);
    scores.title.suggestions.push('Shorten your title to avoid truncation in search results');
  } else {
    scores.title.score = titleLen <= TITLE_OPTIMAL_LENGTH ? 100 : 85;
  }

  // Description scoring
  const descLen = metadata.metaDescription.length;
  if (descLen === 0) {
    scores.description.score = 0;
    scores.description.issues.push('Meta description is empty');
    scores.description.suggestions.push('Add a compelling description for search snippets');
  } else if (descLen < DESC_MIN_LENGTH) {
    scores.description.score = 40;
    scores.description.issues.push(`Description too short (${descLen}/${DESC_MIN_LENGTH} min chars)`);
    scores.description.suggestions.push('Expand your description to improve click-through rates');
  } else if (descLen > DESC_MAX_LENGTH) {
    scores.description.score = 60;
    scores.description.issues.push(`Description too long (${descLen}/${DESC_MAX_LENGTH} max chars)`);
    scores.description.suggestions.push('Shorten to prevent truncation in search results');
  } else {
    scores.description.score = descLen <= DESC_OPTIMAL_LENGTH ? 100 : 85;
  }

  // Keywords scoring
  const keywordCount = metadata.keywords.length;
  if (keywordCount === 0) {
    scores.keywords.score = 0;
    scores.keywords.issues.push('No keywords defined');
    scores.keywords.suggestions.push('Add relevant keywords to help categorize your content');
  } else if (keywordCount < MIN_KEYWORDS) {
    scores.keywords.score = 50;
    scores.keywords.issues.push(`Too few keywords (${keywordCount}/${MIN_KEYWORDS} min)`);
    scores.keywords.suggestions.push('Add more relevant keywords for better SEO');
  } else if (keywordCount > MAX_KEYWORDS) {
    scores.keywords.score = 70;
    scores.keywords.issues.push(`Too many keywords (${keywordCount}/${MAX_KEYWORDS} max)`);
    scores.keywords.suggestions.push('Remove less relevant keywords to avoid keyword stuffing');
  } else {
    // Check if keywords appear in content
    const bodyLower = articleBody.toLowerCase();
    const keywordsInBody = metadata.keywords.filter(k => 
      bodyLower.includes(k.toLowerCase())
    ).length;
    const ratio = keywordsInBody / keywordCount;
    scores.keywords.score = Math.round(60 + (ratio * 40));
    
    if (ratio < 0.5) {
      scores.keywords.suggestions.push('Some keywords don\'t appear in your article content');
    }
  }

  // Social scoring
  let socialScore = 0;
  let socialChecks = 0;

  if (metadata.ogTitle) { socialScore += 25; socialChecks++; }
  else scores.social.suggestions.push('Add Open Graph title for better social sharing');

  if (metadata.ogDescription) { socialScore += 25; socialChecks++; }
  else scores.social.suggestions.push('Add Open Graph description');

  if (metadata.ogImage) { socialScore += 25; socialChecks++; }
  else scores.social.suggestions.push('Add social sharing image for higher engagement');

  if (metadata.twitterCard) { socialScore += 25; socialChecks++; }
  else scores.social.suggestions.push('Configure Twitter card settings');

  scores.social.score = socialScore;
  if (socialChecks < 4) {
    scores.social.issues.push(`Missing ${4 - socialChecks} social media meta tag(s)`);
  }

  // Calculate overall
  scores.overall = Math.round(
    (scores.title.score * 0.3) +
    (scores.description.score * 0.3) +
    (scores.keywords.score * 0.25) +
    (scores.social.score * 0.15)
  );

  return scores;
}

// ============================================================
// COMPONENT
// ============================================================

export function SEOMetadataEditor({
  articleTitle,
  articleExcerpt,
  articleBody,
  currentMetadata,
  onMetadataChange,
  onGenerateSuggestions,
}: SEOMetadataEditorProps) {
  // Initialize with defaults or current values
  const [metadata, setMetadata] = useState<SEOMetadata>(() => ({
    metaTitle: currentMetadata?.metaTitle || articleTitle,
    metaDescription: currentMetadata?.metaDescription || articleExcerpt,
    keywords: currentMetadata?.keywords || [],
    ogTitle: currentMetadata?.ogTitle || '',
    ogDescription: currentMetadata?.ogDescription || '',
    ogImage: currentMetadata?.ogImage || '',
    ogType: currentMetadata?.ogType || 'article',
    twitterTitle: currentMetadata?.twitterTitle || '',
    twitterDescription: currentMetadata?.twitterDescription || '',
    twitterImage: currentMetadata?.twitterImage || '',
    twitterCard: currentMetadata?.twitterCard || 'summary_large_image',
    articleType: currentMetadata?.articleType || 'NewsArticle',
    noIndex: currentMetadata?.noIndex || false,
    noFollow: currentMetadata?.noFollow || false,
  }));

  const [newKeyword, setNewKeyword] = useState('');
  const [useSameForSocial, setUseSameForSocial] = useState(true);
  const [previewPlatform, setPreviewPlatform] = useState<'google' | 'twitter' | 'facebook'>('google');

  // Calculate SEO score
  const seoScore = useMemo(() => 
    calculateSEOScore(metadata, articleBody),
    [metadata, articleBody]
  );

  // Auto-suggested keywords based on content
  const suggestedKeywords = useMemo(() => 
    extractKeywords(`${articleTitle} ${articleExcerpt} ${articleBody}`, 15),
    [articleTitle, articleExcerpt, articleBody]
  );

  // Propagate changes
  useEffect(() => {
    onMetadataChange(metadata);
  }, [metadata, onMetadataChange]);

  // Sync social fields if enabled
  useEffect(() => {
    if (useSameForSocial) {
      setMetadata(prev => ({
        ...prev,
        ogTitle: prev.metaTitle,
        ogDescription: prev.metaDescription,
        twitterTitle: prev.metaTitle,
        twitterDescription: prev.metaDescription,
      }));
    }
  }, [useSameForSocial, metadata.metaTitle, metadata.metaDescription]);

  const updateField = useCallback(<K extends keyof SEOMetadata>(
    field: K,
    value: SEOMetadata[K]
  ) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
  }, []);

  const addKeyword = useCallback((keyword: string) => {
    const cleaned = keyword.trim().toLowerCase();
    if (cleaned && !metadata.keywords.includes(cleaned)) {
      updateField('keywords', [...metadata.keywords, cleaned]);
    }
    setNewKeyword('');
  }, [metadata.keywords, updateField]);

  const removeKeyword = useCallback((keyword: string) => {
    updateField('keywords', metadata.keywords.filter(k => k !== keyword));
  }, [metadata.keywords, updateField]);

  const autoGenerateKeywords = useCallback(() => {
    // Take top 5 suggested that aren't already added
    const newKeywords = suggestedKeywords
      .filter(k => !metadata.keywords.includes(k))
      .slice(0, OPTIMAL_KEYWORDS);
    updateField('keywords', [...metadata.keywords, ...newKeywords].slice(0, MAX_KEYWORDS));
  }, [suggestedKeywords, metadata.keywords, updateField]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* SEO Score Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              SEO Score
            </CardTitle>
            <div className={`text-3xl font-bold ${getScoreColor(seoScore.overall)}`}>
              {seoScore.overall}%
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Score breakdown */}
            {[
              { label: 'Title', score: seoScore.title.score, weight: '30%' },
              { label: 'Description', score: seoScore.description.score, weight: '30%' },
              { label: 'Keywords', score: seoScore.keywords.score, weight: '25%' },
              { label: 'Social', score: seoScore.social.score, weight: '15%' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-sm w-24">{item.label}</span>
                <div className="flex-1 relative h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`absolute left-0 top-0 h-full ${getProgressColor(item.score)} transition-all`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
                <span className={`text-sm font-medium w-10 ${getScoreColor(item.score)}`}>
                  {item.score}%
                </span>
                <span className="text-xs text-muted-foreground w-8">{item.weight}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Editor */}
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic SEO</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Basic SEO Tab */}
        <TabsContent value="basic" className="space-y-4 mt-4">
          {/* Meta Title */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="metaTitle">Meta Title</Label>
              <span className={`text-xs ${
                metadata.metaTitle.length > TITLE_MAX_LENGTH 
                  ? 'text-red-500' 
                  : metadata.metaTitle.length >= TITLE_MIN_LENGTH 
                    ? 'text-green-500' 
                    : 'text-yellow-500'
              }`}>
                {metadata.metaTitle.length}/{TITLE_OPTIMAL_LENGTH} chars
              </span>
            </div>
            <Input
              id="metaTitle"
              value={metadata.metaTitle}
              onChange={(e) => updateField('metaTitle', e.target.value)}
              placeholder="Enter meta title..."
              className={metadata.metaTitle.length > TITLE_MAX_LENGTH ? 'border-red-500' : ''}
            />
            {seoScore.title.issues.length > 0 && (
              <div className="flex items-start gap-2 text-xs text-amber-600">
                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{seoScore.title.issues[0]}</span>
              </div>
            )}
          </div>

          {/* Meta Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="metaDesc">Meta Description</Label>
              <span className={`text-xs ${
                metadata.metaDescription.length > DESC_MAX_LENGTH 
                  ? 'text-red-500' 
                  : metadata.metaDescription.length >= DESC_MIN_LENGTH 
                    ? 'text-green-500' 
                    : 'text-yellow-500'
              }`}>
                {metadata.metaDescription.length}/{DESC_OPTIMAL_LENGTH} chars
              </span>
            </div>
            <Textarea
              id="metaDesc"
              value={metadata.metaDescription}
              onChange={(e) => updateField('metaDescription', e.target.value)}
              placeholder="Enter meta description..."
              rows={3}
              className={metadata.metaDescription.length > DESC_MAX_LENGTH ? 'border-red-500' : ''}
            />
            {seoScore.description.suggestions.length > 0 && (
              <div className="flex items-start gap-2 text-xs text-blue-600">
                <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{seoScore.description.suggestions[0]}</span>
              </div>
            )}
          </div>

          {/* Canonical URL */}
          <div className="space-y-2">
            <Label htmlFor="canonical">Canonical URL (optional)</Label>
            <Input
              id="canonical"
              value={metadata.canonicalUrl || ''}
              onChange={(e) => updateField('canonicalUrl', e.target.value)}
              placeholder="https://example.com/article-slug"
            />
            <p className="text-xs text-muted-foreground">
              Set if this content exists at another URL to avoid duplicate content issues
            </p>
          </div>

          {/* Schema Type */}
          <div className="space-y-2">
            <Label>Article Type (Schema.org)</Label>
            <div className="flex flex-wrap gap-2">
              {(['NewsArticle', 'Article', 'BlogPosting', 'Opinion'] as const).map((type) => (
                <Badge
                  key={type}
                  variant={metadata.articleType === type ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => updateField('articleType', type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          {/* Indexing Controls */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <Label>Search Engine Indexing</Label>
              <p className="text-xs text-muted-foreground">
                Control how search engines handle this page
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={!metadata.noIndex}
                  onCheckedChange={(checked) => updateField('noIndex', !checked)}
                />
                <span className="text-sm">Index</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={!metadata.noFollow}
                  onCheckedChange={(checked) => updateField('noFollow', !checked)}
                />
                <span className="text-sm">Follow</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Keywords Tab */}
        <TabsContent value="keywords" className="space-y-4 mt-4">
          {/* Current Keywords */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Keywords ({metadata.keywords.length}/{MAX_KEYWORDS})
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={autoGenerateKeywords}
                  disabled={metadata.keywords.length >= MAX_KEYWORDS}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Auto-Generate
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Add new keyword */}
              <div className="flex gap-2 mb-4">
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Add keyword..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addKeyword(newKeyword);
                    }
                  }}
                />
                <Button 
                  onClick={() => addKeyword(newKeyword)}
                  disabled={!newKeyword.trim() || metadata.keywords.length >= MAX_KEYWORDS}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Current keywords */}
              <div className="flex flex-wrap gap-2 mb-4">
                {metadata.keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="gap-1 pr-1">
                    {keyword}
                    <button
                      onClick={() => removeKeyword(keyword)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {metadata.keywords.length === 0 && (
                  <span className="text-sm text-muted-foreground">No keywords added yet</span>
                )}
              </div>

              {/* Keyword stats */}
              {seoScore.keywords.issues.length > 0 && (
                <div className="p-2 rounded bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-700 dark:text-amber-300">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  {seoScore.keywords.issues[0]}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Suggested Keywords */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Suggested Keywords</CardTitle>
              <CardDescription>Based on your article content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {suggestedKeywords
                  .filter(k => !metadata.keywords.includes(k))
                  .map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => addKeyword(keyword)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {keyword}
                    </Badge>
                  ))}
                {suggestedKeywords.every(k => metadata.keywords.includes(k)) && (
                  <span className="text-sm text-muted-foreground">
                    All suggested keywords have been added
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Tab */}
        <TabsContent value="social" className="space-y-4 mt-4">
          {/* Sync toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <Label>Use Same as Basic SEO</Label>
              <p className="text-xs text-muted-foreground">
                Sync title and description with meta tags
              </p>
            </div>
            <Switch
              checked={useSameForSocial}
              onCheckedChange={setUseSameForSocial}
            />
          </div>

          <Separator />

          {/* Open Graph */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Facebook className="h-4 w-4" />
                Open Graph (Facebook, LinkedIn)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>OG Title</Label>
                <Input
                  value={metadata.ogTitle || ''}
                  onChange={(e) => updateField('ogTitle', e.target.value)}
                  placeholder="Title for social sharing..."
                  disabled={useSameForSocial}
                />
              </div>
              <div className="space-y-2">
                <Label>OG Description</Label>
                <Textarea
                  value={metadata.ogDescription || ''}
                  onChange={(e) => updateField('ogDescription', e.target.value)}
                  placeholder="Description for social sharing..."
                  rows={2}
                  disabled={useSameForSocial}
                />
              </div>
              <div className="space-y-2">
                <Label>OG Image URL</Label>
                <Input
                  value={metadata.ogImage || ''}
                  onChange={(e) => updateField('ogImage', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: 1200x630 pixels
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Twitter Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Twitter className="h-4 w-4" />
                Twitter Card
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Card Type</Label>
                <div className="flex gap-2">
                  {(['summary', 'summary_large_image'] as const).map((type) => (
                    <Badge
                      key={type}
                      variant={metadata.twitterCard === type ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => updateField('twitterCard', type)}
                    >
                      {type === 'summary' ? 'Summary' : 'Large Image'}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Twitter Title</Label>
                <Input
                  value={metadata.twitterTitle || ''}
                  onChange={(e) => updateField('twitterTitle', e.target.value)}
                  placeholder="Title for Twitter..."
                  disabled={useSameForSocial}
                />
              </div>
              <div className="space-y-2">
                <Label>Twitter Image URL</Label>
                <Input
                  value={metadata.twitterImage || ''}
                  onChange={(e) => updateField('twitterImage', e.target.value)}
                  placeholder="https://example.com/twitter-image.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: 1200x675 pixels for large image card
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4 mt-4">
          <div className="flex gap-2 mb-4">
            {(['google', 'twitter', 'facebook'] as const).map((platform) => (
              <Button
                key={platform}
                variant={previewPlatform === platform ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewPlatform(platform)}
              >
                {platform === 'google' && <Search className="h-4 w-4 mr-1" />}
                {platform === 'twitter' && <Twitter className="h-4 w-4 mr-1" />}
                {platform === 'facebook' && <Facebook className="h-4 w-4 mr-1" />}
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </Button>
            ))}
          </div>

          {/* Google Preview */}
          {previewPlatform === 'google' && (
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="max-w-[600px]">
                  {/* URL */}
                  <div className="flex items-center gap-1 text-sm text-green-700 mb-1">
                    <Globe className="h-3 w-3" />
                    <span>yoursite.com</span>
                    <span className="text-muted-foreground">› article</span>
                  </div>
                  {/* Title */}
                  <h3 className="text-blue-600 text-xl hover:underline cursor-pointer mb-1 line-clamp-1">
                    {metadata.metaTitle || 'No title set'}
                  </h3>
                  {/* Description */}
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {metadata.metaDescription || 'No description set'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Twitter Preview */}
          {previewPlatform === 'twitter' && (
            <Card className="overflow-hidden max-w-[500px]">
              <div className="relative">
                {metadata.twitterImage || metadata.ogImage ? (
                  <img 
                    src={metadata.twitterImage || metadata.ogImage}
                    alt="Preview"
                    className={`w-full object-cover ${
                      metadata.twitterCard === 'summary_large_image' ? 'h-64' : 'h-32'
                    }`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className={`w-full bg-muted flex items-center justify-center ${
                    metadata.twitterCard === 'summary_large_image' ? 'h-64' : 'h-32'
                  }`}>
                    <span className="text-muted-foreground text-sm">No image set</span>
                  </div>
                )}
              </div>
              <CardContent className="p-3 border-t">
                <h4 className="font-semibold text-sm line-clamp-1">
                  {metadata.twitterTitle || metadata.metaTitle || 'No title'}
                </h4>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {metadata.twitterDescription || metadata.metaDescription || 'No description'}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <Globe className="h-3 w-3" />
                  <span>yoursite.com</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Facebook Preview */}
          {previewPlatform === 'facebook' && (
            <Card className="overflow-hidden max-w-[500px]">
              <div className="relative">
                {metadata.ogImage ? (
                  <img 
                    src={metadata.ogImage}
                    alt="Preview"
                    className="w-full h-64 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-64 bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">No image set</span>
                  </div>
                )}
              </div>
              <CardContent className="p-3 bg-[#f0f2f5] dark:bg-gray-800 border-t">
                <div className="text-xs text-muted-foreground uppercase mb-1">
                  yoursite.com
                </div>
                <h4 className="font-semibold line-clamp-1">
                  {metadata.ogTitle || metadata.metaTitle || 'No title'}
                </h4>
                <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                  {metadata.ogDescription || metadata.metaDescription || 'No description'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Quick tips */}
          <div className="p-4 rounded-lg bg-muted/50">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Preview Tips
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Google titles may be truncated after ~60 characters</li>
              <li>• Social platforms favor images with specific aspect ratios</li>
              <li>• Twitter large image cards get 40% more engagement</li>
              <li>• Facebook requires og:image minimum of 200x200px</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Copy all metadata as JSON
              navigator.clipboard.writeText(JSON.stringify(metadata, null, 2));
            }}
          >
            <Copy className="h-4 w-4 mr-1" />
            Copy JSON
          </Button>
          {onGenerateSuggestions && (
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerateSuggestions}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              AI Suggestions
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={seoScore.overall >= 80 ? 'default' : 'secondary'}>
            {seoScore.overall >= 80 ? (
              <><CheckCircle2 className="h-3 w-3 mr-1" /> SEO Ready</>
            ) : (
              <><AlertCircle className="h-3 w-3 mr-1" /> Needs Work</>
            )}
          </Badge>
        </div>
      </div>
    </div>
  );
}

export default SEOMetadataEditor;
