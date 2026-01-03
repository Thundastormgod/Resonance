// AI News Generator React Hooks
// Manages state and operations for the human-in-the-loop workflow

import { useState, useCallback, useMemo } from 'react';
import type {
  WorkflowState,
  WorkflowStage,
  Headline,
  StoryContent,
  CollatedStoryGroup,
  GeneratedArticleSample,
  FactCheckResult,
  BiasAnalysisResult,
  FinalArticle,
  DataSourceType,
  GenerationConfig,
  HeadlineSearchRequest,
  HeadlineSearchResponse,
  ArticleGenerationRequest,
  ArticleGenerationResponse,
  StageProgress,
  UIState,
  ArticleStyle,
  ArticleTone,
} from '../types';

// Default generation config
const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  style: 'feature',
  tone: 'balanced',
  targetWordCount: 800,
  includeQuotes: true,
  includeStatistics: true,
  seoOptimized: true,
};

// Workflow stages in order
const WORKFLOW_STAGES: WorkflowStage[] = [
  'topic-input',
  'fetching-headlines',
  'headline-selection',
  'reading-stories',
  'generating-samples',
  'sample-selection',
  'fact-checking',
  'bias-checking',
  'final-review',
  'publishing',
  'complete',
];

/**
 * Main workflow state hook
 */
export function useWorkflowState() {
  const [state, setState] = useState<WorkflowState>({
    stage: 'topic-input',
    topic: '',
    selectedSources: ['google-news'],
    headlines: [],
    selectedHeadlines: [],
    stories: [],
    generationConfig: DEFAULT_GENERATION_CONFIG,
    samples: [],
    startedAt: new Date().toISOString(),
  });

  const [ui, setUI] = useState<UIState>({
    isLoading: false,
    currentStage: 'topic-input',
    progress: 0,
  });

  // Set loading state
  const setLoading = useCallback((isLoading: boolean, message?: string) => {
    setUI(prev => ({
      ...prev,
      isLoading,
      loadingMessage: message,
      error: isLoading ? undefined : prev.error,
    }));
  }, []);

  // Set error
  const setError = useCallback((error: string) => {
    setUI(prev => ({
      ...prev,
      isLoading: false,
      error,
    }));
  }, []);

  // Set success message
  const setSuccess = useCallback((message: string) => {
    setUI(prev => ({
      ...prev,
      successMessage: message,
    }));
    // Clear after 3 seconds
    setTimeout(() => {
      setUI(prev => ({ ...prev, successMessage: undefined }));
    }, 3000);
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setUI(prev => ({
      ...prev,
      error: undefined,
      successMessage: undefined,
    }));
  }, []);

  // Move to a specific stage
  const goToStage = useCallback((stage: WorkflowStage) => {
    setState(prev => ({ ...prev, stage }));
    setUI(prev => ({
      ...prev,
      currentStage: stage,
      progress: Math.round((WORKFLOW_STAGES.indexOf(stage) / (WORKFLOW_STAGES.length - 1)) * 100),
    }));
  }, []);

  // Move to next stage
  const nextStage = useCallback(() => {
    const currentIndex = WORKFLOW_STAGES.indexOf(state.stage);
    if (currentIndex < WORKFLOW_STAGES.length - 1) {
      goToStage(WORKFLOW_STAGES[currentIndex + 1]);
    }
  }, [state.stage, goToStage]);

  // Move to previous stage
  const prevStage = useCallback(() => {
    const currentIndex = WORKFLOW_STAGES.indexOf(state.stage);
    if (currentIndex > 0) {
      goToStage(WORKFLOW_STAGES[currentIndex - 1]);
    }
  }, [state.stage, goToStage]);

  // Reset workflow
  const resetWorkflow = useCallback(() => {
    setState({
      stage: 'topic-input',
      topic: '',
      selectedSources: ['google-news'],
      headlines: [],
      selectedHeadlines: [],
      stories: [],
      generationConfig: DEFAULT_GENERATION_CONFIG,
      samples: [],
      startedAt: new Date().toISOString(),
    });
    setUI({
      isLoading: false,
      currentStage: 'topic-input',
      progress: 0,
    });
  }, []);

  // Get stage progress info
  const stageProgress = useMemo((): StageProgress[] => {
    const currentIndex = WORKFLOW_STAGES.indexOf(state.stage);
    return WORKFLOW_STAGES.map((stage, index) => ({
      stage,
      label: getStageLabel(stage),
      completed: index < currentIndex,
      current: index === currentIndex,
    }));
  }, [state.stage]);

  return {
    state,
    setState,
    ui,
    setLoading,
    setError,
    setSuccess,
    clearMessages,
    goToStage,
    nextStage,
    prevStage,
    resetWorkflow,
    stageProgress,
  };
}

