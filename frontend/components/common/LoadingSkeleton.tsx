import React from 'react';

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200" />
        <div className="space-y-1.5 flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-4/5" />
      </div>
      <div className="h-48 bg-gray-200 rounded-xl w-full" />
      <div className="flex justify-between pt-2">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="h-8 bg-gray-200 rounded w-1/4" />
      </div>
    </div>
  );
}

export function FeedSkeletonList() {
  return (
    <div className="space-y-4">
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
