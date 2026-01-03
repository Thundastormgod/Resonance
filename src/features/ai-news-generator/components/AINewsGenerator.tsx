// AI News Generator Admin UI
// Human-in-the-loop workflow for AI-powered news generation

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Newspaper, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  Scale,
  Send,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Clock,
  FileText,
  Loader2,
  Check,
  X,
  Settings,
  BookOpen,
  Brain,
  Shield,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAINewsGenerator } from '../hooks';
import type {
  DataSourceType,
  WorkflowStage,
  Headline,
  StoryContent,
  GeneratedArticleSample,
  FactCheckResult,
  BiasAnalysisResult,
  ArticleStyle,
  ArticleTone,
} from '../types';

// Available data sources
const DATA_SOURCES: { id: DataSourceType; name: string; description: string }[] = [
  { id: 'google-news', name: 'Google News', description: 'Aggregated news from multiple sources' },
  { id: 'newsapi', name: 'NewsAPI', description: 'Over 80,000 news sources' },
  { id: 'guardian', name: 'The Guardian', description: 'UK-based quality journalism' },
  { id: 'bbc', name: 'BBC News', description: 'British Broadcasting Corporation' },
  { id: 'rss', name: 'Custom RSS', description: 'Add your own RSS feeds' },
];

// Article styles
const ARTICLE_STYLES: { id: ArticleStyle; name: string; description: string }[] = [
  { id: 'feature', name: 'Feature', description: 'In-depth human-interest story' },
  { id: 'investigative', name: 'Investigative', description: 'Deep-dive exposé' },
  { id: 'breaking-news', name: 'Breaking News', description: 'Timely, concise reporting' },
  { id: 'analysis', name: 'Analysis', description: 'Expert interpretation' },
  { id: 'explainer', name: 'Explainer', description: 'Makes complex topics accessible' },
  { id: 'opinion', name: 'Opinion', description: 'Perspective piece with evidence' },
];

// Article tones
const ARTICLE_TONES: { id: ArticleTone; name: string }[] = [
  { id: 'balanced', name: 'Balanced' },
  { id: 'formal', name: 'Formal' },
  { id: 'conversational', name: 'Conversational' },
  { id: 'authoritative', name: 'Authoritative' },
  { id: 'urgent', name: 'Urgent' },
];

