// Article Queue Manager Component
// Handles batch article generation and queue management

import React, { useState, useCallback, useMemo } from 'react';
import {
  ListOrdered,
  Play,
  Pause,
  SkipForward,
  Trash2,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Settings,
  BarChart3,
  Zap,
  RefreshCw,
  Download,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { ArticleStyle, ArticleTone, DataSourceType } from '../types';

// ============================================================
// TYPES
// ============================================================

export type QueueItemStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'paused';

export interface QueueItem {
  id: string;
  topic: string;
  status: QueueItemStatus;
  config: {
    sources: DataSourceType[];
    style: ArticleStyle;
    tone: ArticleTone;
    wordCount: number;
    autoFactCheck: boolean;
    autoBiasCheck: boolean;
    autoPublish: boolean;
  };
  progress: number;
  currentStep?: string;
  result?: {
    title: string;
    excerpt: string;
    wordCount: number;
    factCheckScore?: number;
    biasScore?: number;
    overallScore?: number;
  };
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  priority: number;
}

export interface BatchConfig {
  concurrency: number;  // How many articles to process simultaneously
  delayBetween: number; // Delay between starting new items (ms)
  autoStart: boolean;   // Auto-start new items
  stopOnError: boolean; // Stop queue on first error
  retryFailed: boolean; // Auto-retry failed items
  maxRetries: number;
}

interface ArticleQueueProps {
  onProcessItem: (item: QueueItem) => Promise<void>;
  onViewResult: (item: QueueItem) => void;
  defaultConfig?: Partial<QueueItem['config']>;
}

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_BATCH_CONFIG: BatchConfig = {
  concurrency: 1,
  delayBetween: 5000,
  autoStart: false,
  stopOnError: false,
  retryFailed: false,
  maxRetries: 2,
};

const DEFAULT_ITEM_CONFIG: QueueItem['config'] = {
  sources: ['google-news'],
  style: 'feature',
  tone: 'balanced',
  wordCount: 800,
  autoFactCheck: true,
  autoBiasCheck: true,
  autoPublish: false,
};

// ============================================================
// HELPERS
// ============================================================

function generateId(): string {
  return `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function getStatusColor(status: QueueItemStatus): string {
  switch (status) {
    case 'pending': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getStatusIcon(status: QueueItemStatus) {
  switch (status) {
    case 'pending': return <Clock className="h-4 w-4" />;
    case 'processing': return <Loader2 className="h-4 w-4 animate-spin" />;
    case 'completed': return <CheckCircle2 className="h-4 w-4" />;
    case 'failed': return <XCircle className="h-4 w-4" />;
    case 'paused': return <Pause className="h-4 w-4" />;
    default: return <AlertCircle className="h-4 w-4" />;
  }
}

// ============================================================
// COMPONENT
// ============================================================

export function ArticleQueue({
  onProcessItem,
  onViewResult,
  defaultConfig,
}: ArticleQueueProps) {
  // State
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [batchConfig, setBatchConfig] = useState<BatchConfig>(DEFAULT_BATCH_CONFIG);
  const [isRunning, setIsRunning] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newTopics, setNewTopics] = useState('');
  const [newItemConfig, setNewItemConfig] = useState<QueueItem['config']>({
    ...DEFAULT_ITEM_CONFIG,
    ...defaultConfig,
  });

  // Stats
  const stats = useMemo(() => {
    const total = queue.length;
    const pending = queue.filter(q => q.status === 'pending').length;
    const processing = queue.filter(q => q.status === 'processing').length;
    const completed = queue.filter(q => q.status === 'completed').length;
    const failed = queue.filter(q => q.status === 'failed').length;

    const completedItems = queue.filter(q => q.status === 'completed' && q.completedAt && q.startedAt);
    const avgTime = completedItems.length > 0
      ? completedItems.reduce((acc, q) => 
          acc + (new Date(q.completedAt!).getTime() - new Date(q.startedAt!).getTime()), 0
        ) / completedItems.length
      : 0;

    const avgScore = completedItems.length > 0
      ? completedItems.reduce((acc, q) => acc + (q.result?.overallScore || 0), 0) / completedItems.length
      : 0;

    return { total, pending, processing, completed, failed, avgTime, avgScore };
  }, [queue]);

  // Add single item
  const addItem = useCallback((topic: string) => {
    if (!topic.trim()) return;

    const item: QueueItem = {
      id: generateId(),
      topic: topic.trim(),
      status: 'pending',
      config: { ...newItemConfig },
      progress: 0,
      createdAt: new Date().toISOString(),
      priority: queue.length,
    };

    setQueue(prev => [...prev, item]);
    setNewTopic('');
  }, [newItemConfig, queue.length]);

  // Add bulk items
  const addBulkItems = useCallback(() => {
    const topics = newTopics.split('\n').map(t => t.trim()).filter(Boolean);
    
    const items: QueueItem[] = topics.map((topic, index) => ({
      id: generateId(),
      topic,
      status: 'pending' as const,
      config: { ...newItemConfig },
      progress: 0,
      createdAt: new Date().toISOString(),
      priority: queue.length + index,
    }));

    setQueue(prev => [...prev, ...items]);
    setNewTopics('');
    setShowAddDialog(false);
  }, [newTopics, newItemConfig, queue.length]);

  // Remove item
  const removeItem = useCallback((id: string) => {
    setQueue(prev => prev.filter(q => q.id !== id));
  }, []);

  // Clear completed
  const clearCompleted = useCallback(() => {
    setQueue(prev => prev.filter(q => q.status !== 'completed'));
  }, []);

  // Clear failed
  const clearFailed = useCallback(() => {
    setQueue(prev => prev.filter(q => q.status !== 'failed'));
  }, []);

  // Clear all
  const clearAll = useCallback(() => {
    setQueue([]);
    setIsRunning(false);
  }, []);

  // Move item in queue
  const moveItem = useCallback((id: string, direction: 'up' | 'down') => {
    setQueue(prev => {
      const index = prev.findIndex(q => q.id === id);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;

      const newQueue = [...prev];
      [newQueue[index], newQueue[newIndex]] = [newQueue[newIndex], newQueue[index]];
      return newQueue;
    });
  }, []);

  // Update item status
  const updateItem = useCallback((id: string, updates: Partial<QueueItem>) => {
    setQueue(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  }, []);

  // Process next item in queue
  const processNext = useCallback(async () => {
    const pendingItems = queue.filter(q => q.status === 'pending');
    const processingCount = queue.filter(q => q.status === 'processing').length;

    if (pendingItems.length === 0 || processingCount >= batchConfig.concurrency) {
      return;
    }

    const item = pendingItems[0];
    
    updateItem(item.id, {
      status: 'processing',
      startedAt: new Date().toISOString(),
      currentStep: 'Starting...',
    });

    try {
      await onProcessItem(item);
      updateItem(item.id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        progress: 100,
        currentStep: 'Complete',
      });
    } catch (error) {
      updateItem(item.id, {
        status: 'failed',
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        currentStep: 'Failed',
      });

      if (batchConfig.stopOnError) {
        setIsRunning(false);
      }
    }
  }, [queue, batchConfig, onProcessItem, updateItem]);

  // Start/stop queue processing
  const toggleRunning = useCallback(() => {
    setIsRunning(prev => !prev);
  }, []);

  // Skip current processing item
  const skipCurrent = useCallback(() => {
    const processingItem = queue.find(q => q.status === 'processing');
    if (processingItem) {
      updateItem(processingItem.id, {
        status: 'failed',
        error: 'Skipped by user',
        completedAt: new Date().toISOString(),
      });
    }
  }, [queue, updateItem]);

  // Retry failed item
  const retryItem = useCallback((id: string) => {
    updateItem(id, {
      status: 'pending',
      progress: 0,
      error: undefined,
      startedAt: undefined,
      completedAt: undefined,
      currentStep: undefined,
    });
  }, [updateItem]);

  // Retry all failed
  const retryAllFailed = useCallback(() => {
    queue
      .filter(q => q.status === 'failed')
      .forEach(q => retryItem(q.id));
  }, [queue, retryItem]);

  // Export queue
  const exportQueue = useCallback(() => {
    const data = JSON.stringify(queue, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `article-queue-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [queue]);

  // Import queue
  const importQueue = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (Array.isArray(data)) {
          setQueue(data);
        }
      } catch (err) {
        console.error('Failed to import queue:', err);
      }
    };
    reader.readAsText(file);
  }, []);

  // Auto-process when running
  React.useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      processNext();
    }, batchConfig.delayBetween);

    // Process immediately
    processNext();

    return () => clearInterval(interval);
  }, [isRunning, processNext, batchConfig.delayBetween]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-5 w-5" />
          <h3 className="font-semibold">Article Queue</h3>
          <Badge variant="outline">{queue.length} items</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={isRunning ? 'destructive' : 'default'} 
            size="sm"
            onClick={toggleRunning}
            disabled={queue.filter(q => q.status === 'pending').length === 0}
          >
            {isRunning ? (
              <>
                <Pause className="h-4 w-4 mr-1" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Start
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={skipCurrent}
            disabled={!queue.some(q => q.status === 'processing')}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
          <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Queue Settings</DialogTitle>
                <DialogDescription>
                  Configure batch processing behavior
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Concurrent Processing</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[batchConfig.concurrency]}
                      onValueChange={([v]) => setBatchConfig(prev => ({ ...prev, concurrency: v }))}
                      min={1}
                      max={5}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-8">{batchConfig.concurrency}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Delay Between Items (seconds)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[batchConfig.delayBetween / 1000]}
                      onValueChange={([v]) => setBatchConfig(prev => ({ ...prev, delayBetween: v * 1000 }))}
                      min={1}
                      max={30}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-8">{batchConfig.delayBetween / 1000}s</span>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label>Stop on Error</Label>
                  <Switch
                    checked={batchConfig.stopOnError}
                    onCheckedChange={(v) => setBatchConfig(prev => ({ ...prev, stopOnError: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Auto-retry Failed</Label>
                  <Switch
                    checked={batchConfig.retryFailed}
                    onCheckedChange={(v) => setBatchConfig(prev => ({ ...prev, retryFailed: v }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setShowSettingsDialog(false)}>Done</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="p-3">
          <div className="text-2xl font-bold">{stats.pending}</div>
          <div className="text-xs text-muted-foreground">Pending</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-blue-500">{stats.processing}</div>
          <div className="text-xs text-muted-foreground">Processing</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
          <div className="text-xs text-muted-foreground">Completed</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
          <div className="text-xs text-muted-foreground">Failed</div>
        </Card>
      </div>

      {stats.completed > 0 && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Avg Time: {formatDuration(stats.avgTime)}</span>
          <span>Avg Score: {Math.round(stats.avgScore)}%</span>
        </div>
      )}

      {/* Add Item Controls */}
      <div className="flex gap-2">
        <Input
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
          placeholder="Enter topic to add..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              addItem(newTopic);
            }
          }}
        />
        <Button onClick={() => addItem(newTopic)} disabled={!newTopic.trim()}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button variant="outline">
              Bulk Add
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Bulk Add Topics</DialogTitle>
              <DialogDescription>
                Enter one topic per line
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <textarea
                value={newTopics}
                onChange={(e) => setNewTopics(e.target.value)}
                placeholder="Topic 1&#10;Topic 2&#10;Topic 3..."
                className="w-full h-32 p-3 rounded-md border bg-background resize-none"
              />
              <Separator />
              <div className="space-y-3">
                <Label>Default Settings for All</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Style</Label>
                    <Select
                      value={newItemConfig.style}
                      onValueChange={(v) => setNewItemConfig(prev => ({ ...prev, style: v as ArticleStyle }))}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="feature">Feature</SelectItem>
                        <SelectItem value="investigative">Investigative</SelectItem>
                        <SelectItem value="breaking-news">Breaking News</SelectItem>
                        <SelectItem value="analysis">Analysis</SelectItem>
                        <SelectItem value="explainer">Explainer</SelectItem>
                        <SelectItem value="opinion">Opinion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tone</Label>
                    <Select
                      value={newItemConfig.tone}
                      onValueChange={(v) => setNewItemConfig(prev => ({ ...prev, tone: v as ArticleTone }))}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
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
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newItemConfig.autoFactCheck}
                      onCheckedChange={(v) => setNewItemConfig(prev => ({ ...prev, autoFactCheck: v }))}
                    />
                    <span className="text-sm">Auto Fact-Check</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newItemConfig.autoBiasCheck}
                      onCheckedChange={(v) => setNewItemConfig(prev => ({ ...prev, autoBiasCheck: v }))}
                    />
                    <span className="text-sm">Auto Bias-Check</span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={addBulkItems}
                disabled={!newTopics.trim()}
              >
                Add {newTopics.split('\n').filter(t => t.trim()).length} Topics
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Queue List */}
      <ScrollArea className="h-[400px]">
        {queue.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ListOrdered className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No items in queue</p>
            <p className="text-xs">Add topics above to start batch processing</p>
          </div>
        ) : (
          <div className="space-y-2">
            {queue.map((item, index) => (
              <Card key={item.id} className={item.status === 'processing' ? 'border-blue-500' : ''}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Drag Handle & Priority */}
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">#{index + 1}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getStatusColor(item.status)}>
                          {getStatusIcon(item.status)}
                          <span className="ml-1">{item.status}</span>
                        </Badge>
                        {item.result?.overallScore && (
                          <Badge variant="outline">
                            Score: {item.result.overallScore}%
                          </Badge>
                        )}
                      </div>
                      
                      <h4 className="font-medium text-sm truncate">{item.topic}</h4>
                      
                      {item.currentStep && item.status === 'processing' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.currentStep}
                        </p>
                      )}

                      {item.error && (
                        <p className="text-xs text-red-500 mt-1">
                          Error: {item.error}
                        </p>
                      )}

                      {item.status === 'processing' && (
                        <Progress value={item.progress} className="h-1 mt-2" />
                      )}

                      {item.result && (
                        <div className="text-xs text-muted-foreground mt-2">
                          {item.result.title} • {item.result.wordCount} words
                        </div>
                      )}

                      {/* Item config badges */}
                      <div className="flex gap-1 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {item.config.style}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {item.config.tone}
                        </Badge>
                        {item.config.autoPublish && (
                          <Badge variant="outline" className="text-xs text-green-600">
                            Auto-publish
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1">
                      {item.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveItem(item.id, 'up')}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveItem(item.id, 'down')}
                            disabled={index === queue.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {item.status === 'completed' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onViewResult(item)}
                        >
                          View
                        </Button>
                      )}
                      {item.status === 'failed' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => retryItem(item.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      {item.status !== 'processing' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer Actions */}
      {queue.length > 0 && (
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex gap-2">
            {stats.failed > 0 && (
              <Button variant="outline" size="sm" onClick={retryAllFailed}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry Failed ({stats.failed})
              </Button>
            )}
            {stats.completed > 0 && (
              <Button variant="outline" size="sm" onClick={clearCompleted}>
                Clear Completed
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={exportQueue}>
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
            <label>
              <Button variant="ghost" size="sm" asChild>
                <span>
                  <Upload className="h-3 w-3 mr-1" />
                  Import
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={importQueue}
              />
            </label>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive">
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Queue Items?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all {queue.length} items from the queue. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearAll}>Clear All</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArticleQueue;