/**
 * Get human-readable label for a stage
 */
function getStageLabel(stage: WorkflowStage): string {
  const labels: Record<WorkflowStage, string> = {
    'topic-input': 'Enter Topic',
    'fetching-headlines': 'Fetching Headlines',
    'headline-selection': 'Select Headlines',
    'reading-stories': 'Reading Stories',
    'generating-samples': 'Generating Articles',
    'sample-selection': 'Select Article',
    'fact-checking': 'Fact Checking',
    'bias-checking': 'Bias Analysis',
    'final-review': 'Final Review',
    'publishing': 'Publishing',
    'complete': 'Complete',
  };
  return labels[stage];
}

/**
 * Hook for headline operations
 */
export function useHeadlines(
  state: WorkflowState,
  setState: React.Dispatch<React.SetStateAction<WorkflowState>>
) {
  // Set headlines from search
  const setHeadlines = useCallback((headlines: Headline[]) => {
    setState(prev => ({
      ...prev,
      headlines,
      selectedHeadlines: [],
    }));
  }, [setState]);

  // Toggle headline selection
  const toggleHeadlineSelection = useCallback((headlineId: string) => {
    setState(prev => {
      const headline = prev.headlines.find(h => h.id === headlineId);
      if (!headline) return prev;

      const isSelected = prev.selectedHeadlines.some(h => h.id === headlineId);

      return {
        ...prev,
        headlines: prev.headlines.map(h =>
          h.id === headlineId ? { ...h, selected: !isSelected } : h
        ),
        selectedHeadlines: isSelected
          ? prev.selectedHeadlines.filter(h => h.id !== headlineId)
          : [...prev.selectedHeadlines, { ...headline, selected: true }],
      };
    });
  }, [setState]);

  // Select all headlines
  const selectAllHeadlines = useCallback(() => {
    setState(prev => ({
      ...prev,
      headlines: prev.headlines.map(h => ({ ...h, selected: true })),
      selectedHeadlines: prev.headlines.map(h => ({ ...h, selected: true })),
    }));
  }, [setState]);

  // Clear all selections
  const clearHeadlineSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      headlines: prev.headlines.map(h => ({ ...h, selected: false })),
      selectedHeadlines: [],
    }));
  }, [setState]);

  // Get selection count
  const selectionCount = useMemo(() => state.selectedHeadlines.length, [state.selectedHeadlines]);

  return {
    headlines: state.headlines,
    selectedHeadlines: state.selectedHeadlines,
    setHeadlines,
    toggleHeadlineSelection,
    selectAllHeadlines,
    clearHeadlineSelection,
    selectionCount,
  };
}

/**
 * Hook for story operations
 */
export function useStories(
  state: WorkflowState,
  setState: React.Dispatch<React.SetStateAction<WorkflowState>>
) {
  // Set stories after reading (with optional collated groups)
  const setStories = useCallback((stories: StoryContent[], collatedGroups?: CollatedStoryGroup[]) => {
    setState(prev => ({
      ...prev,
      stories,
      collatedGroups,
    }));
  }, [setState]);

  // Get successful stories only
  const successfulStories = useMemo(
    () => state.stories.filter(s => s.success),
    [state.stories]
  );

  // Get failed stories
  const failedStories = useMemo(
    () => state.stories.filter(s => !s.success),
    [state.stories]
  );

  // Get collated groups
  const collatedGroups = useMemo(
    () => state.collatedGroups || [],
    [state.collatedGroups]
  );

  return {
    stories: state.stories,
    successfulStories,
    failedStories,
    collatedGroups,
    setStories,
  };
}

