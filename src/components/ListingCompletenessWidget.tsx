import React from 'react';
import { Sparkles, CheckCircle2, Circle, AlertCircle, ArrowRight } from 'lucide-react';
import { Property } from '../types';
import { calculateListingCompleteness } from '../utils/completeness';

interface ListingCompletenessWidgetProps {
  property: Partial<Property>;
  onItemClick?: (key: string) => void;
}

export const ListingCompletenessWidget: React.FC<ListingCompletenessWidgetProps> = ({
  property,
  onItemClick,
}) => {
  const result = calculateListingCompleteness(property);

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 bg-emerald-500';
    if (score >= 60) return 'text-amber-600 bg-amber-500';
    return 'text-rose-600 bg-rose-500';
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-brand-50 text-brand-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-slate-900">Listing Completeness</h4>
            <p className="text-[11px] text-slate-500">More complete listings attract 3x more students</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-lg font-extrabold text-slate-900">{result.score}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            result.score >= 85 ? 'bg-emerald-500' : result.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
          }`}
          style={{ width: `${result.score}%` }}
        />
      </div>

      {/* Top Recommendation Box */}
      {result.missingCount > 0 ? (
        <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 flex items-start space-x-2.5 text-xs text-amber-950">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Improvement Tip:</span>
            <span className="text-slate-600 leading-relaxed">{result.topRecommendation}</span>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center space-x-2 text-xs text-emerald-900 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Listing is 100% complete with full photos, video tour & fee details!</span>
        </div>
      )}

      {/* Item Checklist */}
      <div className="space-y-1.5 text-xs">
        {result.items.map((item) => (
          <div
            key={item.key}
            onClick={() => onItemClick && onItemClick(item.key)}
            className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
              item.isCompleted ? 'text-slate-700 bg-slate-50/60' : 'text-slate-500 hover:bg-slate-100 cursor-pointer'
            }`}
          >
            <div className="flex items-center space-x-2">
              {item.isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              )}
              <span className={item.isCompleted ? 'font-medium text-slate-800' : ''}>{item.label}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400">+{item.weight}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
