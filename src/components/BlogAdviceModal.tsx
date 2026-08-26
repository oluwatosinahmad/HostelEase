import React, { useState } from 'react';
import { 
  BookOpen, 
  X, 
  ShieldCheck, 
  Clock, 
  ChevronRight, 
  ArrowLeft, 
  CheckCircle2,
  Lightbulb,
  Sparkles,
  Share2
} from 'lucide-react';
import { HousingAdviceArticle } from '../types';

interface BlogAdviceModalProps {
  isOpen: boolean;
  articles: HousingAdviceArticle[];
  onClose: () => void;
}

export const BlogAdviceModal: React.FC<BlogAdviceModalProps> = ({
  isOpen,
  articles,
  onClose,
}) => {
  const [selectedArticle, setSelectedArticle] = useState<HousingAdviceArticle | null>(articles[0] || null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden text-white my-8 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-600/20 text-brand-400 flex items-center justify-center shadow-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black text-brand-400 uppercase tracking-wider block">LAUTECH Student Guides</span>
              <h2 className="text-base font-black text-white">Student Housing Advice & Scam Prevention</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Sidebar list + Detail reader */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800 text-xs">
          
          {/* Article List */}
          <div className="p-4 space-y-2.5 bg-slate-950/60 overflow-y-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
              Select Guide ({articles.length})
            </span>
            {articles.map((art) => {
              const isSelected = selectedArticle?.id === art.id;
              return (
                <button
                  key={art.id}
                  onClick={() => setSelectedArticle(art)}
                  className={`w-full p-3 rounded-2xl text-left transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-brand-600/20 border-brand-500 text-white'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-850'
                  }`}
                >
                  <span className="text-[9px] font-black uppercase tracking-wider text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20 mb-1.5 inline-block">
                    {art.category}
                  </span>
                  <h4 className="font-bold text-white text-xs leading-snug line-clamp-2">{art.title}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-2">
                    <Clock className="w-3 h-3" />
                    <span>{art.readTimeMins} min read</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Article Detail View */}
          <div className="md:col-span-2 p-6 overflow-y-auto space-y-5 bg-slate-900">
            {selectedArticle ? (
              <div className="space-y-4 animate-fadeIn">
                <div className="space-y-2 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20">
                      {selectedArticle.category}
                    </span>
                    <span className="text-[11px] text-slate-500">• {selectedArticle.publishedDate}</span>
                  </div>
                  <h3 className="text-lg font-black text-white leading-tight">{selectedArticle.title}</h3>
                  <p className="text-xs text-slate-400">By {selectedArticle.author}</p>
                </div>

                {/* Paragraphs */}
                <div className="space-y-3 text-slate-300 text-xs leading-relaxed">
                  {selectedArticle.content.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>

                {/* Actionable Tips Box */}
                {selectedArticle.tips && selectedArticle.tips.length > 0 && (
                  <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <Lightbulb className="w-4 h-4" />
                      <span>Key Takeaways for LAUTECH Students:</span>
                    </div>
                    <ul className="space-y-1.5 text-emerald-200 text-[11px]">
                      {selectedArticle.tips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                <span>Select an article from the left to read.</span>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>CampusNest Student Tenancy Protection & Educational Guides</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