/**
 * Hook for article sample operations
 */
export function useArticleSamples(
  state: WorkflowState,
  setState: React.Dispatch<React.SetStateAction<WorkflowState>>
) {
  // Set generated samples
  const setSamples = useCallback((samples: GeneratedArticleSample[]) => {
    setState(prev => ({
      ...prev,
      samples,
      selectedSample: undefined,
    }));
  }, [setState]);

  // Select a sample
  const selectSample = useCallback((sampleId: string) => {
    setState(prev => {
      const sample = prev.samples.find(s => s.id === sampleId);
      return {
        ...prev,
        samples: prev.samples.map(s => ({
          ...s,
          selected: s.id === sampleId,
        })),
        selectedSample: sample,
      };
    });
  }, [setState]);

  // Update a sample (e.g., after editing)
  const updateSample = useCallback((sampleId: string, updates: Partial<GeneratedArticleSample>) => {
    setState(prev => ({
      ...prev,
      samples: prev.samples.map(s =>
        s.id === sampleId ? { ...s, ...updates } : s
      ),
      selectedSample: prev.selectedSample?.id === sampleId
        ? { ...prev.selectedSample, ...updates }
        : prev.selectedSample,
    }));
  }, [setState]);

  return {
    samples: state.samples,
    selectedSample: state.selectedSample,
    setSamples,
    selectSample,
    updateSample,
  };
}

/**
 * Hook for generation config
 */
export function useGenerationConfig(
  state: WorkflowState,
  setState: React.Dispatch<React.SetStateAction<WorkflowState>>
) {
  const updateConfig = useCallback((updates: Partial<GenerationConfig>) => {
    setState(prev => ({
      ...prev,
      generationConfig: {
        ...prev.generationConfig,
        ...updates,
      },
    }));
  }, [setState]);

  const setStyle = useCallback((style: ArticleStyle) => {
    updateConfig({ style });
  }, [updateConfig]);

  const setTone = useCallback((tone: ArticleTone) => {
    updateConfig({ tone });
  }, [updateConfig]);

  const setWordCount = useCallback((targetWordCount: number) => {
    updateConfig({ targetWordCount });
  }, [updateConfig]);

  return {
    config: state.generationConfig,
    updateConfig,
    setStyle,
    setTone,
    setWordCount,
  };
}

/**
 * Hook for review results (fact-check and bias)
 */
export function useReviewResults(
  state: WorkflowState,
  setState: React.Dispatch<React.SetStateAction<WorkflowState>>
) {
  // Set fact-check result
  const setFactCheckResult = useCallback((result: FactCheckResult) => {
    setState(prev => ({
      ...prev,
      factCheckResult: result,
    }));
  }, [setState]);

  // Set bias analysis result
  const setBiasResult = useCallback((result: BiasAnalysisResult) => {
    setState(prev => ({
      ...prev,
      biasAnalysisResult: result,
    }));
  }, [setState]);

  // Calculate overall readiness score
  const readinessScore = useMemo(() => {
    const factScore = state.factCheckResult?.overallScore || 0;
    const biasScore = state.biasAnalysisResult?.overallScore || 0;
    
    if (!state.factCheckResult && !state.biasAnalysisResult) {
      return 0;
    }
    
    return Math.round((factScore + biasScore) / 2);
  }, [state.factCheckResult, state.biasAnalysisResult]);

  // Check if article is ready for publishing
  const isReadyForPublishing = useMemo(() => {
    const factScore = state.factCheckResult?.overallScore || 0;
    const biasScore = state.biasAnalysisResult?.overallScore || 0;
    
    // Require at least 70% on both metrics
    return factScore >= 70 && biasScore >= 70;
  }, [state.factCheckResult, state.biasAnalysisResult]);

  return {
    factCheckResult: state.factCheckResult,
    biasResult: state.biasAnalysisResult,
    setFactCheckResult,
    setBiasResult,
    readinessScore,
    isReadyForPublishing,
  };
}

