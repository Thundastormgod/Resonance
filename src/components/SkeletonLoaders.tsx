import React from "react";
import { Skeleton } from "./ui/skeleton";

export const ArticleCardSkeleton = () => {
  return (
    <div className="bg-cream rounded-lg overflow-hidden shadow-lg animate-pulse">
      <div className="p-4 pb-0">
        <Skeleton className="h-6 w-20 mb-3" />
      </div>
      
      <div className="p-4 pt-3">
        <Skeleton className="h-48 w-full rounded-lg mb-4" />
        
        <div className="space-y-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-4/5" />
          
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-gray-200 gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          
          <Skeleton className="h-4 w-32 mt-2" />
        </div>
      </div>
    </div>
  );
};

export const LeadStorySkeleton = () => {
  return (
    <div className="homepage-section bg-white p-6 rounded-lg shadow-sm animate-pulse">
      <Skeleton className="h-12 w-4/5 mb-4" />
      
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      
      <div className="space-y-2 mb-6">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
      </div>
      
      <Skeleton className="w-full h-64 md:h-80 rounded-lg" />
    </div>
  );
};

export const TrendingItemSkeleton = () => {
  return (
    <div className="flex items-start gap-3 border-b border-gray-200 pb-3 animate-pulse">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-grow space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
};

export const VideoArticleSkeleton = () => {
  return (
    <div className="flex items-start gap-3 animate-pulse">
      <Skeleton className="w-24 h-16 rounded-md flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
};

export const ArticlePageSkeleton = () => {
  return (
    <div className="min-h-screen bg-off-white">
      <div className="bg-cream py-12 animate-pulse">
        <div className="container mx-auto max-w-4xl px-4 pb-8 md:pb-12">
          <div className="flex justify-center gap-2 mb-4">
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-16 w-4/5 mx-auto mb-6" />
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 mb-6">
            <div className="flex items-center gap-2">
              <Skeleton className="w-10 h-10 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="w-5 h-5" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto my-8 md:my-4 px-4 animate-pulse">
        <Skeleton className="w-full h-64 md:h-96 rounded-lg" />
      </div>

      <div className="container mx-auto max-w-3xl p-8 pt-16 md:pt-24 space-y-6 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
};