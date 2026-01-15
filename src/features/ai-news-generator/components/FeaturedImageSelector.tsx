// Featured Image Component
// Image selection, upload, and AI suggestion workflow

import React, { useState, useCallback } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Link2,
  Sparkles,
  X,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  Camera,
  Edit2,
  Trash2,
  Loader2,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AspectRatio } from '@/components/ui/aspect-ratio';

// ============================================================
// TYPES
// ============================================================

export interface FeaturedImage {
  url: string;
  alt: string;
  caption?: string;
  credit?: string;
  width?: number;
  height?: number;
  source?: 'upload' | 'url' | 'unsplash' | 'ai-generated';
}

interface ImageSuggestion {
  id: string;
  url: string;
  thumbnailUrl: string;
  alt: string;
  credit: string;
  source: string;
  relevanceScore: number;
}

interface FeaturedImageSelectorProps {
  currentImage?: FeaturedImage;
  articleTitle: string;
  articleExcerpt?: string;
  onImageSelect: (image: FeaturedImage | undefined) => void;
  onGenerateSuggestion?: () => Promise<ImageSuggestion[]>;
}

// ============================================================
// PLACEHOLDER IMAGES (Unsplash-style URLs for demo)
// ============================================================

const PLACEHOLDER_IMAGES: ImageSuggestion[] = [
  {
    id: '1',
    url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c',
    thumbnailUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=300',
    alt: 'News and journalism concept',
    credit: 'Unsplash',
    source: 'unsplash',
    relevanceScore: 95,
  },
  {
    id: '2',
    url: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167',
    thumbnailUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=300',
    alt: 'Technology and digital news',
    credit: 'Unsplash',
    source: 'unsplash',
    relevanceScore: 88,
  },
  {
    id: '3',
    url: 'https://images.unsplash.com/photo-1495020689067-958852a7765e',
    thumbnailUrl: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=300',
    alt: 'Breaking news concept',
    credit: 'Unsplash',
    source: 'unsplash',
    relevanceScore: 82,
  },
  {
    id: '4',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300',
    alt: 'Technology circuit board',
    credit: 'Unsplash',
    source: 'unsplash',
    relevanceScore: 75,
  },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export function FeaturedImageSelector({
  currentImage,
  articleTitle,
  articleExcerpt,
  onImageSelect,
  onGenerateSuggestion,
}: FeaturedImageSelectorProps) {
  // State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'url' | 'upload'>('suggestions');
  const [urlInput, setUrlInput] = useState('');
  const [altText, setAltText] = useState(currentImage?.alt || '');
  const [caption, setCaption] = useState(currentImage?.caption || '');
  const [credit, setCredit] = useState(currentImage?.credit || '');
  const [suggestions, setSuggestions] = useState<ImageSuggestion[]>(PLACEHOLDER_IMAGES);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ImageSuggestion | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load AI suggestions
  const loadSuggestions = useCallback(async () => {
    if (!onGenerateSuggestion) {
      // Use placeholder suggestions
      setSuggestions(PLACEHOLDER_IMAGES);
      return;
    }

    setIsLoadingSuggestions(true);
    setError(null);
    
    try {
      const newSuggestions = await onGenerateSuggestion();
      setSuggestions(newSuggestions);
    } catch (err) {
      setError('Failed to load image suggestions');
      setSuggestions(PLACEHOLDER_IMAGES);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [onGenerateSuggestion]);

  // Handle URL input
  const handleUrlSubmit = useCallback(() => {
    if (!urlInput.trim()) {
      setError('Please enter a URL');
      return;
    }

    try {
      new URL(urlInput);
      setPreviewUrl(urlInput);
      setError(null);
    } catch {
      setError('Invalid URL format');
    }
  }, [urlInput]);

  // Handle image selection
  const handleSelectImage = useCallback((source: 'suggestion' | 'url') => {
    let newImage: FeaturedImage;

    if (source === 'suggestion' && selectedSuggestion) {
      newImage = {
        url: selectedSuggestion.url,
        alt: altText || selectedSuggestion.alt,
        caption: caption || undefined,
        credit: credit || selectedSuggestion.credit,
        source: selectedSuggestion.source as any,
      };
    } else if (source === 'url' && previewUrl) {
      newImage = {
        url: previewUrl,
        alt: altText || articleTitle,
        caption: caption || undefined,
        credit: credit || undefined,
        source: 'url',
      };
    } else {
      return;
    }

    onImageSelect(newImage);
    setIsDialogOpen(false);
    resetForm();
  }, [selectedSuggestion, previewUrl, altText, caption, credit, articleTitle, onImageSelect]);

  // Reset form state
  const resetForm = useCallback(() => {
    setSelectedSuggestion(null);
    setPreviewUrl(null);
    setUrlInput('');
    setAltText(currentImage?.alt || '');
    setCaption(currentImage?.caption || '');
    setCredit(currentImage?.credit || '');
    setError(null);
  }, [currentImage]);

  // Remove current image
  const handleRemoveImage = useCallback(() => {
    onImageSelect(undefined);
  }, [onImageSelect]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Featured Image
        </CardTitle>
        <CardDescription>
          {currentImage ? 'Image selected' : 'Add a featured image for this article'}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Current Image Preview */}
        {currentImage ? (
          <div className="space-y-3">
            <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg overflow-hidden">
              <img
                src={currentImage.url}
                alt={currentImage.alt}
                className="object-cover w-full h-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
            </AspectRatio>
            
            <div className="space-y-1">
              <p className="text-sm font-medium">{currentImage.alt}</p>
              {currentImage.caption && (
                <p className="text-xs text-muted-foreground">{currentImage.caption}</p>
              )}
              {currentImage.credit && (
                <p className="text-xs text-muted-foreground">
                  Credit: {currentImage.credit}
                </p>
              )}
              <Badge variant="outline" className="text-xs">
                {currentImage.source || 'External'}
              </Badge>
            </div>
            
            <div className="flex gap-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit2 className="h-3 w-3 mr-1" />
                    Change
                  </Button>
                </DialogTrigger>
                <ImageSelectorDialog
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  suggestions={suggestions}
                  isLoadingSuggestions={isLoadingSuggestions}
                  loadSuggestions={loadSuggestions}
                  selectedSuggestion={selectedSuggestion}
                  setSelectedSuggestion={setSelectedSuggestion}
                  urlInput={urlInput}
                  setUrlInput={setUrlInput}
                  previewUrl={previewUrl}
                  handleUrlSubmit={handleUrlSubmit}
                  altText={altText}
                  setAltText={setAltText}
                  caption={caption}
                  setCaption={setCaption}
                  credit={credit}
                  setCredit={setCredit}
                  error={error}
                  handleSelectImage={handleSelectImage}
                  articleTitle={articleTitle}
                />
              </Dialog>
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={handleRemoveImage}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full h-32 flex flex-col gap-2">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm">Add Featured Image</span>
              </Button>
            </DialogTrigger>
            <ImageSelectorDialog
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              suggestions={suggestions}
              isLoadingSuggestions={isLoadingSuggestions}
              loadSuggestions={loadSuggestions}
              selectedSuggestion={selectedSuggestion}
              setSelectedSuggestion={setSelectedSuggestion}
              urlInput={urlInput}
              setUrlInput={setUrlInput}
              previewUrl={previewUrl}
              handleUrlSubmit={handleUrlSubmit}
              altText={altText}
              setAltText={setAltText}
              caption={caption}
              setCaption={setCaption}
              credit={credit}
              setCredit={setCredit}
              error={error}
              handleSelectImage={handleSelectImage}
              articleTitle={articleTitle}
            />
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// DIALOG COMPONENT
// ============================================================

interface ImageSelectorDialogProps {
  activeTab: 'suggestions' | 'url' | 'upload';
  setActiveTab: (tab: 'suggestions' | 'url' | 'upload') => void;
  suggestions: ImageSuggestion[];
  isLoadingSuggestions: boolean;
  loadSuggestions: () => void;
  selectedSuggestion: ImageSuggestion | null;
  setSelectedSuggestion: (s: ImageSuggestion | null) => void;
  urlInput: string;
  setUrlInput: (s: string) => void;
  previewUrl: string | null;
  handleUrlSubmit: () => void;
  altText: string;
  setAltText: (s: string) => void;
  caption: string;
  setCaption: (s: string) => void;
  credit: string;
  setCredit: (s: string) => void;
  error: string | null;
  handleSelectImage: (source: 'suggestion' | 'url') => void;
  articleTitle: string;
}

function ImageSelectorDialog({
  activeTab,
  setActiveTab,
  suggestions,
  isLoadingSuggestions,
  loadSuggestions,
  selectedSuggestion,
  setSelectedSuggestion,
  urlInput,
  setUrlInput,
  previewUrl,
  handleUrlSubmit,
  altText,
  setAltText,
  caption,
  setCaption,
  credit,
  setCredit,
  error,
  handleSelectImage,
  articleTitle,
}: ImageSelectorDialogProps) {
  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Select Featured Image</DialogTitle>
        <DialogDescription>
          Choose an image from suggestions, enter a URL, or upload your own
        </DialogDescription>
      </DialogHeader>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="suggestions">
            <Sparkles className="h-4 w-4 mr-2" />
            Suggestions
          </TabsTrigger>
          <TabsTrigger value="url">
            <Link2 className="h-4 w-4 mr-2" />
            From URL
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </TabsTrigger>
        </TabsList>

        {/* Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              AI-suggested images based on article content
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSuggestions}
              disabled={isLoadingSuggestions}
            >
              {isLoadingSuggestions ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              Refresh
            </Button>
          </div>

          <ScrollArea className="h-[300px]">
            <div className="grid grid-cols-2 gap-3">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                    selectedSuggestion?.id === suggestion.id
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-transparent hover:border-muted-foreground/20'
                  }`}
                  onClick={() => setSelectedSuggestion(suggestion)}
                >
                  <AspectRatio ratio={16 / 9}>
                    <img
                      src={suggestion.thumbnailUrl}
                      alt={suggestion.alt}
                      className="object-cover w-full h-full"
                    />
                  </AspectRatio>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-xs text-white truncate">{suggestion.alt}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px]">
                        {suggestion.source}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {suggestion.relevanceScore}% match
                      </Badge>
                    </div>
                  </div>
                  {selectedSuggestion?.id === suggestion.id && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {selectedSuggestion && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label className="text-xs">Alt Text</Label>
                <Input
                  value={altText || selectedSuggestion.alt}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Describe the image for accessibility"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Caption (optional)</Label>
                  <Input
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Image caption"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Credit</Label>
                  <Input
                    value={credit || selectedSuggestion.credit}
                    onChange={(e) => setCredit(e.target.value)}
                    placeholder="Photo credit"
                  />
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* URL Tab */}
        <TabsContent value="url" className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="flex-1"
            />
            <Button onClick={handleUrlSubmit}>
              <Search className="h-4 w-4 mr-1" />
              Load
            </Button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {previewUrl && (
            <div className="space-y-3">
              <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="object-cover w-full h-full"
                  onError={() => setUrlInput('')}
                />
              </AspectRatio>

              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <Label className="text-xs">Alt Text *</Label>
                  <Input
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Describe the image for accessibility"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Caption (optional)</Label>
                    <Input
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Image caption"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Credit (optional)</Label>
                    <Input
                      value={credit}
                      onChange={(e) => setCredit(e.target.value)}
                      placeholder="Photo credit"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop an image, or click to browse
            </p>
            <Button variant="secondary">
              <Upload className="h-4 w-4 mr-2" />
              Choose File
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Supported: JPG, PNG, WebP (max 5MB)
            </p>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Note: File upload requires backend integration
          </p>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button
          onClick={() => handleSelectImage(activeTab === 'suggestions' ? 'suggestion' : 'url')}
          disabled={
            (activeTab === 'suggestions' && !selectedSuggestion) ||
            (activeTab === 'url' && (!previewUrl || !altText))
          }
        >
          <Check className="h-4 w-4 mr-2" />
          Use This Image
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default FeaturedImageSelector;
