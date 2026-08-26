import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

interface ComparisonDockProps {
  comparedIds: string[];
  onOpenModal: () => void;
  onRemoveHostel?: (id: string) => void;
  onClearAll: () => void;
}

export const ComparisonDock: React.FC<ComparisonDockProps> = ({
  comparedIds,
  onOpenModal,
  onClearAll
}) => {
  if (comparedIds.length === 0) return null;

  return (
    <div className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-2xl animate-in slide-in-from-bottom-6 duration-200">
      <div className="bg-slate-950/95 backdrop-blur-md rounded-3xl p-3 sm:p-4 shadow-2xl border border-slate-800 text-white flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-xs shadow-md">
            {comparedIds.length}
          </div>
          <div>
            <h4 className="font-black text-xs sm:text-sm text-white">
              Hostel Comparison Dock
            </h4>
            <p className="text-[10px] text-slate-400">
              {comparedIds.length} of 4 hostels selected
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClearAll}
            className="px-2.5 py-1.5 text-[11px] font-bold text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            Clear
          </button>

          <button
            onClick={onOpenModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Compare Now ({comparedIds.length})
          </button>
        </div>
      </div>
    </div>
  );
};
