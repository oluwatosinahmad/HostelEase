import React, { useState, useEffect } from 'react';
import { Search, Sparkles, AlertCircle, ArrowRight, X, Filter, CheckCircle2 } from 'lucide-react';
import { filterFallbackProperties } from '../services/offlineFallback';

export interface SmartSearchBarProps {
  value?: string;
  onChange?: (val: string) => void;
  onSearch?: (q: string) => void;
  onApplyParsedFilters?: (interpreted: any, explanation: string[]) => void;
  isAuthenticated?: boolean;
  activeExplanation?: string[];
  onClearExplanation?: () => void;
  onSearchResults?: (results: any) => void;
  onSelectProperty?: (propertyId: string) => void;
  placeholder?: string;
  className?: string;
}

export const SmartSearchBar: React.FC<SmartSearchBarProps> = ({
  value,
  onChange,
  onSearch,
  onApplyParsedFilters,
  isAuthenticated,
  activeExplanation = [],
  onClearExplanation,
  onSearchResults,
  onSelectProperty,
  placeholder = "Try: 'Hostel under ₦200,000 in Under G with good light'",
  className = ""
}) => {
  const [internalQuery, setInternalQuery] = useState(value || '');
  const [loading, setLoading] = useState(false);
  const [clarification, setClarification] = useState<{
    needed: boolean;
    question?: string;
    originalQuery?: string;
  } | null>(null);
  const [clarificationAnswer, setClarificationAnswer] = useState('');
  const [parsedFeedback, setParsedFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (value !== undefined) {
      setInternalQuery(value);
    }
  }, [value]);

  const query = value !== undefined ? value : internalQuery;

  const updateQuery = (newVal: string) => {
    setInternalQuery(newVal);
    if (onChange) {
      onChange(newVal);
    }
  };

  const sampleSuggestions = [
    'Hostel under ₦200,000 in Under G with good electricity',
    'Close to LAUTECH gate under ₦180k',
    'Self-contain in Adenike with constant water',
    'Affordable shared room near Stadium'
  ];

  const handleSearch = async (textToSearch: string) => {
    if (!textToSearch.trim()) return;
    setLoading(true);
    setClarification(null);
    setParsedFeedback(null);

    if (onSearch) {
      onSearch(textToSearch);
    }

    try {
      const token = localStorage.getItem('hostel_ease_token') || localStorage.getItem('token');
      const res = await fetch('/api/intelligence/nl-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ query: textToSearch })
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();

        if (data.needsClarification) {
          setClarification({
            needed: true,
            question: data.clarificationQuestion,
            originalQuery: textToSearch
          });
        } else {
          setParsedFeedback(data.interpretationText);
          
          if (onApplyParsedFilters && data.structuredFilters) {
            const applied: any = {};
            if (data.structuredFilters.maxPrice) applied.maxPrice = data.structuredFilters.maxPrice;
            if (data.structuredFilters.areas && data.structuredFilters.areas.length > 0) {
              applied.area = data.structuredFilters.areas[0];
            }
            if (data.structuredFilters.roomTypes && data.structuredFilters.roomTypes.length > 0) {
              applied.propertyType = data.structuredFilters.roomTypes[0];
            }
            onApplyParsedFilters(applied, [data.interpretationText]);
          }

          if (onSearchResults) {
            onSearchResults(data);
          }
        }
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('NL Search API unreachable, performing client intelligence search:', err);
    }

    // Client fallback search execution
    const fallbackResults = filterFallbackProperties({ search: textToSearch });
    setParsedFeedback(`Searching for "${textToSearch}" around LAUTECH campus`);
    if (onSearchResults) {
      onSearchResults({
        query: textToSearch,
        properties: fallbackResults.properties,
        interpretationText: `Matching verified accommodations for "${textToSearch}"`,
        confidence: 0.95
      });
    }
    setLoading(false);
  };

  const handleClarificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clarification?.originalQuery || !clarificationAnswer.trim()) return;
    const combinedQuery = `${clarification.originalQuery} ${clarificationAnswer.trim()}`;
    updateQuery(combinedQuery);
    setClarification(null);
    setClarificationAnswer('');
    handleSearch(combinedQuery);
  };

  return (
    <div className={`w-full space-y-3 ${className}`}>
      {/* Search Bar Input */}
      <div className="relative">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(query);
          }}
          className="relative flex items-center"
        >
          <div className="absolute left-4.5 text-emerald-600 flex items-center pointer-events-none">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-12 pr-28 py-3.5 bg-white border-2 border-emerald-500/30 hover:border-emerald-500/60 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 shadow-sm transition-all outline-none"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                updateQuery('');
                setParsedFeedback(null);
                setClarification(null);
                if (onClearExplanation) onClearExplanation();
              }}
              className="absolute right-24 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Search</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Query Suggestions Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 flex-shrink-0">
          <Filter className="w-3 h-3" />
          Suggestions:
        </span>
        {sampleSuggestions.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              updateQuery(item);
              handleSearch(item);
            }}
            className="px-3 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200/80 rounded-full text-slate-600 text-[11px] font-medium transition-colors flex-shrink-0"
          >
            {item}
          </button>
        ))}
      </div>

      {/* Parsed Search Feedback */}
      {(parsedFeedback || activeExplanation.length > 0) && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="font-medium">
              <strong>Interpreted:</strong> {parsedFeedback || activeExplanation.join(' • ')}
            </p>
          </div>
          <button
            onClick={() => {
              setParsedFeedback(null);
              if (onClearExplanation) onClearExplanation();
            }}
            className="text-emerald-700 hover:text-emerald-900 text-[10px] font-bold underline ml-2"
          >
            Clear
          </button>
        </div>
      )}

      {/* Clarification Dialog */}
      {clarification?.needed && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-3 animate-in zoom-in-95 duration-150 shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">Quick Clarification Needed</h4>
              <p className="text-xs text-amber-800 mt-0.5 font-medium">{clarification.question}</p>
            </div>
          </div>

          <form onSubmit={handleClarificationSubmit} className="flex gap-2">
            <input
              type="text"
              value={clarificationAnswer}
              onChange={(e) => setClarificationAnswer(e.target.value)}
              placeholder="e.g. ₦180,000 maximum budget"
              autoFocus
              className="flex-1 px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="submit"
              disabled={!clarificationAnswer.trim()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() => setClarification(null)}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              Cancel
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
