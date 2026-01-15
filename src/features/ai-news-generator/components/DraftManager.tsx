// Version History & Draft Management Component
// Allows saving drafts, viewing version history, and comparing versions

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  History,
  Save,
  Clock,
  ArrowLeftRight,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  File,
  FileText,
  Undo2,
  RotateCcw,
  Eye,
  Copy,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ============================================================
// TYPES
// ============================================================

export interface ArticleDraft {
  id: string;
  name: string;
  title: string;
  excerpt: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  autoSaved: boolean;
  metadata?: {
    stage: string;
    factCheckScore?: number;
    biasScore?: number;
    wordCount: number;
  };
}

export interface ArticleVersion {
  id: string;
  version: number;
  title: string;
  excerpt: string;
  body: string;
  timestamp: string;
  changeType: 'create' | 'edit' | 'regenerate' | 'auto-save';
  changeDescription?: string;
  wordCount: number;
  delta?: {
    added: number;
    removed: number;
  };
}

interface DraftManagerProps {
  currentArticle: {
    title: string;
    excerpt: string;
    body: string;
  };
  currentStage?: string;
  factCheckScore?: number;
  biasScore?: number;
  onRestoreDraft: (draft: ArticleDraft) => void;
  onRestoreVersion: (version: ArticleVersion) => void;
}

// ============================================================
// LOCAL STORAGE HELPERS
// ============================================================

const DRAFT_STORAGE_KEY = 'resonance_article_drafts';
const VERSION_STORAGE_KEY = 'resonance_article_versions';
const MAX_DRAFTS = 20;
const MAX_VERSIONS = 50;
const AUTO_SAVE_INTERVAL = 60000; // 1 minute

function loadDrafts(): ArticleDraft[] {
  try {
    const data = localStorage.getItem(DRAFT_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveDrafts(drafts: ArticleDraft[]): void {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts.slice(0, MAX_DRAFTS)));
  } catch (e) {
    console.error('Failed to save drafts:', e);
  }
}

