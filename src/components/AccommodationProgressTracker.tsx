import React from 'react';
import { CheckCircle2, Circle, Clock, ArrowRight, ShieldCheck, Home } from 'lucide-react';

export type HousingStage = 
  | 'PREFERENCES'
  | 'SEARCHING'
  | 'SHORTLISTED'
  | 'INSPECTION'
  | 'BOOKING'
  | 'PAYMENT'
  | 'MOVE_IN';

interface AccommodationProgressTrackerProps {
  currentStage?: HousingStage;
  onNavigateToStage?: (stage: HousingStage) => void;
  className?: string;
}

export const AccommodationProgressTracker: React.FC<AccommodationProgressTrackerProps> = ({
  currentStage = 'PREFERENCES',
  onNavigateToStage,
  className = ''
}) => {
  const stages = [
    { key: 'PREFERENCES', label: '1. Preferences', subtitle: 'Budget & Area' },
    { key: 'SEARCHING', label: '2. Smart Match', subtitle: 'Best Options' },
    { key: 'SHORTLISTED', label: '3. Shortlist', subtitle: 'Rank Choices' },
    { key: 'INSPECTION', label: '4. Inspection', subtitle: 'Check Compound' },
    { key: 'BOOKING', label: '5. Reserve Space', subtitle: 'Secure Room' },
    { key: 'PAYMENT', label: '6. Escrow Pay', subtitle: 'Protected Funds' },
    { key: 'MOVE_IN', label: '7. Move-In', subtitle: 'Keys & Inventory' },
  ];

  const getStageIndex = (stage: HousingStage) => {
    return stages.findIndex(s => s.key === stage);
  };

  const currentIndex = getStageIndex(currentStage);

  return (
    <div className={`bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs ${className}`}>
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Accommodation Journey Tracker
          </span>
          <h4 className="text-sm font-black text-slate-900 mt-0.5">Your Step-by-Step Stressless Housing Plan</h4>
        </div>

        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          Step {currentIndex + 1} of 7
        </span>
      </div>

      {/* Progress Bar / Steps Row */}
      <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 pt-2">
        {stages.map((stage, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <button
              key={stage.key}
              onClick={() => onNavigateToStage && onNavigateToStage(stage.key as HousingStage)}
              disabled={!onNavigateToStage}
              className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                isCurrent
                  ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                  : isDone
                  ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  : 'bg-white border-slate-100 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-black ${
                  isCurrent ? 'text-emerald-900' : isDone ? 'text-slate-800' : 'text-slate-400'
                }`}>
                  {stage.label}
                </span>

                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : isCurrent ? (
                  <Clock className="w-4 h-4 text-emerald-600 animate-pulse flex-shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                )}
              </div>

              <span className="text-[10px] text-slate-500 mt-1 truncate">
                {stage.subtitle}
              </span>
            </button>
          );
        })}
      </div>

    </div>
  );
};
