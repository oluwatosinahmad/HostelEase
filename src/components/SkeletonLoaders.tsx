import React from 'react';

export const HostelCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm animate-pulse flex flex-col">
      {/* Image Skeleton */}
      <div className="h-52 bg-slate-200 dark:bg-slate-800 w-full relative">
        <div className="absolute top-3 left-3 w-20 h-6 bg-slate-300 dark:bg-slate-700 rounded-full" />
        <div className="absolute top-3 right-3 w-8 h-8 bg-slate-300 dark:bg-slate-700 rounded-full" />
      </div>

      {/* Body Skeleton */}
      <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-2/3" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-12" />
          </div>
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/2" />
        </div>

        {/* Facilities Chips Skeleton */}
        <div className="flex gap-1.5 pt-1">
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-16" />
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-16" />
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-16" />
        </div>

        {/* Price & Button Skeleton */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-lg w-14" />
            <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-lg w-24" />
          </div>
          <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded-xl w-24" />
        </div>
      </div>
    </div>
  );
};

export const HostelListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <HostelCardSkeleton key={i} />
      ))}
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-xl w-48" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-xl w-72" />
        </div>
        <div className="w-14 h-14 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-16" />
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-lg w-20" />
          </div>
        ))}
      </div>

      {/* Recent Hostels Grid */}
      <div className="space-y-4">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-xl w-40" />
        <HostelListSkeleton count={3} />
      </div>
    </div>
  );
};
