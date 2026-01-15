// Source Attribution Component
// Display and manage sources, citations, and verification links

import React, { useState, useMemo } from 'react';
import {
  ExternalLink,
  Link2,
  Quote,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  FileText,
  Globe,
  Clock,
  AlertCircle,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// ============================================================
// TYPES
// ============================================================

export type CitationStyle = 'inline' | 'footnote' | 'ap-style' | 'chicago';

export interface SourceInfo {
  id: string;
  title: string;
  url: string;
  source: string;       // Publisher name
  author?: string;
  publishedAt: string;
  accessedAt?: string;
  verified?: boolean;
  verificationStatus?: 'verified' | 'unverified' | 'disputed';
  excerpt?: string;     // Relevant excerpt from source
}

export interface CitationFormat {
  style: CitationStyle;
  inlineFormat: (source: SourceInfo, index: number) => string;
  referenceFormat: (source: SourceInfo, index: number) => string;
  description: string;
}

interface SourceAttributionProps {
  sources: SourceInfo[];
  articleBody: string;
  onInsertCitation?: (citation: string, sourceIndex: number) => void;
  onCitationStyleChange?: (style: CitationStyle) => void;
  currentCitationStyle?: CitationStyle;
}

// ============================================================
// CITATION FORMATTERS
// ============================================================

const CITATION_FORMATS: Record<CitationStyle, CitationFormat> = {
  'inline': {
    style: 'inline',
    description: 'Simple inline citations (Source Name)',
    inlineFormat: (source, index) => `(${source.source})`,
    referenceFormat: (source, index) => 
      `${source.source}. "${source.title}." ${new Date(source.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. ${source.url}`,
  },
  'footnote': {
    style: 'footnote',
    description: 'Numbered footnotes [1]',
    inlineFormat: (source, index) => `[${index + 1}]`,
    referenceFormat: (source, index) =>
      `[${index + 1}] ${source.author ? `${source.author}. ` : ''}"${source.title}." ${source.source}, ${new Date(source.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. ${source.url}`,
  },
  'ap-style': {
    style: 'ap-style',
    description: 'AP Style (according to Source)',
    inlineFormat: (source, index) => `according to ${source.source}`,
    referenceFormat: (source, index) =>
      `${source.source}: "${source.title}" (${new Date(source.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`,
  },
  'chicago': {
    style: 'chicago',
    description: 'Chicago Manual of Style',
    inlineFormat: (source, index) => `(${source.source} ${new Date(source.publishedAt).getFullYear()})`,
    referenceFormat: (source, index) => {
      const date = new Date(source.publishedAt);
      const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      return `${source.author ? `${source.author}. ` : ''}"${source.title}." ${source.source}. ${dateStr}. ${source.url}`;
    },
  },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getVerificationBadge(status?: string) {
  switch (status) {
    case 'verified':
      return <Badge className="bg-green-500 text-white"><Shield className="h-3 w-3 mr-1" /> Verified</Badge>;
    case 'disputed':
      return <Badge className="bg-yellow-500 text-black"><AlertCircle className="h-3 w-3 mr-1" /> Disputed</Badge>;
    case 'unverified':
      return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" /> Unverified</Badge>;
    default:
      return null;
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function SourceAttribution({
  sources,
  articleBody,
  onInsertCitation,
  onCitationStyleChange,
  currentCitationStyle = 'ap-style',
}: SourceAttributionProps) {
  const [citationStyle, setCitationStyle] = useState<CitationStyle>(currentCitationStyle);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const citationFormat = CITATION_FORMATS[citationStyle];
  
  // Generate all citations
  const citations = useMemo(() => 
    sources.map((source, index) => ({
      source,
      inline: citationFormat.inlineFormat(source, index),
      reference: citationFormat.referenceFormat(source, index),
    })),
    [sources, citationFormat]
  );
  
  // Full references section
  const referencesSection = useMemo(() => 
    citations.map(c => c.reference).join('\n\n'),
    [citations]
  );
  
  // Handle copy
  const handleCopy = async (text: string, index: number) => {
    await copyToClipboard(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };
  
  // Toggle source expansion
  const toggleExpanded = (sourceId: string) => {
    setExpandedSources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sourceId)) {
        newSet.delete(sourceId);
      } else {
        newSet.add(sourceId);
      }
      return newSet;
    });
  };
  
  // Handle citation style change
  const handleStyleChange = (style: CitationStyle) => {
    setCitationStyle(style);
    onCitationStyleChange?.(style);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Sources & Citations
            </CardTitle>
            <CardDescription>
              {sources.length} source{sources.length !== 1 ? 's' : ''} referenced
            </CardDescription>
          </div>
          
          {/* Citation Style Selector */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Style:</Label>
            <Select value={citationStyle} onValueChange={handleStyleChange}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(CITATION_FORMATS).map(format => (
                  <SelectItem key={format.style} value={format.style}>
                    {format.style.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="sources">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="citations">Citations</TabsTrigger>
            <TabsTrigger value="references">References</TabsTrigger>
          </TabsList>
          
          {/* Sources Tab */}
          <TabsContent value="sources">
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {sources.map((source, index) => (
                  <Collapsible
                    key={source.id}
                    open={expandedSources.has(source.id)}
                    onOpenChange={() => toggleExpanded(source.id)}
                  >
                    <div className="border rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <button className="w-full p-3 flex items-start justify-between gap-2 hover:bg-muted/50 transition-colors text-left">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                [{index + 1}]
                              </Badge>
                              <span className="font-medium text-sm text-primary">
                                {source.source}
                              </span>
                              {getVerificationBadge(source.verificationStatus)}
                            </div>
                            <p className="text-sm truncate">{source.title}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{formatRelativeTime(source.publishedAt)}</span>
                              {source.author && (
                                <>
                                  <span>•</span>
                                  <span>{source.author}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {expandedSources.has(source.id) ? (
                            <ChevronUp className="h-4 w-4 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 flex-shrink-0" />
                          )}
                        </button>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="px-3 pb-3 space-y-3 border-t bg-muted/30">
                          <div className="pt-3">
                            <Label className="text-xs text-muted-foreground">URL</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="flex-1 text-xs bg-background p-2 rounded truncate">
                                {source.url}
                              </code>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => window.open(source.url, '_blank')}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Open source</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                          
                          {source.excerpt && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Relevant Excerpt</Label>
                              <p className="text-xs mt-1 p-2 bg-background rounded italic">
                                "{source.excerpt}"
                              </p>
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleCopy(citations[index].inline, index)}
                            >
                              {copiedIndex === index ? (
                                <><Check className="h-3 w-3 mr-1" /> Copied</>
                              ) : (
                                <><Copy className="h-3 w-3 mr-1" /> Copy Citation</>
                              )}
                            </Button>
                            {onInsertCitation && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="flex-1"
                                onClick={() => onInsertCitation(citations[index].inline, index)}
                              >
                                <Quote className="h-3 w-3 mr-1" />
                                Insert
                              </Button>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          {/* Citations Tab */}
          <TabsContent value="citations">
            <div className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">
                  {citationFormat.description}
                </p>
                <div className="text-sm font-medium">
                  Example: "The report shows significant growth {citationFormat.inlineFormat(sources[0] || { source: 'Source Name', title: '', url: '', publishedAt: new Date().toISOString(), id: '' }, 0)}"
                </div>
              </div>
              
              <Separator />
              
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {citations.map((citation, index) => (
                    <div
                      key={citation.source.id}
                      className="flex items-center justify-between p-2 rounded border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {citation.inline}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {citation.source.source}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleCopy(citation.inline, index)}
                              >
                                {copiedIndex === index ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy citation</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {onInsertCitation && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => onInsertCitation(citation.inline, index)}
                                >
                                  <Quote className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Insert into article</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
          
          {/* References Tab */}
          <TabsContent value="references">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Full Reference List</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(referencesSection, -1)}
                >
                  {copiedIndex === -1 ? (
                    <><Check className="h-3 w-3 mr-1" /> Copied</>
                  ) : (
                    <><Copy className="h-3 w-3 mr-1" /> Copy All</>
                  )}
                </Button>
              </div>
              
              <ScrollArea className="h-[250px]">
                <div className="space-y-3 p-3 bg-muted/30 rounded-lg font-mono text-xs">
                  {citations.map((citation, index) => (
                    <div key={citation.source.id} className="pb-2 border-b last:border-0">
                      {citation.reference}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <p className="text-xs text-muted-foreground">
                Copy this section to add to the bottom of your article.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ============================================================
// INLINE CITATION COMPONENT (for use in editor)
// ============================================================

interface InlineCitationProps {
  citation: string;
  sourceIndex: number;
  sourceTitle: string;
  onRemove?: () => void;
}

export function InlineCitation({
  citation,
  sourceIndex,
  sourceTitle,
  onRemove,
}: InlineCitationProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center px-1 py-0.5 mx-0.5 rounded bg-primary/10 text-primary text-sm cursor-help">
            {citation}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs max-w-xs">{sourceTitle}</p>
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-1 h-6 text-xs"
              onClick={onRemove}
            >
              Remove citation
            </Button>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default SourceAttribution;
