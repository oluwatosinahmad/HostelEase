import React, { useState } from 'react';
import { 
  CheckSquare, 
  X, 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  Sparkles, 
  ShieldCheck, 
  Download, 
  RotateCcw,
  Lightbulb,
  Key,
  Home,
  Droplets,
  Shield
} from 'lucide-react';
import { MoveInChecklistItem, MoveInChecklistCategory } from '../types';

interface MoveInChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: MoveInChecklistItem[];
  onToggleItem: (id: string) => void;
  onResetChecklist: () => void;
}

export const MoveInChecklistModal: React.FC<MoveInChecklistModalProps> = ({
  isOpen,
  onClose,
  items,
  onToggleItem,
  onResetChecklist,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<MoveInChecklistCategory | 'ALL'>('ALL');

  if (!isOpen) return null;

  const completedCount = items.filter((i) => i.isCompleted).length;
  const progressPercent = Math.round((completedCount / (items.length || 1)) * 100);

  const filteredItems = items.filter((i) => {
    if (selectedCategory === 'ALL') return true;
    return i.category === selectedCategory;
  });

  const getCategoryLabel = (cat: MoveInChecklistCategory) => {
    switch (cat) {
      case 'PRE_PAYMENT': return '🔍 1. Pre-Payment & Room Test';
      case 'MOVE_IN_DAY': return '🔑 2. Move-in Day & Keys';
      case 'SETTLING_IN': return '🛋️ 3. Settling In & Room Setup';
      case 'CAMPUS_SECURITY': return '🛡️ 4. Security & Essentials';
      default: return cat;
    }
  };

  const handleExportText = () => {
    let text = '🦅 CAMPUSNEST LAUTECH HOSTEL MOVE-IN CHECKLIST\n';
    text += `Progress: ${completedCount}/${items.length} Completed (${progressPercent}%)\n\n`;
    items.forEach((item, idx) => {
      text += `[${item.isCompleted ? 'X' : ' '}] ${idx + 1}. ${item.title}\n`;
      text += `   ${item.description}\n`;
      if (item.criticalTip) text += `   💡 Pro-Tip: ${item.criticalTip}\n`;
      text += '\n';
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'CampusNest_MoveIn_Checklist.txt';
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden text-white my-6 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-600/20 border border-brand-500/30 text-brand-400 flex items-center justify-center shadow-inner">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest block">LAUTECH Student Survival Tool</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {progressPercent}% Complete
                </span>
              </div>
              <h2 className="text-lg font-black text-white">Hostel Move-In & Inspection Checklist</h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportText}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Download Checklist Text"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Save</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar & Categories Bar */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 space-y-3 shrink-0">
          <div>
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-300">Move-in Readiness:</span>
              <span className="text-emerald-400 font-mono">{completedCount} of {items.length} Tasks Checked</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
            {['ALL', 'PRE_PAYMENT', 'MOVE_IN_DAY', 'SETTLING_IN', 'CAMPUS_SECURITY'].map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat as any)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat === 'ALL' ? 'All Steps' : getCategoryLabel(cat as any)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Checklist Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          
          {progressPercent === 100 && (
            <div className="bg-emerald-950/50 border border-emerald-500/40 p-4 rounded-2xl flex items-center gap-3 animate-fadeIn">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Hostel Move-In Ready 100%!</h4>
                <p className="text-xs text-emerald-200">You have completed all safety and inspection checks for your accommodation in Ogbomoso.</p>
              </div>
            </div>
          )}

          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onToggleItem(item.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer select-none space-y-2 ${
                item.isCompleted
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-3">
                <button 
                  type="button" 
                  className="mt-0.5 shrink-0 text-slate-400 hover:text-white"
                >
                  {item.isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-600" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`font-bold text-xs ${item.isCompleted ? 'text-emerald-300 line-through' : 'text-white'}`}>
                      {item.title}
                    </h4>
                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800 uppercase font-mono shrink-0">
                      {item.category.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                  
                  {item.criticalTip && (
                    <div className="mt-2 bg-slate-900/90 border border-slate-800/80 p-2.5 rounded-xl flex items-start gap-2 text-[11px] text-amber-300/90">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Pro-Tip:</strong> {item.criticalTip}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0 text-xs">
          <button
            onClick={onResetChecklist}
            className="text-slate-500 hover:text-slate-300 flex items-center gap-1 font-bold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Checklist</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold transition-all cursor-pointer shadow-lg"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