function loadVersions(): ArticleVersion[] {
  try {
    const data = localStorage.getItem(VERSION_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveVersions(versions: ArticleVersion[]): void {
  try {
    localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(versions.slice(0, MAX_VERSIONS)));
  } catch (e) {
    console.error('Failed to save versions:', e);
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================
// DIFF HELPERS
// ============================================================

function calculateDelta(oldText: string, newText: string): { added: number; removed: number } {
  const oldWords = oldText.split(/\s+/).filter(Boolean);
  const newWords = newText.split(/\s+/).filter(Boolean);
  
  const oldSet = new Set(oldWords);
  const newSet = new Set(newWords);
  
  let added = 0;
  let removed = 0;
  
  newWords.forEach(word => {
    if (!oldSet.has(word)) added++;
  });
  
  oldWords.forEach(word => {
    if (!newSet.has(word)) removed++;
  });
  
  return { added, removed };
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

// ============================================================
// COMPONENT
// ============================================================

export function DraftManager({
  currentArticle,
  currentStage,
  factCheckScore,
  biasScore,
  onRestoreDraft,
  onRestoreVersion,
}: DraftManagerProps) {
  const [drafts, setDrafts] = useState<ArticleDraft[]>(() => loadDrafts());
  const [versions, setVersions] = useState<ArticleVersion[]>(() => loadVersions());
  const [saveDraftName, setSaveDraftName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersions, setCompareVersions] = useState<[string | null, string | null]>([null, null]);
  const [lastAutoSave, setLastAutoSave] = useState<string | null>(null);
  const [expandedDraft, setExpandedDraft] = useState<string | null>(null);

  // Auto-save functionality
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentArticle.title || currentArticle.body) {
        autoSaveDraft();
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [currentArticle]);

  // Save a new version whenever article changes significantly
  const saveVersion = useCallback((changeType: ArticleVersion['changeType'], description?: string) => {
    const lastVersion = versions[0];
    
    // Skip if content hasn't changed
    if (lastVersion && 
        lastVersion.title === currentArticle.title && 
        lastVersion.body === currentArticle.body) {
      return;
    }

    const newVersion: ArticleVersion = {
      id: generateId(),
      version: (lastVersion?.version || 0) + 1,
      title: currentArticle.title,
      excerpt: currentArticle.excerpt,
      body: currentArticle.body,
      timestamp: new Date().toISOString(),
      changeType,
      changeDescription: description,
      wordCount: currentArticle.body.split(/\s+/).filter(Boolean).length,
      delta: lastVersion ? calculateDelta(lastVersion.body, currentArticle.body) : undefined,
    };

    const newVersions = [newVersion, ...versions].slice(0, MAX_VERSIONS);
    setVersions(newVersions);
    saveVersions(newVersions);
  }, [currentArticle, versions]);

  // Auto-save draft
  const autoSaveDraft = useCallback(() => {
    // Find or create auto-save draft
    const existingAutoSave = drafts.find(d => d.autoSaved);
    
    const draft: ArticleDraft = {
      id: existingAutoSave?.id || generateId(),
      name: 'Auto-save',
      title: currentArticle.title,
      excerpt: currentArticle.excerpt,
      body: currentArticle.body,
      createdAt: existingAutoSave?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: (existingAutoSave?.version || 0) + 1,
      autoSaved: true,
      metadata: {
        stage: currentStage || 'unknown',
        factCheckScore,
        biasScore,
        wordCount: currentArticle.body.split(/\s+/).filter(Boolean).length,
      },
    };

    const newDrafts = existingAutoSave
      ? drafts.map(d => d.id === existingAutoSave.id ? draft : d)
      : [draft, ...drafts];

    setDrafts(newDrafts.slice(0, MAX_DRAFTS));
    saveDrafts(newDrafts);
    setLastAutoSave(new Date().toISOString());
  }, [currentArticle, currentStage, factCheckScore, biasScore, drafts]);

  // Manual save draft
  const saveDraftManually = useCallback(() => {
    const draft: ArticleDraft = {
      id: generateId(),
      name: saveDraftName || `Draft ${drafts.length + 1}`,
      title: currentArticle.title,
      excerpt: currentArticle.excerpt,
      body: currentArticle.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      autoSaved: false,
      metadata: {
        stage: currentStage || 'unknown',
        factCheckScore,
        biasScore,
        wordCount: currentArticle.body.split(/\s+/).filter(Boolean).length,
      },
    };

    const newDrafts = [draft, ...drafts].slice(0, MAX_DRAFTS);
    setDrafts(newDrafts);
    saveDrafts(newDrafts);
    setSaveDraftName('');
    setShowSaveDialog(false);

    // Also save as version
    saveVersion('create', `Saved as draft: ${draft.name}`);
  }, [currentArticle, currentStage, factCheckScore, biasScore, drafts, saveDraftName, saveVersion]);

  // Delete draft
  const deleteDraft = useCallback((id: string) => {
    const newDrafts = drafts.filter(d => d.id !== id);
    setDrafts(newDrafts);
    saveDrafts(newDrafts);
  }, [drafts]);

  // Clear all drafts
  const clearAllDrafts = useCallback(() => {
    setDrafts([]);
    saveDrafts([]);
  }, []);

  // Clear version history
  const clearVersionHistory = useCallback(() => {
    setVersions([]);
    saveVersions([]);
  }, []);

  // Export drafts
  const exportDrafts = useCallback(() => {
    const data = JSON.stringify({ drafts, versions }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resonance-drafts-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [drafts, versions]);

  // Import drafts
  const importDrafts = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.drafts) {
          setDrafts(data.drafts);
          saveDrafts(data.drafts);
        }
        if (data.versions) {
          setVersions(data.versions);
          saveVersions(data.versions);
        }
      } catch (err) {
        console.error('Failed to import drafts:', err);
      }
    };
    reader.readAsText(file);
  }, []);

  // Get versions for comparison
  const getVersionsForComparison = useMemo(() => {
    if (!compareVersions[0] || !compareVersions[1]) return null;
    
    const v1 = versions.find(v => v.id === compareVersions[0]);
    const v2 = versions.find(v => v.id === compareVersions[1]);
    
    if (!v1 || !v2) return null;
    
    return { older: v1.timestamp < v2.timestamp ? v1 : v2, newer: v1.timestamp < v2.timestamp ? v2 : v1 };
  }, [compareVersions, versions]);

  // Get change type badge color
  const getChangeTypeBadge = (type: ArticleVersion['changeType']) => {
    switch (type) {
      case 'create': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'edit': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'regenerate': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'auto-save': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <h3 className="font-semibold">Drafts & History</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Save Draft Button */}
          <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Save className="h-4 w-4 mr-1" />
                Save Draft
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Draft</DialogTitle>
                <DialogDescription>
                  Give your draft a name to easily find it later
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="draftName">Draft Name</Label>
                <Input
                  id="draftName"
                  value={saveDraftName}
                  onChange={(e) => setSaveDraftName(e.target.value)}
                  placeholder={`Draft ${drafts.length + 1}`}
                  className="mt-2"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={saveDraftManually}>
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Export/Import */}
          <Button variant="ghost" size="sm" onClick={exportDrafts}>
            <Download className="h-4 w-4" />
          </Button>
          <label>
            <Button variant="ghost" size="sm" asChild>
              <span>
                <Upload className="h-4 w-4" />
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={importDrafts}
            />
          </label>
        </div>
      </div>

      {/* Auto-save indicator */}
      {lastAutoSave && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          <span>Auto-saved {formatTimeAgo(lastAutoSave)}</span>
        </div>
      )}

      {/* Tabs for Drafts and History */}
      <Tabs defaultValue="drafts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="drafts">
            Drafts ({drafts.filter(d => !d.autoSaved).length})
          </TabsTrigger>
          <TabsTrigger value="history">
            History ({versions.length})
          </TabsTrigger>
        </TabsList>

        {/* Drafts Tab */}
        <TabsContent value="drafts" className="mt-4">
          <ScrollArea className="h-[400px]">
            {drafts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No drafts saved yet</p>
                <p className="text-xs">Click "Save Draft" to create one</p>
              </div>
            ) : (
              <div className="space-y-2">
                {drafts.map((draft) => (
                  <Card 
                    key={draft.id} 
                    className={`cursor-pointer transition-colors ${
                      draft.autoSaved ? 'border-dashed' : ''
                    }`}
                  >
                    <CardHeader className="p-3">
                      <div 
                        className="flex items-start justify-between"
                        onClick={() => setExpandedDraft(
                          expandedDraft === draft.id ? null : draft.id
                        )}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {expandedDraft === draft.id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <CardTitle className="text-sm">
                              {draft.name}
                              {draft.autoSaved && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Auto
                                </Badge>
                              )}
                            </CardTitle>
                          </div>
                          <CardDescription className="text-xs mt-1 ml-6">
                            {draft.title.slice(0, 50)}...
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            {formatTimeAgo(draft.updatedAt)}
                          </div>
                          {draft.metadata && (
                            <div className="text-xs text-muted-foreground">
                              {draft.metadata.wordCount} words
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {expandedDraft === draft.id && (
                      <CardContent className="p-3 pt-0">
                        <Separator className="mb-3" />
                        
                        {/* Preview */}
                        <div className="p-2 rounded bg-muted/50 text-xs mb-3 max-h-24 overflow-hidden">
                          {draft.body.slice(0, 200)}...
                        </div>

                        {/* Metadata */}
                        {draft.metadata && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant="outline" className="text-xs">
                              Stage: {draft.metadata.stage}
                            </Badge>
                            {draft.metadata.factCheckScore !== undefined && (
                              <Badge variant="outline" className="text-xs">
                                Fact: {draft.metadata.factCheckScore}%
                              </Badge>
                            )}
                            {draft.metadata.biasScore !== undefined && (
                              <Badge variant="outline" className="text-xs">
                                Bias: {draft.metadata.biasScore}%
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => onRestoreDraft(draft)}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Restore
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(draft.body);
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. The draft will be permanently deleted.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteDraft(draft.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Clear all drafts */}
          {drafts.length > 0 && (
            <div className="pt-3 border-t mt-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive">
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear All Drafts
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear All Drafts?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete all {drafts.length} drafts. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={clearAllDrafts}>
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          {/* Compare mode toggle */}
          <div className="flex items-center justify-between mb-3">
            <Button
              variant={compareMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setCompareMode(!compareMode);
                setCompareVersions([null, null]);
              }}
            >
              <ArrowLeftRight className="h-4 w-4 mr-1" />
              {compareMode ? 'Exit Compare' : 'Compare Versions'}
            </Button>
            {compareMode && compareVersions[0] && compareVersions[1] && (
              <Button size="sm" onClick={() => setCompareVersions([null, null])}>
                <X className="h-4 w-4 mr-1" />
                Clear Selection
              </Button>
            )}
          </div>

          {/* Compare View */}
          {compareMode && getVersionsForComparison && (
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Version Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {/* Older version */}
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      Version {getVersionsForComparison.older.version} ({formatTimeAgo(getVersionsForComparison.older.timestamp)})
                    </div>
                    <ScrollArea className="h-48 rounded border p-2">
                      <div className="text-sm whitespace-pre-wrap">
                        {getVersionsForComparison.older.body}
                      </div>
                    </ScrollArea>
                  </div>
                  {/* Newer version */}
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      Version {getVersionsForComparison.newer.version} ({formatTimeAgo(getVersionsForComparison.newer.timestamp)})
                    </div>
                    <ScrollArea className="h-48 rounded border p-2">
                      <div className="text-sm whitespace-pre-wrap">
                        {getVersionsForComparison.newer.body}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
                {/* Change stats */}
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="text-green-600">
                    +{getVersionsForComparison.newer.delta?.added || 0} words added
                  </span>
                  <span className="text-red-600">
                    -{getVersionsForComparison.newer.delta?.removed || 0} words removed
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <ScrollArea className="h-[350px]">
            {versions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No version history yet</p>
                <p className="text-xs">Changes will be tracked automatically</p>
              </div>
            ) : (
              <div className="space-y-1">
                {versions.map((version, index) => (
                  <div
                    key={version.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      compareMode 
                        ? compareVersions.includes(version.id)
                          ? 'border-primary bg-primary/10'
                          : 'hover:bg-muted/50 cursor-pointer'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => {
                      if (compareMode) {
                        if (compareVersions[0] === null) {
                          setCompareVersions([version.id, null]);
                        } else if (compareVersions[1] === null && compareVersions[0] !== version.id) {
                          setCompareVersions([compareVersions[0], version.id]);
                        } else if (compareVersions.includes(version.id)) {
                          setCompareVersions(
                            compareVersions.map(v => v === version.id ? null : v) as [string | null, string | null]
                          );
                        }
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {version.version}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {version.title.slice(0, 30)}...
                            </span>
                            <Badge className={`text-xs ${getChangeTypeBadge(version.changeType)}`}>
                              {version.changeType}
                            </Badge>
                          </div>
                          {version.changeDescription && (
                            <p className="text-xs text-muted-foreground">
                              {version.changeDescription}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">
                          {formatTimeAgo(version.timestamp)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {version.wordCount} words
                        </div>
                        {version.delta && (
                          <div className="text-xs">
                            <span className="text-green-600">+{version.delta.added}</span>
                            {' / '}
                            <span className="text-red-600">-{version.delta.removed}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {!compareMode && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRestoreVersion(version);
                          }}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(version.body);
                          }}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Clear history */}
          {versions.length > 0 && (
            <div className="pt-3 border-t mt-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive">
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear History
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Version History?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete all {versions.length} versions. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={clearVersionHistory}>
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DraftManager;
