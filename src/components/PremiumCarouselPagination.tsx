import React from 'react';

export interface PremiumCarouselPaginationProps {
  totalItems: number;
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  maxVisible?: number; // Maximum visible indicators (5-7, defaults to 5)
  variant?: 'emerald' | 'glass' | 'dark' | 'light';
  className?: string;
  itemLabelPrefix?: string;
}

/**
 * PremiumCarouselPagination
 * 
 * Production-grade windowed carousel pagination component.
 * - Caps visible indicators to 5–7 items via strict windowing logic (never CSS overflow truncation).
 * - Distinct active item: rounded pill (`━━━━━`).
 * - Inactive items: refined subtle dots (`• •`).
 * - Edge dots gently scaled to indicate additional overflow items.
 * - Completely deterministic: zero flickering/flashing of dozens of dots on refresh or load.
 */
export const PremiumCarouselPagination: React.FC<PremiumCarouselPaginationProps> = ({
  totalItems,
  currentIndex,
  onSelectIndex,
  maxVisible = 5,
  variant = 'emerald',
  className = '',
  itemLabelPrefix = 'Go to slide',
}) => {
  // Never show pagination if 1 or fewer items
  if (totalItems <= 1) {
    return null;
  }

  // Strictly clamp visible count between 3 and 7 (standard 5)
  const windowSize = Math.min(Math.max(3, maxVisible), 7, totalItems);
  const halfWindow = Math.floor(windowSize / 2);

  let startIndex = currentIndex - halfWindow;
  if (startIndex < 0) {
    startIndex = 0;
  } else if (startIndex + windowSize > totalItems) {
    startIndex = Math.max(0, totalItems - windowSize);
  }

  const visibleIndices: number[] = [];
  for (let i = 0; i < windowSize; i++) {
    visibleIndices.push(startIndex + i);
  }

  return (
    <div
      role="tablist"
      aria-label="Carousel pagination"
      className={`flex items-center justify-center gap-1.5 py-1 select-none pointer-events-auto ${className}`}
    >
      {visibleIndices.map((idx, posInWindow) => {
        const isActive = idx === currentIndex;
        const isLeadingEdge = posInWindow === 0 && startIndex > 0;
        const isTrailingEdge = posInWindow === windowSize - 1 && startIndex + windowSize < totalItems;
        const isEdge = (isLeadingEdge || isTrailingEdge) && !isActive;

        // Visual styling by variant
        let activeStyles = 'w-6 sm:w-7 h-1.5 sm:h-2 bg-emerald-600 dark:bg-emerald-400 shadow-sm';
        let inactiveStyles = 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600';

        if (variant === 'glass' || variant === 'light') {
          activeStyles = 'w-5 sm:w-6 h-1.5 sm:h-2 bg-emerald-400 shadow-md ring-1 ring-white/20';
          inactiveStyles = 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/60 hover:bg-white/90 shadow-sm';
        } else if (variant === 'dark') {
          activeStyles = 'w-6 sm:w-7 h-1.5 sm:h-2 bg-white shadow-sm';
          inactiveStyles = 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/30 hover:bg-white/60';
        }

        return (
          <button
            key={`dot-${idx}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={`${itemLabelPrefix} ${idx + 1} of ${totalItems}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectIndex(idx);
            }}
            className={`group relative flex items-center justify-center p-1 cursor-pointer transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-full`}
            title={`${itemLabelPrefix} ${idx + 1}`}
          >
            <span
              className={`block rounded-full transition-all duration-300 ease-out ${
                isActive
                  ? activeStyles
                  : `${inactiveStyles} ${isEdge ? 'scale-75 opacity-60' : 'scale-100 opacity-90'}`
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};

export default PremiumCarouselPagination;
