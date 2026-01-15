// Article Editor Component
// Rich text editing for AI-generated articles with issue highlighting and suggestions

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Edit3,
  Save,
  Undo2,
  Redo2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Link2,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  FileText,
  Shield,
  Scale,
  Lightbulb,
  X,
  Check,
  Type,
  AlignLeft,
  AlignCenter,
  AlignJustify,
  Heading1,
  Heading2,
  Heading3,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SourceAttribution, SourceInfo, CitationStyle } from './SourceAttribution';
import type {
  GeneratedArticleSample,
  FactCheckResult,
  BiasAnalysisResult,
  FactCheckClaim,
  BiasInstance,
} from '../types';

// ============================================================
// TYPES
// ============================================================

interface RegenerateOptions {
  feedback: string;
  paragraphIndex?: number;
  newStyle?: string;
  newTone?: string;
}

interface ArticleEditorProps {
  article: GeneratedArticleSample;
  factCheckResult?: FactCheckResult;
  biasResult?: BiasAnalysisResult;
  onSave: (updates: Partial<GeneratedArticleSample>) => void;
  onRegenerate?: (options: RegenerateOptions) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface EditHistory {
  title: string;
  excerpt: string;
  body: string;
  timestamp: number;
}

interface IssueHighlight {
  type: 'fact-check' | 'bias';
  severity: 'critical' | 'major' | 'minor' | 'informational';
  text: string;
  location: string;
  explanation: string;
  suggestion?: string;
  paragraphIndex: number;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function parseIssuesFromResults(
  factCheckResult?: FactCheckResult,
  biasResult?: BiasAnalysisResult,
  bodyParagraphs?: string[]
): IssueHighlight[] {
  const issues: IssueHighlight[] = [];
  
  // Parse fact-check claims
  if (factCheckResult?.claims) {
    factCheckResult.claims.forEach(claim => {
      if (claim.status !== 'verified') {
        // Find paragraph index from location
        let paragraphIndex = 0;
        if (claim.location) {
          const match = claim.location.match(/paragraph\s*(\d+)/i);
          if (match) {
            paragraphIndex = parseInt(match[1], 10) - 1;
          }
        }
        
        issues.push({
          type: 'fact-check',
          severity: claim.severity || 'minor',
          text: claim.originalText || claim.claim,
          location: claim.location,
          explanation: claim.explanation,
          suggestion: claim.suggestedCorrection,
          paragraphIndex: Math.max(0, paragraphIndex),
        });
      }
    });
  }
  
  // Parse bias instances
  if (biasResult?.instances) {
    biasResult.instances.forEach(instance => {
      let paragraphIndex = 0;
      if (instance.location) {
        const match = instance.location.match(/paragraph\s*(\d+)/i);
        if (match) {
          paragraphIndex = parseInt(match[1], 10) - 1;
        }
      }
      
      // Map bias level to severity
      const severityMap: Record<string, IssueHighlight['severity']> = {
        'severe': 'critical',
        'high': 'critical',
        'moderate': 'major',
        'low': 'minor',
        'minimal': 'informational',
        'none': 'informational',
      };
      
      issues.push({
        type: 'bias',
        severity: severityMap[instance.level] || 'minor',
        text: instance.text,
        location: instance.location,
        explanation: instance.explanation,
        suggestion: instance.suggestedRevision,
        paragraphIndex: Math.max(0, paragraphIndex),
      });
    });
  }
  
  return issues;
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-100 border-red-500 dark:bg-red-900/30';
    case 'major': return 'bg-orange-100 border-orange-500 dark:bg-orange-900/30';
    case 'minor': return 'bg-yellow-100 border-yellow-500 dark:bg-yellow-900/30';
    default: return 'bg-blue-100 border-blue-500 dark:bg-blue-900/30';
  }
}

function getSeverityBadgeColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-500';
    case 'major': return 'bg-orange-500';
    case 'minor': return 'bg-yellow-500';
    default: return 'bg-blue-500';
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function ArticleEditor({
  article,
  factCheckResult,
  biasResult,
  onSave,
  onRegenerate,
  onContinue,
  onBack,
}: ArticleEditorProps) {
  // Editor state
  const [title, setTitle] = useState(article.title);
  const [excerpt, setExcerpt] = useState(article.excerpt);
  const [body, setBody] = useState(article.body);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showIssues, setShowIssues] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // History for undo/redo
  const [history, setHistory] = useState<EditHistory[]>([
    { title: article.title, excerpt: article.excerpt, body: article.body, timestamp: Date.now() }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Regeneration state
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [regenerateFeedback, setRegenerateFeedback] = useState('');
  const [regenerateParagraphIndex, setRegenerateParagraphIndex] = useState<number | undefined>();
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [regenerateStyle, setRegenerateStyle] = useState<string | undefined>();
  const [regenerateTone, setRegenerateTone] = useState<string | undefined>();
  
  // Split body into paragraphs
  const paragraphs = useMemo(() => 
    body.split('\n').filter(p => p.trim()),
    [body]
  );
  
  // Parse issues from results
  const issues = useMemo(() => 
    parseIssuesFromResults(factCheckResult, biasResult, paragraphs),
    [factCheckResult, biasResult, paragraphs]
  );
  
  // Group issues by paragraph
  const issuesByParagraph = useMemo(() => {
    const grouped: Record<number, IssueHighlight[]> = {};
    issues.forEach(issue => {
      if (!grouped[issue.paragraphIndex]) {
        grouped[issue.paragraphIndex] = [];
      }
      grouped[issue.paragraphIndex].push(issue);
    });
    return grouped;
  }, [issues]);
  
  // Count issues by type
  const issueCounts = useMemo(() => ({
    total: issues.length,
    critical: issues.filter(i => i.severity === 'critical').length,
    major: issues.filter(i => i.severity === 'major').length,
    minor: issues.filter(i => i.severity === 'minor').length,
    factCheck: issues.filter(i => i.type === 'fact-check').length,
    bias: issues.filter(i => i.type === 'bias').length,
  }), [issues]);
  
  // Convert article sources to SourceInfo format
  const sourcesForAttribution = useMemo((): SourceInfo[] => {
    const urls = article.sourceUrls || [];
    const headlines = article.sourceHeadlines || [];
    
    return urls.map((url, index) => {
      // Extract source name from URL
      let sourceName = 'Unknown Source';
      try {
        const urlObj = new URL(url);
        sourceName = urlObj.hostname.replace('www.', '').split('.')[0];
        sourceName = sourceName.charAt(0).toUpperCase() + sourceName.slice(1);
      } catch {
        // Keep default
      }
      
      return {
        id: `source-${index}`,
        title: headlines[index] || `Source ${index + 1}`,
        url,
        source: sourceName,
        publishedAt: article.generatedAt || new Date().toISOString(),
        verificationStatus: factCheckResult?.overallScore && factCheckResult.overallScore >= 80 
          ? 'verified' 
          : factCheckResult?.overallScore && factCheckResult.overallScore >= 60 
            ? 'unverified' 
            : undefined,
      };
    });
  }, [article.sourceUrls, article.sourceHeadlines, article.generatedAt, factCheckResult?.overallScore]);
  
  // Handle citation insertion
  const handleInsertCitation = useCallback((citation: string, sourceIndex: number) => {
    // Insert citation at the end of the body or at cursor position
    // For now, we'll add it to the end
    const newBody = body + ' ' + citation;
    setBody(newBody);
    setHasUnsavedChanges(true);
  }, [body]);
  
  // Add to history
  const addToHistory = useCallback((newTitle: string, newExcerpt: string, newBody: string) => {
    const newEntry: EditHistory = {
      title: newTitle,
      excerpt: newExcerpt,
      body: newBody,
      timestamp: Date.now(),
    };
    
    setHistory(prev => {
      // Remove any future history if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, newEntry];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);
  
  // Handle text changes
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setHasUnsavedChanges(true);
  }, []);
  
  const handleExcerptChange = useCallback((newExcerpt: string) => {
    setExcerpt(newExcerpt);
    setHasUnsavedChanges(true);
  }, []);
  
  const handleBodyChange = useCallback((newBody: string) => {
    setBody(newBody);
    setHasUnsavedChanges(true);
  }, []);
  
  // Handle paragraph edit
  const handleParagraphEdit = useCallback((index: number, newText: string) => {
    const newParagraphs = [...paragraphs];
    newParagraphs[index] = newText;
    const newBody = newParagraphs.join('\n\n');
    setBody(newBody);
    setHasUnsavedChanges(true);
  }, [paragraphs]);
  
  // Apply suggestion
  const applySuggestion = useCallback((issue: IssueHighlight) => {
    if (!issue.suggestion) {
      console.warn('[ArticleEditor] No suggestion available for this issue');
      return;
    }
    
    console.log(`[ArticleEditor] Applying suggestion for ${issue.type}`);
    console.log(`[ArticleEditor] Original text: "${issue.text}"`);
    console.log(`[ArticleEditor] Suggested: "${issue.suggestion}"`);
    
    // Try exact match first
    let newBody = body.replace(issue.text, issue.suggestion);
    
    if (newBody !== body) {
      console.log('[ArticleEditor] Exact match found and replaced');
      setBody(newBody);
      setHasUnsavedChanges(true);
      addToHistory(title, excerpt, newBody);
      return;
    }
    
    // Try case-insensitive match
    const escapedText = issue.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedText, 'gi');
    newBody = body.replace(regex, issue.suggestion);
    
    if (newBody !== body) {
      console.log('[ArticleEditor] Case-insensitive match found and replaced');
      setBody(newBody);
      setHasUnsavedChanges(true);
      addToHistory(title, excerpt, newBody);
      return;
    }
    
    // Try to find partial match using key words
    const words = issue.text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    if (words.length > 0) {
      const keyWords = words.slice(0, 4).join('|');
      const fuzzyRegex = new RegExp(`[^.]*?(${keyWords})[^.]*\\.?`, 'gi');
      const match = body.match(fuzzyRegex);
      
      if (match && match[0]) {
        console.log(`[ArticleEditor] Fuzzy match found: "${match[0].substring(0, 80)}..."`);
        newBody = body.replace(match[0], issue.suggestion);
        
        if (newBody !== body) {
          setBody(newBody);
          setHasUnsavedChanges(true);
          addToHistory(title, excerpt, newBody);
          return;
        }
      }
    }
    
    console.warn('[ArticleEditor] Could not find text to replace');
    console.warn(`[ArticleEditor] Issue text: "${issue.text}"`);
    // Alert user if we couldn't find the text
    alert('Could not find the exact text to replace. The article content may have been modified. Please apply the suggestion manually.');
  }, [body, title, excerpt, addToHistory]);
  
  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setTitle(prevState.title);
      setExcerpt(prevState.excerpt);
      setBody(prevState.body);
      setHistoryIndex(prev => prev - 1);
      setHasUnsavedChanges(true);
    }
  }, [history, historyIndex]);
  
  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setTitle(nextState.title);
      setExcerpt(nextState.excerpt);
      setBody(nextState.body);
      setHistoryIndex(prev => prev + 1);
      setHasUnsavedChanges(true);
    }
  }, [history, historyIndex]);
  
  // Save changes
  const handleSave = useCallback(() => {
    const wordCount = body.split(/\s+/).filter(w => w.length > 0).length;
    const readingTime = Math.ceil(wordCount / 200);
    
    onSave({
      title,
      excerpt,
      body,
      wordCount,
      readingTime,
    });
    
    addToHistory(title, excerpt, body);
    setHasUnsavedChanges(false);
  }, [title, excerpt, body, onSave, addToHistory]);
  
  // Handle regeneration
  const handleRegenerate = useCallback(() => {
    if (onRegenerate && regenerateFeedback) {
      onRegenerate({
        feedback: regenerateFeedback,
        paragraphIndex: regenerateParagraphIndex,
        newStyle: regenerateStyle,
        newTone: regenerateTone,
      });
      setRegenerateDialogOpen(false);
      setRegenerateFeedback('');
      setRegenerateParagraphIndex(undefined);
      setShowAdvancedOptions(false);
      setRegenerateStyle(undefined);
      setRegenerateTone(undefined);
    }
  }, [onRegenerate, regenerateFeedback, regenerateParagraphIndex, regenerateStyle, regenerateTone]);
  
  // Open regenerate dialog for specific paragraph
  const openRegenerateForParagraph = useCallback((index: number) => {
    setRegenerateParagraphIndex(index);
    setRegenerateDialogOpen(true);
  }, []);
  
  // Word count
  const wordCount = useMemo(() => 
    body.split(/\s+/).filter(w => w.length > 0).length,
    [body]
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      {/* Toolbar */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUndo}
                      disabled={historyIndex === 0}
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Undo</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRedo}
                      disabled={historyIndex === history.length - 1}
                    >
                      <Redo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Redo</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <Separator orientation="vertical" className="h-6" />
              
              <Button
                variant={isPreviewMode ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
              >
                {isPreviewMode ? (
                  <>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </>
                )}
              </Button>
              
              <Button
                variant={showIssues ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowIssues(!showIssues)}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Issues ({issueCounts.total})
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {wordCount} words
              </span>
              
              {hasUnsavedChanges && (
                <Badge variant="outline" className="text-amber-500 border-amber-500">
                  Unsaved
                </Badge>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              
              {onRegenerate && (
                <Dialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Regenerate Article</DialogTitle>
                      <DialogDescription>
                        {regenerateParagraphIndex !== undefined
                          ? `Regenerate paragraph ${regenerateParagraphIndex + 1} with your feedback`
                          : 'Regenerate the entire article with your feedback'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Feedback / Instructions</Label>
                        <Textarea
                          value={regenerateFeedback}
                          onChange={(e) => setRegenerateFeedback(e.target.value)}
                          placeholder="e.g., Make it more formal, add more statistics, fix the factual errors..."
                          rows={4}
                        />
                      </div>
                      
                      {regenerateParagraphIndex !== undefined && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Current paragraph:</p>
                          <p className="text-sm">{paragraphs[regenerateParagraphIndex]?.substring(0, 200)}...</p>
                        </div>
                      )}
                      
                      {/* Advanced Options (only for full article regeneration) */}
                      {regenerateParagraphIndex === undefined && (
                        <>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              Advanced Options
                            </Label>
                            <Switch
                              checked={showAdvancedOptions}
                              onCheckedChange={setShowAdvancedOptions}
                            />
                          </div>
                          
                          {showAdvancedOptions && (
                            <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Style</Label>
                                  <Select value={regenerateStyle} onValueChange={setRegenerateStyle}>
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder={article.style || "Keep current"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="news-brief">News Brief</SelectItem>
                                      <SelectItem value="feature">Feature</SelectItem>
                                      <SelectItem value="analysis">Analysis</SelectItem>
                                      <SelectItem value="explainer">Explainer</SelectItem>
                                      <SelectItem value="opinion">Opinion</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Tone</Label>
                                  <Select value={regenerateTone} onValueChange={setRegenerateTone}>
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder={article.tone || "Keep current"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="balanced">Balanced</SelectItem>
                                      <SelectItem value="formal">Formal</SelectItem>
                                      <SelectItem value="conversational">Conversational</SelectItem>
                                      <SelectItem value="authoritative">Authoritative</SelectItem>
                                      <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Leave blank to keep current style/tone
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {
                        setRegenerateDialogOpen(false);
                        setShowAdvancedOptions(false);
                        setRegenerateStyle(undefined);
                        setRegenerateTone(undefined);
                      }}>
                        Cancel
                      </Button>
                      <Button onClick={handleRegenerate} disabled={!regenerateFeedback}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Regenerate
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issue Summary Banner */}
      {showIssues && issueCounts.total > 0 && (
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="font-medium">
                  {issueCounts.total} issue{issueCounts.total !== 1 ? 's' : ''} found
                </span>
                <div className="flex items-center gap-2">
                  {issueCounts.critical > 0 && (
                    <Badge className="bg-red-500">{issueCounts.critical} critical</Badge>
                  )}
                  {issueCounts.major > 0 && (
                    <Badge className="bg-orange-500">{issueCounts.major} major</Badge>
                  )}
                  {issueCounts.minor > 0 && (
                    <Badge className="bg-yellow-500 text-black">{issueCounts.minor} minor</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>{issueCounts.factCheck} fact issues</span>
                <Separator orientation="vertical" className="h-4" />
                <Scale className="h-4 w-4" />
                <span>{issueCounts.bias} bias issues</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Editor Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-4">
          {/* Title */}
          <Card>
            <CardContent className="py-4">
              <Label className="text-xs text-muted-foreground mb-2 block">HEADLINE</Label>
              {isPreviewMode ? (
                <h1 className="text-2xl font-bold">{title}</h1>
              ) : (
                <Input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-xl font-bold border-none p-0 h-auto focus-visible:ring-0"
                  placeholder="Article headline..."
                />
              )}
            </CardContent>
          </Card>

          {/* Excerpt */}
          <Card>
            <CardContent className="py-4">
              <Label className="text-xs text-muted-foreground mb-2 block">EXCERPT / LEAD</Label>
              {isPreviewMode ? (
                <p className="text-muted-foreground italic">{excerpt}</p>
              ) : (
                <Textarea
                  value={excerpt}
                  onChange={(e) => handleExcerptChange(e.target.value)}
                  className="border-none p-0 resize-none focus-visible:ring-0 text-muted-foreground italic"
                  placeholder="Article excerpt..."
                  rows={2}
                />
              )}
            </CardContent>
          </Card>

          {/* Body - Paragraph by paragraph */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Article Body
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {paragraphs.map((paragraph, index) => {
                    const paragraphIssues = issuesByParagraph[index] || [];
                    const hasCritical = paragraphIssues.some(i => i.severity === 'critical');
                    const hasMajor = paragraphIssues.some(i => i.severity === 'major');
                    
                    return (
                      <div key={index} className="group relative">
                        {/* Paragraph number */}
                        <div className="absolute -left-8 top-0 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          {index + 1}
                        </div>
                        
                        {/* Issue indicators */}
                        {showIssues && paragraphIssues.length > 0 && (
                          <div className="absolute -left-2 top-0 flex flex-col gap-1">
                            {paragraphIssues.map((issue, i) => (
                              <Popover key={i}>
                                <PopoverTrigger asChild>
                                  <button
                                    className={`w-2 h-2 rounded-full ${getSeverityBadgeColor(issue.severity)} cursor-pointer hover:scale-125 transition-transform`}
                                  />
                                </PopoverTrigger>
                                <PopoverContent className="w-80" side="left">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      {issue.type === 'fact-check' ? (
                                        <Shield className="h-4 w-4 text-blue-500" />
                                      ) : (
                                        <Scale className="h-4 w-4 text-purple-500" />
                                      )}
                                      <Badge className={getSeverityBadgeColor(issue.severity)}>
                                        {issue.severity}
                                      </Badge>
                                    </div>
                                    <p className="text-sm font-medium">"{issue.text}"</p>
                                    <p className="text-sm text-muted-foreground">{issue.explanation}</p>
                                    {issue.suggestion && (
                                      <div className="pt-2 border-t">
                                        <p className="text-xs text-muted-foreground mb-1">Suggested fix:</p>
                                        <p className="text-sm text-green-600 dark:text-green-400">
                                          "{issue.suggestion}"
                                        </p>
                                        <Button
                                          size="sm"
                                          className="mt-2 w-full"
                                          onClick={() => applySuggestion(issue)}
                                        >
                                          <Check className="h-3 w-3 mr-1" />
                                          Apply Fix
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ))}
                          </div>
                        )}
                        
                        {/* Paragraph content */}
                        <div
                          className={`
                            p-3 rounded-lg border transition-all
                            ${showIssues && hasCritical 
                              ? 'border-red-500 bg-red-50/50 dark:bg-red-900/10' 
                              : showIssues && hasMajor
                                ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/10'
                                : showIssues && paragraphIssues.length > 0
                                  ? 'border-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10'
                                  : 'border-transparent hover:border-muted-foreground/20'
                            }
                          `}
                        >
                          {isPreviewMode ? (
                            <p className="text-sm leading-relaxed">{paragraph}</p>
                          ) : (
                            <Textarea
                              value={paragraph}
                              onChange={(e) => handleParagraphEdit(index, e.target.value)}
                              className="border-none p-0 resize-none focus-visible:ring-0 text-sm leading-relaxed min-h-[60px]"
                              rows={Math.ceil(paragraph.length / 80)}
                            />
                          )}
                          
                          {/* Paragraph actions */}
                          {!isPreviewMode && (
                            <div className="flex items-center justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {onRegenerate && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() => openRegenerateForParagraph(index)}
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Regenerate
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Issues Panel */}
        <div className="space-y-4">
          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Edit Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Word count</span>
                <span className="font-medium">{wordCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paragraphs</span>
                <span className="font-medium">{paragraphs.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reading time</span>
                <span className="font-medium">{Math.ceil(wordCount / 200)} min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Edits made</span>
                <span className="font-medium">{history.length - 1}</span>
              </div>
            </CardContent>
          </Card>

          {/* Issues List */}
          {showIssues && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Issues to Address
                </CardTitle>
                <CardDescription>
                  Click to jump to issue location
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Tabs defaultValue="all" className="w-full">
                    <TabsList className="w-full grid grid-cols-3 mb-3">
                      <TabsTrigger value="all" className="text-xs">All ({issueCounts.total})</TabsTrigger>
                      <TabsTrigger value="facts" className="text-xs">Facts ({issueCounts.factCheck})</TabsTrigger>
                      <TabsTrigger value="bias" className="text-xs">Bias ({issueCounts.bias})</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="all" className="space-y-2">
                      {issues.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                          <p className="text-sm">No issues found!</p>
                        </div>
                      ) : (
                        issues.map((issue, index) => (
                          <IssueCard key={index} issue={issue} onApply={() => applySuggestion(issue)} />
                        ))
                      )}
                    </TabsContent>
                    
                    <TabsContent value="facts" className="space-y-2">
                      {issues.filter(i => i.type === 'fact-check').map((issue, index) => (
                        <IssueCard key={index} issue={issue} onApply={() => applySuggestion(issue)} />
                      ))}
                    </TabsContent>
                    
                    <TabsContent value="bias" className="space-y-2">
                      {issues.filter(i => i.type === 'bias').map((issue, index) => (
                        <IssueCard key={index} issue={issue} onApply={() => applySuggestion(issue)} />
                      ))}
                    </TabsContent>
                  </Tabs>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Source Attribution */}
          {sourcesForAttribution.length > 0 && (
            <SourceAttribution
              sources={sourcesForAttribution}
              articleBody={body}
              onInsertCitation={handleInsertCitation}
            />
          )}

          {/* Actions */}
          <Card>
            <CardContent className="py-4 space-y-3">
              <Button onClick={onContinue} className="w-full" disabled={hasUnsavedChanges}>
                Continue to Final Review
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
              {hasUnsavedChanges && (
                <p className="text-xs text-center text-amber-500">
                  Save changes before continuing
                </p>
              )}
              <Button variant="outline" onClick={onBack} className="w-full">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

interface IssueCardProps {
  issue: IssueHighlight;
  onApply: () => void;
}

function IssueCard({ issue, onApply }: IssueCardProps) {
  return (
    <div className={`p-3 rounded-lg border-l-4 ${getSeverityColor(issue.severity)}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1">
          {issue.type === 'fact-check' ? (
            <Shield className="h-3 w-3 text-blue-500" />
          ) : (
            <Scale className="h-3 w-3 text-purple-500" />
          )}
          <Badge variant="outline" className="text-[10px] h-4">
            {issue.severity}
          </Badge>
        </div>
        <span className="text-[10px] text-muted-foreground">
          Para {issue.paragraphIndex + 1}
        </span>
      </div>
      <p className="text-xs font-medium line-clamp-2 mb-1">"{issue.text}"</p>
      <p className="text-[10px] text-muted-foreground line-clamp-2">{issue.explanation}</p>
      {issue.suggestion && (
        <Button size="sm" variant="outline" className="w-full mt-2 h-6 text-xs" onClick={onApply}>
          <Lightbulb className="h-3 w-3 mr-1" />
          Apply Suggestion
        </Button>
      )}
    </div>
  );
}

export default ArticleEditor;