/**
 * Hook for final article preparation
 */
export function useFinalArticle(
  state: WorkflowState,
  setState: React.Dispatch<React.SetStateAction<WorkflowState>>
) {
  // Prepare final article from selected sample
  const prepareFinalArticle = useCallback((
    category: string,
    tags: string[],
    featuredImage?: FinalArticle['featuredImage']
  ) => {
    if (!state.selectedSample) return null;

    const sample = state.selectedSample;
    const slug = sample.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const finalArticle: FinalArticle = {
      title: sample.title,
      slug,
      excerpt: sample.excerpt,
      body: sample.body,
      category,
      tags,
      featuredImage,
      sourceUrls: sample.sourceUrls,
      sourceHeadlines: sample.sourceHeadlines,
      metadata: {
        style: sample.style,
        tone: sample.tone,
        wordCount: sample.wordCount,
        readingTime: sample.readingTime,
      },
      aiMetadata: {
        generationModel: sample.model,
        factCheckModel: state.factCheckResult?.model || sample.model,
        biasCheckModel: state.biasAnalysisResult?.model || sample.model,
        totalTokensUsed: sample.tokensUsed +
          (state.factCheckResult?.tokensUsed || 0) +
          (state.biasAnalysisResult?.tokensUsed || 0),
        generationTime: 0, // Would need to track this
        factCheckScore: state.factCheckResult?.overallScore || 0,
        biasScore: state.biasAnalysisResult?.overallScore || 0,
      },
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    setState(prev => ({
      ...prev,
      finalArticle,
    }));

    return finalArticle;
  }, [state.selectedSample, state.factCheckResult, state.biasAnalysisResult, setState]);

  // Update final article
  const updateFinalArticle = useCallback((updates: Partial<FinalArticle>) => {
    setState(prev => ({
      ...prev,
      finalArticle: prev.finalArticle
        ? { ...prev.finalArticle, ...updates }
        : undefined,
    }));
  }, [setState]);

  return {
    finalArticle: state.finalArticle,
    prepareFinalArticle,
    updateFinalArticle,
  };
}

/**
 * Combined hook for entire AI news generator
 */
export function useAINewsGenerator() {
  const workflow = useWorkflowState();
  const { state, setState } = workflow;

  const headlines = useHeadlines(state, setState);
  const stories = useStories(state, setState);
  const samples = useArticleSamples(state, setState);
  const config = useGenerationConfig(state, setState);
  const review = useReviewResults(state, setState);
  const finalArticle = useFinalArticle(state, setState);

  // Update topic
  const setTopic = useCallback((topic: string) => {
    setState(prev => ({ ...prev, topic }));
  }, [setState]);

  // Update selected sources
  const setSelectedSources = useCallback((sources: DataSourceType[]) => {
    setState(prev => ({ ...prev, selectedSources: sources }));
  }, [setState]);

  // Toggle source selection
  const toggleSource = useCallback((source: DataSourceType) => {
    setState(prev => ({
      ...prev,
      selectedSources: prev.selectedSources.includes(source)
        ? prev.selectedSources.filter(s => s !== source)
        : [...prev.selectedSources, source],
    }));
  }, [setState]);

  return {
    // Workflow state
    ...workflow,
    
    // Topic and sources
    topic: state.topic,
    selectedSources: state.selectedSources,
    setTopic,
    setSelectedSources,
    toggleSource,
    
    // Headlines
    ...headlines,
    
    // Stories
    ...stories,
    
    // Samples
    ...samples,
    
    // Config
    ...config,
    
    // Review
    ...review,
    
    // Final article
    ...finalArticle,
  };
}

export default useAINewsGenerator;