export function AINewsGenerator() {
  const generator = useAINewsGenerator();
  const {
    state,
    ui,
    stageProgress,
    topic,
    selectedSources,
    setTopic,
    toggleSource,
    goToStage,
    nextStage,
    prevStage,
    resetWorkflow,
    setLoading,
    setError,
    setSuccess,
    headlines,
    selectedHeadlines,
    setHeadlines,
    toggleHeadlineSelection,
    selectAllHeadlines,
    clearHeadlineSelection,
    selectionCount,
    stories,
    successfulStories,
    collatedGroups,
    setStories,
    samples,
    selectedSample,
    setSamples,
    selectSample,
    config,
    setStyle,
    setTone,
    setWordCount,
    factCheckResult,
    biasResult,
    setFactCheckResult,
    setBiasResult,
    readinessScore,
    isReadyForPublishing,
    finalArticle,
    prepareFinalArticle,
  } = generator;

  // Handle search for headlines
  const handleSearch = useCallback(async () => {
    if (!topic.trim()) {
      setError('Please enter a topic to search');
      return;
    }

    if (selectedSources.length === 0) {
      setError('Please select at least one data source');
      return;
    }

    setLoading(true, 'Searching for headlines...');
    goToStage('fetching-headlines');

    try {
      // Call Netlify function to fetch headlines
      const response = await fetch('/.netlify/functions/fetch-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          sources: selectedSources,
          maxResults: 20,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch headlines');
      }

      const data = await response.json();
      setHeadlines(data.headlines || []);
      goToStage('headline-selection');
      setSuccess(`Found ${data.headlines?.length || 0} headlines`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch headlines');
      goToStage('topic-input');
    } finally {
      setLoading(false);
    }
  }, [topic, selectedSources, setLoading, setError, setSuccess, goToStage, setHeadlines]);

  // Handle reading stories from selected headlines
  const handleReadStories = useCallback(async () => {
    if (selectedHeadlines.length === 0) {
      setError('Please select at least one headline');
      return;
    }

    setLoading(true, 'Reading full articles...');
    goToStage('reading-stories');

    try {
      const response = await fetch('/.netlify/functions/read-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headlines: selectedHeadlines,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to read stories');
      }

      const data = await response.json();
      // Store both stories and collated groups
      setStories(data.stories || [], data.collatedGroups || []);
      
      if (data.successCount > 0) {
        goToStage('generating-samples');
        const groupInfo = data.collatedGroups?.length 
          ? ` (${data.collatedGroups.length} topic groups)` 
          : '';
        setSuccess(`Successfully read ${data.successCount} articles${groupInfo}`);
      } else {
        setError('Could not read any articles. Please try different headlines.');
        goToStage('headline-selection');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to read stories');
      goToStage('headline-selection');
    } finally {
      setLoading(false);
    }
  }, [selectedHeadlines, setLoading, setError, setSuccess, goToStage, setStories]);

  // Handle article generation
  const handleGenerateArticles = useCallback(async () => {
    if (successfulStories.length === 0) {
      setError('No stories available for generation');
      return;
    }

    const hasCollatedGroups = collatedGroups && collatedGroups.length > 0;
    const loadingMsg = hasCollatedGroups 
      ? `Generating unified article from ${collatedGroups.length} topic group(s)...`
      : 'Generating article samples...';
    
    setLoading(true, loadingMsg);

    try {
      const response = await fetch('/.netlify/functions/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stories: successfulStories,
          collatedGroups: collatedGroups, // Pass collated groups for unified generation
          config,
          numberOfSamples: 1, // Generate 1 sample to stay within timeout
          useCollatedGroups: hasCollatedGroups, // Use collated mode if available
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate articles');
      }

      const data = await response.json();
      setSamples(data.samples || []);
      goToStage('sample-selection');
      
      const modeInfo = data.mode === 'collated' 
        ? ` (unified from ${data.groupsProcessed} topic groups)` 
        : '';
      setSuccess(`Generated ${data.samples?.length || 0} article sample${modeInfo}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate articles');
    } finally {
      setLoading(false);
    }
  }, [successfulStories, collatedGroups, config, setLoading, setError, setSuccess, goToStage, setSamples]);

  // Handle fact checking
  const handleFactCheck = useCallback(async () => {
    if (!selectedSample) {
      setError('Please select an article to fact-check');
      return;
    }

    setLoading(true, 'Fact-checking article...');
    goToStage('fact-checking');

    try {
      const response = await fetch('/.netlify/functions/fact-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article: selectedSample,
          sourceStories: successfulStories,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fact-check article');
      }

      const data = await response.json();
      setFactCheckResult(data);
      goToStage('bias-checking');
      setSuccess('Fact-check complete');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fact-check');
    } finally {
      setLoading(false);
    }
  }, [selectedSample, successfulStories, setLoading, setError, setSuccess, goToStage, setFactCheckResult]);

  // Handle bias analysis
  const handleBiasCheck = useCallback(async () => {
    if (!selectedSample) {
      setError('Please select an article to analyze');
      return;
    }

    setLoading(true, 'Analyzing for bias...');

    try {
      const response = await fetch('/.netlify/functions/bias-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article: selectedSample,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze bias');
      }

      const data = await response.json();
      setBiasResult(data);
      goToStage('final-review');
      setSuccess('Bias analysis complete');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to analyze bias');
    } finally {
      setLoading(false);
    }
  }, [selectedSample, setLoading, setError, setSuccess, goToStage, setBiasResult]);

  // Handle publishing
  const handlePublish = useCallback(async () => {
    if (!selectedSample || !isReadyForPublishing) {
      setError('Article is not ready for publishing');
      return;
    }

    setLoading(true, 'Publishing to Sanity...');
    goToStage('publishing');

    try {
      // Prepare the final article
      const article = prepareFinalArticle('technology', ['ai', 'news'], undefined);
      
      if (!article) {
        throw new Error('Failed to prepare article');
      }

      const response = await fetch('/.netlify/functions/publish-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article,
          publishImmediately: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish article');
      }

      const data = await response.json();
      goToStage('complete');
      setSuccess('Article published successfully!');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to publish');
      goToStage('final-review');
    } finally {
      setLoading(false);
    }
  }, [selectedSample, isReadyForPublishing, setLoading, setError, setSuccess, goToStage, prepareFinalArticle]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">AI News Generator</h1>
                <p className="text-sm text-muted-foreground">Human-in-the-loop workflow</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={resetWorkflow}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {stageProgress.map((stage, index) => (
              <React.Fragment key={stage.stage}>
                <button
                  onClick={() => stage.completed && goToStage(stage.stage)}
                  disabled={!stage.completed && !stage.current}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                    stage.current
                      ? 'bg-primary text-primary-foreground'
                      : stage.completed
                      ? 'bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {stage.completed ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <span className="h-5 w-5 rounded-full bg-background/50 flex items-center justify-center text-xs">
                      {index + 1}
                    </span>
                  )}
                  {stage.label}
                </button>
                {index < stageProgress.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
          <Progress value={ui.progress} className="h-1 mt-2" />
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Error/Success Messages */}
        <AnimatePresence mode="wait">
          {ui.error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4"
            >
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{ui.error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
          {ui.successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4"
            >
              <Alert className="border-green-500 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-500">Success</AlertTitle>
                <AlertDescription>{ui.successMessage}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Overlay */}
        {ui.isLoading && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <Card className="p-6">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">{ui.loadingMessage || 'Processing...'}</p>
              </div>
            </Card>
          </div>
        )}

        {/* Stage Content */}
        <AnimatePresence mode="wait">
          {/* Stage 1: Topic Input */}
          {state.stage === 'topic-input' && (
            <TopicInputStage
              topic={topic}
              setTopic={setTopic}
              selectedSources={selectedSources}
              toggleSource={toggleSource}
              onSearch={handleSearch}
            />
          )}

          {/* Stage 2: Headline Selection */}
          {state.stage === 'headline-selection' && (
            <HeadlineSelectionStage
              headlines={headlines}
              selectedHeadlines={selectedHeadlines}
              toggleHeadlineSelection={toggleHeadlineSelection}
              selectAllHeadlines={selectAllHeadlines}
              clearHeadlineSelection={clearHeadlineSelection}
              selectionCount={selectionCount}
              onContinue={handleReadStories}
              onBack={() => goToStage('topic-input')}
            />
          )}

          {/* Stage 3: Generation Config & Samples */}
          {state.stage === 'generating-samples' && (
            <GenerationStage
              stories={successfulStories}
              config={config}
              setStyle={setStyle}
              setTone={setTone}
              setWordCount={setWordCount}
              onGenerate={handleGenerateArticles}
              onBack={() => goToStage('headline-selection')}
            />
          )}

          {/* Stage 4: Sample Selection */}
          {state.stage === 'sample-selection' && (
            <SampleSelectionStage
              samples={samples}
              selectedSample={selectedSample}
              selectSample={selectSample}
              onContinue={handleFactCheck}
              onBack={() => goToStage('generating-samples')}
            />
          )}

          {/* Stage 5 & 6: Fact Check & Bias Analysis */}
          {(state.stage === 'fact-checking' || state.stage === 'bias-checking') && (
            <ReviewStage
              selectedSample={selectedSample}
              factCheckResult={factCheckResult}
              biasResult={biasResult}
              currentStage={state.stage}
              onFactCheck={handleFactCheck}
              onBiasCheck={handleBiasCheck}
              onBack={() => goToStage('sample-selection')}
            />
          )}

          {/* Stage 7: Final Review */}
          {state.stage === 'final-review' && (
            <FinalReviewStage
              selectedSample={selectedSample}
              factCheckResult={factCheckResult}
              biasResult={biasResult}
              readinessScore={readinessScore}
              isReadyForPublishing={isReadyForPublishing}
              onPublish={handlePublish}
              onBack={() => goToStage('sample-selection')}
            />
          )}

          {/* Stage 8: Complete */}
          {state.stage === 'complete' && (
            <CompleteStage onReset={resetWorkflow} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ============================================================
// Stage Components
// ============================================================

interface TopicInputStageProps {
  topic: string;
  setTopic: (topic: string) => void;
  selectedSources: DataSourceType[];
  toggleSource: (source: DataSourceType) => void;
  onSearch: () => void;
}

function TopicInputStage({
  topic,
  setTopic,
  selectedSources,
  toggleSource,
  onSearch,
}: TopicInputStageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-2xl mx-auto"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search for News
          </CardTitle>
          <CardDescription>
            Enter a topic to find relevant headlines from multiple news sources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Topic Input */}
          <div className="space-y-2">
            <Label htmlFor="topic">Topic or Keywords</Label>
            <Input
              id="topic"
              placeholder="e.g., AI healthcare breakthroughs, climate change policy"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className="text-lg"
            />
          </div>

          {/* Data Sources */}
          <div className="space-y-3">
            <Label>Data Sources</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DATA_SOURCES.map((source) => (
                <div
                  key={source.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedSources.includes(source.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleSource(source.id)}
                >
                  <Checkbox
                    checked={selectedSources.includes(source.id)}
                    onCheckedChange={() => toggleSource(source.id)}
                  />
                  <div>
                    <p className="font-medium text-sm">{source.name}</p>
                    <p className="text-xs text-muted-foreground">{source.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Search Button */}
          <Button onClick={onSearch} className="w-full" size="lg">
            <Search className="h-4 w-4 mr-2" />
            Search Headlines
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface HeadlineSelectionStageProps {
  headlines: Headline[];
  selectedHeadlines: Headline[];
  toggleHeadlineSelection: (id: string) => void;
  selectAllHeadlines: () => void;
  clearHeadlineSelection: () => void;
  selectionCount: number;
  onContinue: () => void;
  onBack: () => void;
}

function HeadlineSelectionStage({
  headlines,
  toggleHeadlineSelection,
  selectAllHeadlines,
  clearHeadlineSelection,
  selectionCount,
  onContinue,
  onBack,
}: HeadlineSelectionStageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="h-5 w-5" />
                Select Headlines
              </CardTitle>
              <CardDescription>
                Choose which headlines to use for article generation
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={selectAllHeadlines}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={clearHeadlineSelection}>
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {headlines.map((headline) => (
                <div
                  key={headline.id}
                  className={`flex gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    headline.selected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleHeadlineSelection(headline.id)}
                >
                  <Checkbox
                    checked={headline.selected}
                    onCheckedChange={() => toggleHeadlineSelection(headline.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm leading-tight">{headline.title}</h4>
                    {headline.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {headline.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {headline.source.name}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(headline.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <a
                    href={headline.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Action Bar */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <Button variant="outline" onClick={onBack}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {selectionCount} headline{selectionCount !== 1 ? 's' : ''} selected
              </span>
              <Button onClick={onContinue} disabled={selectionCount === 0}>
                Continue
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface GenerationStageProps {
  stories: StoryContent[];
  config: any;
  setStyle: (style: ArticleStyle) => void;
  setTone: (tone: ArticleTone) => void;
  setWordCount: (count: number) => void;
  onGenerate: () => void;
  onBack: () => void;
}

function GenerationStage({
  stories,
  config,
  setStyle,
  setTone,
  setWordCount,
  onGenerate,
  onBack,
}: GenerationStageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {/* Source Stories */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Source Material
            </CardTitle>
            <CardDescription>
              {stories.length} article{stories.length !== 1 ? 's' : ''} ready for synthesis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {stories.map((story) => (
                  <div key={story.headlineId} className="p-4 rounded-lg border">
                    <h4 className="font-medium text-sm">{story.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                      {story.content.slice(0, 300)}...
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {story.source}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {story.wordCount} words
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Generation Config */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Article Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Style */}
            <div className="space-y-2">
              <Label>Article Style</Label>
              <Select value={config.style} onValueChange={setStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ARTICLE_STYLES.map((style) => (
                    <SelectItem key={style.id} value={style.id}>
                      {style.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tone */}
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={config.tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ARTICLE_TONES.map((tone) => (
                    <SelectItem key={tone.id} value={tone.id}>
                      {tone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Word Count */}
            <div className="space-y-2">
              <Label>Target Word Count: {config.targetWordCount}</Label>
              <Slider
                value={[config.targetWordCount]}
                onValueChange={([value]) => setWordCount(value)}
                min={300}
                max={2000}
                step={100}
              />
            </div>

            <Separator />

            {/* Generate Button */}
            <Button onClick={onGenerate} className="w-full" size="lg">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Articles
            </Button>

            <Button variant="outline" onClick={onBack} className="w-full">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

interface SampleSelectionStageProps {
  samples: GeneratedArticleSample[];
  selectedSample?: GeneratedArticleSample;
  selectSample: (id: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

function SampleSelectionStage({
  samples,
  selectedSample,
  selectSample,
  onContinue,
  onBack,
}: SampleSelectionStageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Select Article
          </CardTitle>
          <CardDescription>
            Choose the best article sample to proceed with fact-checking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="0">
            <TabsList className="grid w-full grid-cols-3">
              {samples.map((_, index) => (
                <TabsTrigger key={index} value={String(index)}>
                  Sample {index + 1}
                </TabsTrigger>
              ))}
            </TabsList>
            {samples.map((sample, index) => (
              <TabsContent key={index} value={String(index)}>
                <div
                  className={`p-6 rounded-lg border cursor-pointer transition-colors ${
                    sample.selected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => selectSample(sample.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold">{sample.title}</h3>
                    {sample.selected && (
                      <Badge className="bg-primary">Selected</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mb-4">{sample.excerpt}</p>
                  <div className="prose prose-sm max-w-none">
                    {sample.body.split('\n').slice(0, 3).map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                    {sample.body.split('\n').length > 3 && (
                      <p className="text-muted-foreground">...</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                    <Badge variant="outline">{sample.style}</Badge>
                    <Badge variant="outline">{sample.tone}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {sample.wordCount} words • {sample.readingTime} min read
                    </span>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Action Bar */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <Button variant="outline" onClick={onBack}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={onContinue} disabled={!selectedSample}>
              Fact-Check Article
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface ReviewStageProps {
  selectedSample?: GeneratedArticleSample;
  factCheckResult?: FactCheckResult;
  biasResult?: BiasAnalysisResult;
  currentStage: WorkflowStage;
  onFactCheck: () => void;
  onBiasCheck: () => void;
  onBack: () => void;
}

function ReviewStage({
  selectedSample,
  factCheckResult,
  biasResult,
  currentStage,
  onFactCheck,
  onBiasCheck,
  onBack,
}: ReviewStageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
    >
      {/* Fact Check Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Fact Check
          </CardTitle>
          <CardDescription>
            Verify claims against source materials
          </CardDescription>
        </CardHeader>
        <CardContent>
          {factCheckResult ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Score</span>
                <Badge
                  variant={
                    factCheckResult.overallScore >= 80
                      ? 'default'
                      : factCheckResult.overallScore >= 60
                      ? 'secondary'
                      : 'destructive'
                  }
                >
                  {factCheckResult.overallScore}%
                </Badge>
              </div>
              <Progress value={factCheckResult.overallScore} />
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Verified</span>
                  <p className="font-medium text-green-500">{factCheckResult.verifiedCount}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Disputed</span>
                  <p className="font-medium text-yellow-500">{factCheckResult.disputedCount}</p>
                </div>
              </div>

              {factCheckResult.claims.length > 0 && (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {factCheckResult.claims.map((claim) => (
                      <div
                        key={claim.id}
                        className={`p-3 rounded-lg border ${
                          claim.status === 'verified'
                            ? 'border-green-500/50 bg-green-500/5'
                            : claim.status === 'disputed'
                            ? 'border-yellow-500/50 bg-yellow-500/5'
                            : 'border-red-500/50 bg-red-500/5'
                        }`}
                      >
                        <p className="text-sm">{claim.claim}</p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {claim.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Not yet fact-checked</p>
              {currentStage === 'fact-checking' && (
                <Button onClick={onFactCheck} className="mt-4">
                  Start Fact Check
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bias Analysis Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Bias Analysis
          </CardTitle>
          <CardDescription>
            Check for potential bias in the article
          </CardDescription>
        </CardHeader>
        <CardContent>
          {biasResult ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Objectivity Score</span>
                <Badge
                  variant={
                    biasResult.overallScore >= 80
                      ? 'default'
                      : biasResult.overallScore >= 60
                      ? 'secondary'
                      : 'destructive'
                  }
                >
                  {biasResult.overallScore}%
                </Badge>
              </div>
              <Progress value={biasResult.overallScore} />

              <div className="grid grid-cols-3 gap-4 text-sm text-center">
                <div>
                  <span className="text-muted-foreground text-xs">Objectivity</span>
                  <p className="font-medium">{biasResult.tonalAnalysis.objectivity}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Emotionality</span>
                  <p className="font-medium">{biasResult.tonalAnalysis.emotionality}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Sensationalism</span>
                  <p className="font-medium">{biasResult.tonalAnalysis.sensationalism}%</p>
                </div>
              </div>

              {biasResult.politicalLeaning && (
                <div className="text-center">
                  <span className="text-xs text-muted-foreground">Political Leaning</span>
                  <p className="font-medium">{biasResult.politicalLeaning}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Not yet analyzed</p>
              {currentStage === 'bias-checking' && factCheckResult && (
                <Button onClick={onBiasCheck} className="mt-4">
                  Start Bias Analysis
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Bar */}
      <div className="lg:col-span-2 flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
    </motion.div>
  );
}

interface FinalReviewStageProps {
  selectedSample?: GeneratedArticleSample;
  factCheckResult?: FactCheckResult;
  biasResult?: BiasAnalysisResult;
  readinessScore: number;
  isReadyForPublishing: boolean;
  onPublish: () => void;
  onBack: () => void;
}

function FinalReviewStage({
  selectedSample,
  factCheckResult,
  biasResult,
  readinessScore,
  isReadyForPublishing,
  onPublish,
  onBack,
}: FinalReviewStageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {/* Article Preview */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Final Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedSample && (
              <div className="prose prose-sm max-w-none">
                <h1>{selectedSample.title}</h1>
                <p className="lead">{selectedSample.excerpt}</p>
                {selectedSample.body.split('\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Publishing Controls */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Readiness Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{readinessScore}%</div>
              <Progress value={readinessScore} className="mb-4" />
              {isReadyForPublishing ? (
                <Badge className="bg-green-500">Ready for Publishing</Badge>
              ) : (
                <Badge variant="destructive">Needs Improvement</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Publish</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={onPublish}
              disabled={!isReadyForPublishing}
              className="w-full"
              size="lg"
            >
              <Send className="h-4 w-4 mr-2" />
              Publish to Sanity
            </Button>
            <Button variant="outline" onClick={onBack} className="w-full">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

interface CompleteStageProps {
  onReset: () => void;
}

function CompleteStage({ onReset }: CompleteStageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto text-center"
    >
      <Card>
        <CardContent className="pt-10 pb-8">
          <div className="mb-6">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Article Published!</h2>
          <p className="text-muted-foreground mb-6">
            Your AI-generated article has been successfully published to Sanity CMS.
          </p>
          <Button onClick={onReset} size="lg">
            <Zap className="h-4 w-4 mr-2" />
            Generate Another Article
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default AINewsGenerator;
