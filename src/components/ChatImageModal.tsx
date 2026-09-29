import React, { useEffect } from 'react';
import { X, ArrowLeft, Building2, ShieldCheck } from 'lucide-react';

interface ChatImageModalProps {
  isOpen: boolean;
  imageUrl: string;
  title: string;
  subtitle?: string;
  isOnline?: boolean;
  presenceText?: string;
  isVerified?: boolean;
  onClose: () => void;
}

export const ChatImageModal: React.FC<ChatImageModalProps> = ({
  isOpen,
  imageUrl,
  title,
  subtitle,
  isOnline,
  presenceText,
  isVerified = true,
  onClose
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col justify-between bg-slate-950/92 backdrop-blur-md animate-fade-in p-4 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} profile and hostel preview`}
    >
      {/* Top Header Bar */}
      <div 
        className="flex items-center justify-between gap-4 max-w-4xl mx-auto w-full text-white py-2 px-3 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-2 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Close preview"
          >
            <ArrowLeft className="w-5 h-5 sm:hidden" />
            <X className="w-5 h-5 hidden sm:block" />
          </button>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black text-white truncate flex items-center gap-1.5">
              <span>{title}</span>
              {isVerified && <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 inline" />}
            </h3>
            {subtitle && (
              <p className="text-xs text-emerald-300 font-semibold truncate flex items-center gap-1">
                <Building2 className="w-3 h-3 shrink-0" />
                <span>{subtitle}</span>
              </p>
            )}
          </div>
        </div>

        {presenceText && (
          <div className="shrink-0 text-right">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${
              isOnline 
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300' 
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
              }`} />
              <span>{presenceText}</span>
            </span>
          </div>
        )}
      </div>

      {/* Main Image Container */}
      <div 
        className="flex-1 flex items-center justify-center py-4 my-auto min-h-0 overflow-hidden"
        onClick={onClose}
      >
        <div 
          className="relative max-h-full max-w-full flex items-center justify-center"
          onClick={e => e.stopPropagation()}
        >
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[75vh] max-w-[92vw] sm:max-w-[80vw] object-contain rounded-2xl shadow-2xl border border-slate-800/80 bg-slate-900"
            loading="eager"
            decoding="async"
          />
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="text-center text-xs text-slate-400 font-medium py-1">
        Tap outside or press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 text-[10px]">ESC</kbd> to return to conversation
      </div>
    </div>
  );
};
