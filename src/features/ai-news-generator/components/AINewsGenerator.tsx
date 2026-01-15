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
  Target,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  ArrowUp,
  Edit3,
  Image,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import { useAINewsGenerator, ReadinessAssessment } from '../hooks';
import { ArticleEditor } from './ArticleEditor';
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

// Available data sources - organized by reliability and type
const DATA_SOURCES: { id: DataSourceType; name: string; description: string; tier: 'free' | 'freemium' | 'premium'; reliability: number }[] = [
  // Free sources (no API key required)
  { id: 'google-news', name: 'Google News', description: 'Aggregated news from multiple sources', tier: 'free', reliability: 3 },
  { id: 'bbc', name: 'BBC News', description: 'British Broadcasting Corporation', tier: 'free', reliability: 5 },
  
  // Wire services (high reliability)
  { id: 'reuters', name: 'Reuters', description: 'Global wire service - breaking news', tier: 'free', reliability: 5 },
  { id: 'ap', name: 'Associated Press', description: 'Premier news agency', tier: 'free', reliability: 5 },
  
  // Premium APIs (require API key)
  { id: 'newsapi', name: 'NewsAPI', description: '80,000+ news sources worldwide', tier: 'freemium', reliability: 3 },
  { id: 'guardian', name: 'The Guardian', description: 'UK quality journalism', tier: 'freemium', reliability: 4 },
  { id: 'nytimes', name: 'New York Times', description: 'Premium US journalism', tier: 'premium', reliability: 5 },
  { id: 'mediastack', name: 'MediaStack', description: 'News aggregator API', tier: 'freemium', reliability: 3 },
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
  const { toast } = useToast();
  
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
    updateSample,      // NEW: for article editing
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
    readinessAssessment,
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

  // Handle combined fact-check + bias analysis (single LLM call)
  const handleFactCheck = useCallback(async () => {
    if (!selectedSample) {
      setError('Please select an article to review');
      return;
    }

    setLoading(true, 'Reviewing article (fact-check + bias analysis)...');
    goToStage('fact-checking');

    try {
      // Use combined review endpoint (single LLM call instead of two)
      const response = await fetch('/.netlify/functions/review-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article: selectedSample,
          sourceStories: successfulStories,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to review article');
      }

      const data = await response.json();
      
      // Set both results from the combined response
      setFactCheckResult(data.factCheck);
      setBiasResult(data.biasAnalysis);
      
      goToStage('editing');
      setSuccess(`Review complete! Combined score: ${data.combinedScore}%. Ready for editing.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to review article');
    } finally {
      setLoading(false);
    }
  }, [selectedSample, successfulStories, setLoading, setError, setSuccess, goToStage, setFactCheckResult, setBiasResult]);

  // Handle bias analysis (manual trigger - now uses combined endpoint)
  const handleBiasCheck = useCallback(async () => {
    // If we already have results from combined call, just go to editing
    if (biasResult) {
      goToStage('editing');
      return;
    }
    // Otherwise run the full review
    await handleFactCheck();
  }, [biasResult, goToStage, handleFactCheck]);

  // Handle publishing
  const handlePublish = useCallback(async () => {
    if (!selectedSample || !isReadyForPublishing) {
      setError('Article is not ready for publishing');
      return;
    }

    setLoading(true, 'Publishing article...');
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
          publishImmediately: true,
        }),
      });

      const data = await response.json();
      
      // Check for explicit failure
      if (!response.ok || data.success === false) {
        throw new Error(data.message || data.error || 'Failed to publish article');
      }

      goToStage('complete');
      
      // Show success message based on publish status
      if (data.publishedToSanity) {
        const statusMsg = data.isPublished ? 'published' : 'saved as draft';
        setSuccess(`Article ${statusMsg} to Sanity CMS! ${data.studioUrl ? `View in Studio: ${data.studioUrl}` : ''}`);
        
        // Log the Sanity document ID for reference
        console.log('[publish] Sanity document ID:', data.sanityDocumentId);
        console.log('[publish] Studio URL:', data.studioUrl);
      } else {
        // This shouldn't happen with the updated backend, but handle gracefully
        setError('Article was not published to Sanity. Check your API token permissions.');
        goToStage('final-review');
        return;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to publish');
      goToStage('final-review');
    } finally {
      setLoading(false);
    }
  }, [selectedSample, isReadyForPublishing, setLoading, setError, setSuccess, goToStage, prepareFinalArticle]);

  // Handle article regeneration with feedback
  const handleRegenerate = useCallback(async (options: {
    feedback: string;
    paragraphIndex?: number;
    newStyle?: string;
    newTone?: string;
  }) => {
    const { feedback, paragraphIndex, newStyle, newTone } = options;
    
    if (!selectedSample) {
      setError('No article selected for regeneration');
      return;
    }

    const regenerationType = paragraphIndex !== undefined ? `paragraph ${paragraphIndex + 1}` : 'full article';
    setLoading(true, `Regenerating ${regenerationType}...`);

    try {
      const response = await fetch('/.netlify/functions/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article: {
            id: selectedSample.id,
            title: selectedSample.title,
            excerpt: selectedSample.excerpt,
            body: selectedSample.body,
            style: selectedSample.style,
            tone: selectedSample.tone,
            sourceHeadlines: selectedSample.sourceHeadlines,
            sourceUrls: selectedSample.sourceUrls,
          },
          feedback,
          paragraphIndex,
          newStyle,
          newTone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to regenerate');
      }

      const data = await response.json();
      
      if (data.success && data.regeneratedContent) {
        // Update the sample with regenerated content
        updateSample(selectedSample.id, {
          title: data.regeneratedContent.title,
          excerpt: data.regeneratedContent.excerpt,
          body: data.regeneratedContent.body,
          wordCount: data.regeneratedContent.wordCount,
          readingTime: data.regeneratedContent.readingTime,
          // Update style/tone if changed
          ...(newStyle && { style: newStyle as any }),
          ...(newTone && { tone: newTone as any }),
        });
        
        setSuccess(`${paragraphIndex !== undefined ? 'Paragraph' : 'Article'} regenerated successfully!`);
      } else {
        throw new Error('Invalid response from regeneration');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to regenerate');
    } finally {
      setLoading(false);
    }
  }, [selectedSample, setLoading, setError, setSuccess, updateSample]);

  return (
    <div className="min-h-screen bg-background w-full max-w-[100vw] overflow-x-hidden">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 w-full">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 flex-shrink-0">
                <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg lg:text-xl font-bold truncate">AI News Generator</h1>
                <p className="text-xs text-muted-foreground truncate">Human-in-the-loop workflow</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
              <Button variant="outline" size="sm" onClick={resetWorkflow} className="flex-1 sm:flex-none text-xs sm:text-sm">
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="border-b bg-muted/30 w-full">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-3">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {stageProgress.map((stage, index) => (
              <React.Fragment key={stage.stage}>
                <button
                  onClick={() => stage.completed && goToStage(stage.stage)}
                  disabled={!stage.completed && !stage.current}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap transition-colors flex-shrink-0 ${
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
                    <span className="h-4 w-4 rounded-full bg-background/50 flex items-center justify-center text-xs">
                      {index + 1}
                    </span>
                  )}
                  <span className="hidden md:inline">{stage.label}</span>
                </button>
                {index < stageProgress.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
          <Progress value={ui.progress} className="h-1 mt-2" />
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
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
              key="topic-input"
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
              key="headline-selection"
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
              key="generating-samples"
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
              key="sample-selection"
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
              key="review-stage"
              selectedSample={selectedSample}
              factCheckResult={factCheckResult}
              biasResult={biasResult}
              currentStage={state.stage}
              onFactCheck={handleFactCheck}
              onBiasCheck={handleBiasCheck}
              onBack={() => goToStage('sample-selection')}
              onContinueToEdit={() => goToStage('editing')}
              onApplySuggestion={(originalText, newText, type) => {
                if (selectedSample) {
                  console.log(`[Apply Suggestion] Type: ${type}`);
                  console.log(`[Apply Suggestion] Original text: "${originalText}"`);
                  console.log(`[Apply Suggestion] New text: "${newText}"`);
                  console.log(`[Apply Suggestion] Article body length: ${selectedSample.body.length}`);
                  
                  // First try exact match
                  let updatedBody = selectedSample.body.replace(originalText, newText);
                  
                  if (updatedBody !== selectedSample.body) {
                    updateSample(selectedSample.id, { body: updatedBody });
                    setSuccess(`Applied ${type} suggestion successfully!`);
                    toast({
                      title: "✅ Suggestion Applied",
                      description: `${type === 'fact-check' ? 'Fact-check' : 'Bias'} correction has been applied to the article.`,
                    });
                    console.log(`[Apply Suggestion] Exact match found and replaced`);
                    return;
                  }
                  
                  // Try case-insensitive match
                  const escapedOriginal = originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  const regex = new RegExp(escapedOriginal, 'gi');
                  updatedBody = selectedSample.body.replace(regex, newText);
                  
                  if (updatedBody !== selectedSample.body) {
                    updateSample(selectedSample.id, { body: updatedBody });
                    setSuccess(`Applied ${type} suggestion successfully!`);
                    toast({
                      title: "✅ Suggestion Applied",
                      description: `${type === 'fact-check' ? 'Fact-check' : 'Bias'} correction has been applied to the article.`,
                    });
                    console.log(`[Apply Suggestion] Case-insensitive match found and replaced`);
                    return;
                  }
                  
                  // Try fuzzy match - find similar text in the body
                  const originalLower = originalText.toLowerCase().trim();
                  
                  // Check if at least part of the original text exists
                  const words = originalLower.split(/\s+/).filter(w => w.length > 3);
                  const significantWords = words.slice(0, 5).join('|');
                  
                  if (significantWords) {
                    const fuzzyRegex = new RegExp(`[^.]*?(${significantWords})[^.]*\\.`, 'gi');
                    const match = selectedSample.body.match(fuzzyRegex);
                    
                    if (match && match[0]) {
                      console.log(`[Apply Suggestion] Found fuzzy match: "${match[0].substring(0, 100)}..."`);
                      updatedBody = selectedSample.body.replace(match[0], newText);
                      
                      if (updatedBody !== selectedSample.body) {
                        updateSample(selectedSample.id, { body: updatedBody });
                        setSuccess(`Applied ${type} suggestion (fuzzy match)`);
                        toast({
                          title: "✅ Suggestion Applied (Fuzzy Match)",
                          description: `${type === 'fact-check' ? 'Fact-check' : 'Bias'} correction applied using fuzzy matching.`,
                        });
                        return;
                      }
                    }
                  }
                  
                  // If nothing worked, show error with more info
                  console.error(`[Apply Suggestion] Could not find text to replace`);
                  console.error(`[Apply Suggestion] Body preview: "${selectedSample.body.substring(0, 500)}..."`);
                  setError(`Could not find the exact text to replace. The article may have been modified. Try editing manually.`);
                  toast({
                    title: "❌ Could Not Apply",
                    description: "The text to replace wasn't found. The article may have been modified. Try editing manually.",
                    variant: "destructive",
                  });
                } else {
                  setError('No article selected');
                  toast({
                    title: "❌ Error",
                    description: "No article selected",
                    variant: "destructive",
                  });
                }
              }}
            />
          )}

          {/* Stage 7: Article Editing */}
          {state.stage === 'editing' && selectedSample && (
            <ArticleEditor
              key="editing"
              article={selectedSample}
              factCheckResult={factCheckResult}
              biasResult={biasResult}
              onSave={(updates) => {
                if (selectedSample) {
                  updateSample(selectedSample.id, updates);
                }
              }}
              onRegenerate={handleRegenerate}
              onContinue={() => goToStage('final-review')}
              onBack={() => goToStage('bias-checking')}
            />
          )}

          {/* Stage 8: Final Review */}
          {state.stage === 'final-review' && (
            <FinalReviewStage
              key="final-review"
              selectedSample={selectedSample}
              factCheckResult={factCheckResult}
              biasResult={biasResult}
              readinessScore={readinessScore}
              isReadyForPublishing={isReadyForPublishing}
              readinessAssessment={readinessAssessment}
              onPublish={handlePublish}
              onBack={() => goToStage('editing')}
            />
          )}

          {/* Stage 8: Complete */}
          {state.stage === 'complete' && (
            <CompleteStage key="complete" onReset={resetWorkflow} />
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
      className="w-full max-w-2xl mx-auto"
    >
      <Card className="w-full">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            Search for News
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Enter a topic to find relevant headlines from multiple news sources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
          {/* Topic Input */}
          <div className="space-y-2">
            <Label htmlFor="topic" className="text-sm">Topic or Keywords</Label>
            <Input
              id="topic"
              placeholder="e.g., AI healthcare, climate policy"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className="text-sm sm:text-base"
            />
          </div>

          {/* Data Sources */}
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-sm">Data Sources</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {DATA_SOURCES.map((source) => (
                <div
                  key={source.id}
                  className={`flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedSources.includes(source.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleSource(source.id)}
                >
                  <Checkbox
                    checked={selectedSources.includes(source.id)}
                    onCheckedChange={() => toggleSource(source.id)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs sm:text-sm truncate">{source.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{source.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Search Button */}
          <Button onClick={onSearch} className="w-full" size="default">
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
      className="w-full"
    >
      <Card className="w-full">
        <CardHeader className="space-y-3 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Newspaper className="h-4 w-4 sm:h-5 sm:w-5" />
                Select Headlines
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Choose headlines for article generation
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={selectAllHeadlines} className="text-xs">
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={clearHeadlineSelection} className="text-xs">
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <ScrollArea className="h-[400px] sm:h-[500px]">
            <div className="space-y-2 sm:space-y-3 pr-2 sm:pr-4">
              {headlines.map((headline) => (
                <div
                  key={headline.id}
                  className={`flex gap-2 sm:gap-3 p-2 sm:p-4 rounded-lg border cursor-pointer transition-colors ${
                    headline.selected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleHeadlineSelection(headline.id)}
                >
                  <Checkbox
                    checked={headline.selected}
                    onCheckedChange={() => toggleHeadlineSelection(headline.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-xs sm:text-sm leading-tight line-clamp-2">{headline.title}</h4>
                    {headline.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 hidden sm:block">
                        {headline.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1 sm:mt-2">
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
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
                    className="text-muted-foreground hover:text-primary flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                  </a>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
            <Button variant="outline" onClick={onBack} className="order-2 sm:order-1 text-xs sm:text-sm" size="sm">
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Back
            </Button>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 order-1 sm:order-2">
              <span className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                {selectionCount} selected
              </span>
              <Button onClick={onContinue} disabled={selectionCount === 0} className="w-full sm:w-auto text-xs sm:text-sm" size="sm">
                Continue
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
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
      className="w-full grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6"
    >
      {/* Source Stories */}
      <div className="lg:col-span-2 order-2 lg:order-1">
        <Card className="w-full">
          <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              Source Material
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {stories.length} article{stories.length !== 1 ? 's' : ''} ready
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <ScrollArea className="h-[300px] sm:h-[400px]">
              <div className="space-y-3 sm:space-y-4 pr-2 sm:pr-4">
                {stories.map((story) => (
                  <div key={story.headlineId} className="p-3 sm:p-4 rounded-lg border">
                    <h4 className="font-medium text-xs sm:text-sm line-clamp-2">{story.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 sm:line-clamp-3">
                      {story.content.slice(0, 200)}...
                    </p>
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-2">
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
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
      <div className="order-1 lg:order-2">
        <Card className="w-full">
          <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              Article Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6">
            {/* Style */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Article Style</Label>
              <Select value={config.style} onValueChange={setStyle}>
                <SelectTrigger className="text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ARTICLE_STYLES.map((style) => (
                    <SelectItem key={style.id} value={style.id} className="text-xs sm:text-sm">
                      {style.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tone */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Tone</Label>
              <Select value={config.tone} onValueChange={setTone}>
                <SelectTrigger className="text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ARTICLE_TONES.map((tone) => (
                    <SelectItem key={tone.id} value={tone.id} className="text-xs sm:text-sm">
                      {tone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Word Count */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Words: {config.targetWordCount}</Label>
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
            <Button onClick={onGenerate} className="w-full text-xs sm:text-sm" size="default">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Generate Articles
            </Button>

            <Button variant="outline" onClick={onBack} className="w-full text-xs sm:text-sm" size="default">
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
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
  const [expandedView, setExpandedView] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full"
    >
      <Card className="w-full">
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
            Select Article
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Choose the best article sample
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <Tabs defaultValue="0">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              {samples.map((_, index) => (
                <TabsTrigger key={index} value={String(index)} className="text-xs sm:text-sm py-1.5 sm:py-2">
                  Sample {index + 1}
                </TabsTrigger>
              ))}
            </TabsList>
            {samples.map((sample, index) => (
              <TabsContent key={index} value={String(index)}>
                <div
                  className={`p-3 sm:p-4 rounded-lg border transition-colors ${
                    sample.selected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {/* Header with title and actions */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <h3 className="text-sm sm:text-base lg:text-lg font-bold flex-1 line-clamp-2">{sample.title}</h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {sample.selected && (
                        <Badge className="bg-primary text-xs">Selected</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedView(expandedView === sample.id ? null : sample.id);
                        }}
                        className="text-muted-foreground hover:text-foreground text-xs h-7 px-2"
                      >
                        {expandedView === sample.id ? (
                          <>
                            <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">Collapse</span>
                          </>
                        ) : (
                          <>
                            <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">Full View</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground mb-4 italic">{sample.excerpt}</p>
                  
                  {/* Full Article View or Preview */}
                  {expandedView === sample.id ? (
                    <ScrollArea className="h-[500px] rounded-md border p-4 bg-background">
                      <article className="prose prose-sm dark:prose-invert max-w-none">
                        {sample.body.split('\n').map((para, i) => (
                          para.trim() ? (
                            <p key={i} className="mb-4 leading-relaxed">{para}</p>
                          ) : null
                        ))}
                      </article>
                      
                      {/* Source Information */}
                      {sample.sourceUrls && sample.sourceUrls.length > 0 && (
                        <div className="mt-6 pt-4 border-t">
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <ExternalLink className="h-4 w-4" />
                            Sources
                          </h4>
                          <ul className="space-y-1">
                            {sample.sourceUrls.map((url, i) => (
                              <li key={i}>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline break-all"
                                >
                                  {url}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </ScrollArea>
                  ) : (
                    <div 
                      className="prose prose-sm max-w-none cursor-pointer"
                      onClick={() => selectSample(sample.id)}
                    >
                      {sample.body.split('\n').filter(p => p.trim()).slice(0, 3).map((para, i) => (
                        <p key={i} className="mb-2">{para}</p>
                      ))}
                      {sample.body.split('\n').filter(p => p.trim()).length > 3 && (
                        <p className="text-muted-foreground text-sm">
                          ... Click "Full View" to read more
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Article Metadata */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 pt-4 border-t">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{sample.style}</Badge>
                      <Badge variant="outline">{sample.tone}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {sample.wordCount} words • {sample.readingTime} min read
                      </span>
                    </div>
                    <Button
                      variant={sample.selected ? "default" : "outline"}
                      size="sm"
                      onClick={() => selectSample(sample.id)}
                      className="w-full sm:w-auto"
                    >
                      {sample.selected ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Selected
                        </>
                      ) : (
                        'Select This Article'
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={onBack} className="order-2 sm:order-1">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={onContinue} disabled={!selectedSample} className="order-1 sm:order-2">
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
  onContinueToEdit: () => void;
  onApplySuggestion: (originalText: string, newText: string, type: 'fact-check' | 'bias') => void;
}

function ReviewStage({
  selectedSample,
  factCheckResult,
  biasResult,
  currentStage,
  onFactCheck,
  onBiasCheck,
  onBack,
  onContinueToEdit,
  onApplySuggestion,
}: ReviewStageProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'border-green-500/50 bg-green-500/5';
      case 'partially-verified': return 'border-blue-500/50 bg-blue-500/5';
      case 'disputed': return 'border-yellow-500/50 bg-yellow-500/5';
      case 'false': return 'border-red-500/50 bg-red-500/5';
      case 'needs-context': return 'border-orange-500/50 bg-orange-500/5';
      default: return 'border-gray-500/50 bg-gray-500/5';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'partially-verified': return 'bg-blue-100 text-blue-800';
      case 'disputed': return 'bg-yellow-100 text-yellow-800';
      case 'false': return 'bg-red-100 text-red-800';
      case 'needs-context': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6"
    >
      {/* Fact Check Results */}
      <Card className="w-full">
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
            Fact Check
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Claims verified against sources
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {factCheckResult ? (
            <div className="space-y-3 sm:space-y-4">
              {/* Score and Status */}
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-medium">Score</span>
                  {factCheckResult.overallStatus && (
                    <Badge variant="outline" className="ml-1 sm:ml-2 text-xs hidden sm:inline-flex">
                      {factCheckResult.overallStatus}
                    </Badge>
                  )}
                </div>
                <Badge
                  variant={
                    factCheckResult.overallScore >= 88 ? 'default' :
                    factCheckResult.overallScore >= 70 ? 'secondary' : 'destructive'
                  }
                  className="text-sm sm:text-lg px-2 sm:px-3 py-0.5 sm:py-1"
                >
                  {factCheckResult.overallScore}%
                </Badge>
              </div>
              <Progress value={factCheckResult.overallScore} className="h-2 sm:h-3" />
              
              {/* Claim Statistics */}
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center p-2 rounded bg-green-50 dark:bg-green-900/20">
                  <p className="font-bold text-green-600">{factCheckResult.verifiedCount}</p>
                  <p className="text-xs text-muted-foreground">Verified</p>
                </div>
                <div className="text-center p-2 rounded bg-yellow-50 dark:bg-yellow-900/20">
                  <p className="font-bold text-yellow-600">{factCheckResult.disputedCount}</p>
                  <p className="text-xs text-muted-foreground">Disputed</p>
                </div>
                <div className="text-center p-2 rounded bg-red-50 dark:bg-red-900/20">
                  <p className="font-bold text-red-600">{factCheckResult.falseCount}</p>
                  <p className="text-xs text-muted-foreground">False</p>
                </div>
              </div>

              {/* Critical Issues */}
              {factCheckResult.criticalIssues && factCheckResult.criticalIssues.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Critical Issues ({factCheckResult.criticalIssues.length})</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 space-y-1 text-sm">
                      {factCheckResult.criticalIssues.slice(0, 2).map((issue, idx) => (
                        <li key={idx}>• {issue.issue}: {issue.requiredAction}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Claims List */}
              {factCheckResult.claims.length > 0 && (
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-3 pr-2">
                    {factCheckResult.claims.map((claim, index) => (
                      <div
                        key={claim.id || `claim-${index}`}
                        className={`p-3 rounded-lg border ${getStatusColor(claim.status)}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-medium flex-1">{claim.claim}</p>
                          <Badge className={`text-xs flex-shrink-0 ${getStatusBadge(claim.status)}`}>
                            {claim.status}
                          </Badge>
                        </div>
                        {claim.severity && (
                          <Badge variant="outline" className="text-xs mr-2">
                            {claim.severity}
                          </Badge>
                        )}
                        {claim.explanation && (
                          <p className="text-xs text-muted-foreground mt-1">{claim.explanation}</p>
                        )}
                        {claim.improvementAction && (
                          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-blue-600 dark:text-blue-400 flex items-start gap-1 mb-2">
                              <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span className="break-words">{claim.improvementAction}</span>
                            </p>
                            {claim.suggestedCorrection && (claim.originalText || claim.claim) && (
                              <div className="space-y-2">
                                <div className="p-3 bg-white dark:bg-gray-800 rounded border">
                                  <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">
                                    ✓ Suggested Replacement:
                                  </p>
                                  <p className="text-sm text-foreground leading-relaxed">
                                    {claim.suggestedCorrection}
                                  </p>
                                </div>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-8 text-xs px-4 w-full"
                                  onClick={() => onApplySuggestion(
                                    claim.originalText || claim.claim,
                                    claim.suggestedCorrection!,
                                    'fact-check'
                                  )}
                                >
                                  <Check className="h-3 w-3 mr-2" />
                                  Apply This Fix
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Path to 88 Summary */}
              {factCheckResult.pathTo88 && factCheckResult.pathTo88.gap > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Target className="h-4 w-4 text-amber-600" />
                      To reach 88%
                    </span>
                    <Badge variant="outline" className="text-amber-600">
                      +{factCheckResult.pathTo88.gap} needed
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {factCheckResult.pathTo88.estimatedEffort}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Not yet fact-checked</p>
              {currentStage === 'fact-checking' && (
                <Button onClick={onFactCheck}>
                  <Shield className="h-4 w-4 mr-2" />
                  Start Atomic Fact Check
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
            Detailed objectivity and bias detection
          </CardDescription>
        </CardHeader>
        <CardContent>
          {biasResult ? (
            <div className="space-y-4">
              {/* Score */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Objectivity Score</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {biasResult.overallBiasLevel} bias
                  </Badge>
                </div>
                <Badge
                  variant={
                    biasResult.overallScore >= 88 ? 'default' :
                    biasResult.overallScore >= 70 ? 'secondary' : 'destructive'
                  }
                  className="text-lg px-3 py-1"
                >
                  {biasResult.overallScore}%
                </Badge>
              </div>
              <Progress value={biasResult.overallScore} className="h-3" />

              {/* Tonal Analysis */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2 rounded bg-muted/50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground">Objectivity</span>
                    <span className="font-medium">{biasResult.tonalAnalysis.objectivity}%</span>
                  </div>
                  <Progress value={biasResult.tonalAnalysis.objectivity} className="h-1" />
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground">Balance</span>
                    <span className="font-medium">{biasResult.tonalAnalysis.balanceScore || biasResult.tonalAnalysis.objectivity}%</span>
                  </div>
                  <Progress value={biasResult.tonalAnalysis.balanceScore || biasResult.tonalAnalysis.objectivity} className="h-1" />
                </div>
              </div>

              {/* Political Leaning */}
              {(biasResult.politicalLeaning || biasResult.politicalAnalysis) && (
                <div className="text-center p-2 rounded bg-muted/30">
                  <span className="text-xs text-muted-foreground">Political Leaning</span>
                  <p className="font-medium capitalize">
                    {biasResult.politicalAnalysis?.leaning || biasResult.politicalLeaning || 'center'}
                  </p>
                </div>
              )}

              {/* Bias Instances */}
              {biasResult.instances && biasResult.instances.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Issues Found</span>
                    <Badge variant="outline">{biasResult.instances.length}</Badge>
                  </div>
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-3 pr-2">
                      {biasResult.instances.map((instance, index) => (
                        <div
                          key={instance.id || `bias-${index}`}
                          className={`p-3 rounded-lg border ${
                            instance.level === 'high' || instance.level === 'severe'
                              ? 'border-red-500/50 bg-red-500/5'
                              : instance.level === 'moderate'
                              ? 'border-yellow-500/50 bg-yellow-500/5'
                              : 'border-blue-500/50 bg-blue-500/5'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {instance.type}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`text-xs flex-shrink-0 ${
                                instance.level === 'high' || instance.level === 'severe' 
                                  ? 'text-red-600' 
                                  : instance.level === 'moderate' 
                                  ? 'text-yellow-600' 
                                  : 'text-blue-600'
                              }`}
                            >
                              {instance.level}
                            </Badge>
                          </div>
                          
                          {/* Original biased text */}
                          <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded border border-red-200 dark:border-red-800">
                            <p className="text-xs text-red-600 dark:text-red-400 mb-1 font-semibold uppercase tracking-wide">
                              ✗ Original (Biased):
                            </p>
                            <p className="text-sm text-foreground leading-relaxed">
                              "{instance.text}"
                            </p>
                          </div>
                          
                          {/* Explanation */}
                          <p className="text-xs text-muted-foreground mt-2 mb-2">{instance.explanation}</p>
                          
                          {/* Suggested revision */}
                          {instance.suggestedRevision && (
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                              <p className="text-xs text-green-600 dark:text-green-400 mb-2 font-semibold uppercase tracking-wide">
                                ✓ Suggested Revision:
                              </p>
                              <p className="text-sm text-foreground leading-relaxed mb-3">
                                {instance.suggestedRevision}
                              </p>
                              <Button
                                variant="default"
                                size="sm"
                                className="h-8 text-xs px-4 w-full"
                                onClick={() => onApplySuggestion(
                                  instance.text,
                                  instance.suggestedRevision!,
                                  'bias'
                                )}
                              >
                                <Check className="h-3 w-3 mr-2" />
                                Apply This Revision
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}

              {/* Path to 88 Summary */}
              {biasResult.pathTo88 && biasResult.pathTo88.gap > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Target className="h-4 w-4 text-amber-600" />
                      To reach 88%
                    </span>
                    <Badge variant="outline" className="text-amber-600">
                      +{biasResult.pathTo88.gap} needed
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {biasResult.pathTo88.estimatedEffort}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Not yet analyzed</p>
              {currentStage === 'bias-checking' && factCheckResult && (
                <Button onClick={onBiasCheck}>
                  <Scale className="h-4 w-4 mr-2" />
                  Start Bias Analysis
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Bar */}
      <div className="lg:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t">
        <Button variant="outline" onClick={onBack} className="order-2 sm:order-1">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        {/* Show continue button if both checks are done */}
        {factCheckResult && biasResult && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 order-1 sm:order-2">
            <div className="text-sm text-muted-foreground text-center">
              Combined: {Math.round((factCheckResult.overallScore * 0.55) + (biasResult.overallScore * 0.45))}%
            </div>
            <Button onClick={onContinueToEdit} className="w-full sm:w-auto">
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Article
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
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
  readinessAssessment?: ReadinessAssessment;
  onPublish: () => void;
  onBack: () => void;
}

function FinalReviewStage({
  selectedSample,
  factCheckResult,
  biasResult,
  readinessScore,
  isReadyForPublishing,
  readinessAssessment,
  onPublish,
  onBack,
}: FinalReviewStageProps) {
  const [showActions, setShowActions] = useState(true);
  
  const getScoreColor = (score: number) => {
    if (score >= 88) return 'text-green-500';
    if (score >= 75) return 'text-yellow-500';
    if (score >= 60) return 'text-orange-500';
    return 'text-red-500';
  };

  const getProgressColor = (score: number) => {
    if (score >= 88) return 'bg-green-500';
    if (score >= 75) return 'bg-yellow-500';
    if (score >= 60) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'complex': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6"
    >
      {/* Article Preview */}
      <div className="lg:col-span-2 space-y-3 sm:space-y-4 order-2 lg:order-1">
        <Card className="w-full">
          <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
            <CardTitle className="text-base sm:text-lg">Final Preview</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Images will be added in Sanity CMS
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {selectedSample && (
              <ScrollArea className="h-[300px] sm:h-[400px]">
                <article className="prose prose-sm dark:prose-invert max-w-none pr-2 sm:pr-4">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4">{selectedSample.title}</h1>
                  <p className="text-muted-foreground italic mb-3 sm:mb-4 text-xs sm:text-sm">{selectedSample.excerpt}</p>
                  {selectedSample.body.split('\n').filter(p => p.trim()).map((para, i) => (
                    <p key={i} className="mb-2 sm:mb-3 text-xs sm:text-sm">{para}</p>
                  ))}
                </article>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Path to 88% - Required Actions */}
        {readinessAssessment && readinessAssessment.gap > 0 && (
          <Card className="border-amber-500/50 w-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-amber-500">
                <Target className="h-5 w-5" />
                Path to 88% Readiness
              </CardTitle>
              <CardDescription>
                {readinessAssessment.pathTo88.achievable 
                  ? `You're ${readinessAssessment.gap} points away. ${readinessAssessment.pathTo88.estimatedEffort}`
                  : 'Significant revisions needed - consider regenerating the article'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Current → Target</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${getScoreColor(readinessScore)}`}>{readinessScore}%</span>
                  <ArrowUp className="h-4 w-4 text-muted-foreground" />
                  <span className="font-bold text-green-500">88%</span>
                </div>
              </div>
              
              {/* Progress to target */}
              <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 overflow-hidden">
                <div 
                  className={`absolute left-0 top-0 h-full ${getProgressColor(readinessScore)} transition-all`}
                  style={{ width: `${readinessScore}%` }}
                />
                <div 
                  className="absolute top-0 h-full w-0.5 bg-green-600"
                  style={{ left: '88%' }}
                />
              </div>

              {/* Toggle actions */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowActions(!showActions)}
                className="w-full mb-3"
              >
                {showActions ? 'Hide' : 'Show'} Required Actions ({readinessAssessment.pathTo88.requiredActions.length})
              </Button>

              {showActions && (
                <div className="space-y-3">
                  {readinessAssessment.pathTo88.requiredActions.map((action, index) => (
                    <div 
                      key={index} 
                      className="p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold">
                            {index + 1}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {action.source === 'fact-check' ? (
                              <><Shield className="h-3 w-3 mr-1" /> Fact</>
                            ) : (
                              <><Scale className="h-3 w-3 mr-1" /> Bias</>
                            )}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getDifficultyColor(action.difficulty)}>
                            {action.difficulty}
                          </Badge>
                          <Badge variant="secondary" className="text-green-600">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            +{action.scoreImpact}%
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm">{action.action}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Fixes */}
              {readinessAssessment.quickFixes.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Quick Wins (Easy Fixes)
                  </h4>
                  <div className="space-y-2">
                    {readinessAssessment.quickFixes.map((fix, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded bg-green-50 dark:bg-green-900/20 text-sm">
                        <span>{fix.action}</span>
                        <Badge variant="outline" className="text-green-600">+{fix.expectedGain}%</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Issues Summary */}
        {readinessAssessment && readinessAssessment.issues.totalIssues > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Issues Found ({readinessAssessment.issues.totalIssues})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                <div className="p-2 sm:p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <div className="text-xl sm:text-2xl font-bold text-red-500">{readinessAssessment.issues.critical}</div>
                  <div className="text-xs text-muted-foreground">Critical</div>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <div className="text-xl sm:text-2xl font-bold text-orange-500">{readinessAssessment.issues.major}</div>
                  <div className="text-xs text-muted-foreground">Major</div>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                  <div className="text-xl sm:text-2xl font-bold text-yellow-500">{readinessAssessment.issues.minor}</div>
                  <div className="text-xs text-muted-foreground">Minor</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Publishing Controls - Right Sidebar */}
      <div className="space-y-3 sm:space-y-4 order-1 lg:order-2">
        {/* Main Readiness Score */}
        <Card className={`w-full ${readinessScore >= 88 ? 'border-green-500' : 'border-amber-500'}`}>
          <CardHeader className="pb-2 px-3 sm:px-6 py-3 sm:py-4">
            <CardTitle className="text-center text-sm sm:text-base">Readiness Score</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-center">
              <div className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 ${getScoreColor(readinessScore)}`}>
                {readinessScore}%
              </div>
              <Progress 
                value={readinessScore} 
                className="mb-3 sm:mb-4 h-2 sm:h-3"
              />
              {readinessScore >= 88 ? (
                <Badge className="bg-green-500 text-white text-xs sm:text-sm">
                  <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Ready
                </Badge>
              ) : readinessScore >= 70 ? (
                <Badge className="bg-yellow-500 text-white">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Can Publish (Not Optimal)
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <X className="h-4 w-4 mr-1" />
                  Needs Improvement
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Score Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Score Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                Fact Accuracy
              </span>
              <span className={`font-semibold ${getScoreColor(readinessAssessment?.factCheckScore || 0)}`}>
                {readinessAssessment?.factCheckScore || 0}%
              </span>
            </div>
            <Progress value={readinessAssessment?.factCheckScore || 0} className="h-2" />
            
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <Scale className="h-4 w-4 text-purple-500" />
                Objectivity
              </span>
              <span className={`font-semibold ${getScoreColor(readinessAssessment?.biasScore || 0)}`}>
                {readinessAssessment?.biasScore || 0}%
              </span>
            </div>
            <Progress value={readinessAssessment?.biasScore || 0} className="h-2" />

            {/* Additional breakdowns if available */}
            {readinessAssessment?.breakdown.slice(2).map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>{item.category}</span>
                  <span className={getScoreColor(item.score)}>{item.score}%</span>
                </div>
                <Progress value={item.score} className="h-1" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Publish Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={onPublish}
              disabled={!isReadyForPublishing && readinessScore < 70}
              className="w-full"
              size="lg"
              variant={readinessScore >= 88 ? 'default' : readinessScore >= 70 ? 'secondary' : 'outline'}
            >
              <Send className="h-4 w-4 mr-2" />
              {readinessScore >= 88 
                ? 'Publish to Sanity' 
                : readinessScore >= 70 
                  ? 'Publish Anyway' 
                  : 'Cannot Publish Yet'}
            </Button>
            
            {readinessScore >= 70 && readinessScore < 88 && (
              <p className="text-xs text-center text-muted-foreground">
                Publishing below 88% is not recommended but allowed
              </p>
            )}
            
            <Button variant="outline" onClick={onBack} className="w-full">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Review
            </Button>
          </CardContent>
        </Card>

        {/* Target Info */}
        <div className="p-4 rounded-lg bg-muted/50 text-center">
          <div className="text-xs text-muted-foreground mb-1">Publishing Target</div>
          <div className="text-2xl font-bold text-green-500">88%</div>
          <div className="text-xs text-muted-foreground">
            {readinessScore >= 88 
              ? '✓ Target met!' 
              : `${88 - readinessScore} points needed`}
          </div>
        </div>
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
