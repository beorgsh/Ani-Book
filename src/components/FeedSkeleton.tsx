import React from "react";

export function PostSkeleton() {
  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-3.5 sm:mb-4 animate-pulse">
      {/* Header Skeleton */}
      <div className="p-3 sm:p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-3.5 bg-gray-200 rounded-md w-32" />
              <div className="w-3.5 h-3.5 rounded-full bg-gray-200 shrink-0" />
            </div>
            <div className="h-2.5 bg-gray-200 rounded-md w-20" />
          </div>
        </div>
        <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0" />
      </div>

      {/* Text Skeleton */}
      <div className="px-3 sm:px-4 pb-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded-md w-3/4" />
        <div className="h-3 bg-gray-200 rounded-md w-full" />
        <div className="h-3 bg-gray-200 rounded-md w-5/6" />
        {/* Tags */}
        <div className="flex gap-1.5 pt-1">
          <div className="h-5 bg-gray-200 rounded-full w-14" />
          <div className="h-5 bg-gray-200 rounded-full w-16" />
          <div className="h-5 bg-gray-200 rounded-full w-12" />
        </div>
      </div>

      {/* Media Canvas Skeleton */}
      <div className="w-full aspect-video max-h-[380px] bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
      </div>

      {/* Stats Bar Skeleton */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-gray-200" />
          <div className="h-3 bg-gray-200 rounded-md w-24" />
        </div>
        <div className="h-3 bg-gray-200 rounded-md w-28" />
      </div>

      {/* Action Buttons Skeleton */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="h-8 bg-gray-200 rounded-xl flex-1 mx-1" />
        <div className="h-8 bg-gray-200 rounded-xl flex-1 mx-1" />
        <div className="h-8 bg-gray-200 rounded-xl flex-1 mx-1" />
      </div>
    </div>
  );
}

export default function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3.5 sm:space-y-4 flex flex-col w-full min-w-0" id="feed-skeleton-container">
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={`skeleton-card-${i}`} />
      ))}
    </div>
  );
}
