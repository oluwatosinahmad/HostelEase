import React, { useState, useEffect } from 'react';
import { 
  Bookmark, Sparkles, Tag, CheckCircle2, Zap, MapPin, 
  Trash2, FileText, ArrowRight, Eye, RefreshCw, Star
} from 'lucide-react';

interface ShortlistTagItem {
  propertyId: string;
  propertyTitle: string;
  area: string;
  pricePerYear: number;
  matchScore: number;
  tag: 'TOP_CHOICE' | 'NEED_TO_INSPECT' | 'MAYBE' | 'BEST_VALUE' | 'BACKUP';
  personalNotes?: string;
  positiveReasons: string[];
  negativeWarnings: string[];
  coverImage?: string;
}

interface SmartShortlistManagerProps {
  onSelectProperty: (propertyId: string) => void;
  onRequestInspection?: (propertyId: string) => void;
}

export const SmartShortlistManager: React.FC<SmartShortlistManagerProps> = ({
  onSelectProperty,
  onRequestInspection
}) => {
  const [loading, setLoading] = useState(true);
  const [shortlistData, setShortlistData] = useState<any | null>(null);
  const [activeFilterTag, setActiveFilterTag] = useState<string>('ALL');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>('');

  const tagsList = [
    { key: 'ALL', label: 'All Saved', color: 'bg-slate-100 text-slate-800' },
    { key: 'TOP_CHOICE', label: 'Top Choices', color: 'bg-emerald-100 text-emerald-800' },
    { key: 'NEED_TO_INSPECT', label: 'Need to Inspect', color: 'bg-blue-100 text-blue-800' },
    { key: 'BEST_VALUE', label: 'Best Value', color: 'bg-purple-100 text-purple-800' },
    { key: 'MAYBE', label: 'Maybe', color: 'bg-amber-100 text-amber-800' }
  ];

  useEffect(() => {
    fetchShortlist();
  }, []);

  const fetchShortlist = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/intelligence/shortlist/smart-compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      setShortlistData(data);
    } catch (err) {
      console.error('Failed to load smart shortlist comparison:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTag = async (propertyId: string, newTag: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/intelligence/shortlist/organize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ propertyId, tag: newTag })
      });
      fetchShortlist();
    } catch (err) {
      console.error('Failed to update tag:', err);
    }
  };

  const handleSaveNotes = async (propertyId: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/intelligence/shortlist/organize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ propertyId, personalNotes: noteText })
      });
      setEditingNotesId(null);
      fetchShortlist();
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-600">Analyzing your saved hostels...</p>
      </div>
    );
  }

  const items: ShortlistTagItem[] = shortlistData?.items || [];
  const filteredItems = activeFilterTag === 'ALL'
    ? items
    : items.filter(item => item.tag === activeFilterTag);

  return (
    <div className="space-y-6">
      
      {/* Header & AI Comparative Summary */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Smart Shortlist Organizer</h3>
              <p className="text-xs text-slate-500">Compare saved hostels side-by-side with trade-off insights</p>
            </div>
          </div>

          <button
            onClick={fetchShortlist}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-evaluate</span>
          </button>
        </div>

        {/* AI Top Category Leaders */}
        {shortlistData && items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {shortlistData.bestForPrice && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Best Price</span>
                <p className="text-xs font-black text-slate-900 truncate mt-0.5">{shortlistData.bestForPrice.title}</p>
                <p className="text-[11px] font-bold text-emerald-800">₦{shortlistData.bestForPrice.price?.toLocaleString()} / yr</p>
              </div>
            )}

            {shortlistData.bestForDistance && (
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider">Closest to Campus</span>
                <p className="text-xs font-black text-slate-900 truncate mt-0.5">{shortlistData.bestForDistance.title}</p>
                <p className="text-[11px] font-bold text-blue-800">~{shortlistData.bestForDistance.walkMinutes} mins walk</p>
              </div>
            )}

            {shortlistData.bestForElectricity && (
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Best Electricity</span>
                <p className="text-xs font-black text-slate-900 truncate mt-0.5">{shortlistData.bestForElectricity.title}</p>
                <p className="text-[11px] font-bold text-amber-800">{shortlistData.bestForElectricity.powerRating}★ Rating</p>
              </div>
            )}

            {shortlistData.bestVerified && (
              <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-purple-700 tracking-wider">Top Verified</span>
                <p className="text-xs font-black text-slate-900 truncate mt-0.5">{shortlistData.bestVerified.title}</p>
                <p className="text-[11px] font-bold text-purple-800">Inspection Passed</p>
              </div>
            )}
          </div>
        )}

        {/* Filter Tag Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 no-scrollbar">
          {tagsList.map((tag) => (
            <button
              key={tag.key}
              onClick={() => setActiveFilterTag(tag.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 ${
                activeFilterTag === tag.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tag.label}
              {tag.key !== 'ALL' && (
                <span className="ml-1.5 text-[10px] opacity-70">
                  ({items.filter(i => i.tag === tag.key).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Shortlist Items Cards */}
      {filteredItems.length === 0 ? (
        <div className="p-10 bg-white rounded-3xl border border-slate-200 text-center space-y-2">
          <p className="text-xs font-bold text-slate-600">No hostels saved in this category yet.</p>
          <p className="text-[11px] text-slate-400">Save hostels while browsing and tag them here to organize your choices.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.propertyId}
              className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                
                {/* Top Row: Tag selector & Match % */}
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={item.tag}
                    onChange={(e) => handleUpdateTag(item.propertyId, e.target.value)}
                    className="text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="TOP_CHOICE">⭐ Top Choice</option>
                    <option value="NEED_TO_INSPECT">🔍 Need to Inspect</option>
                    <option value="BEST_VALUE">💎 Best Value</option>
                    <option value="MAYBE">🤔 Maybe</option>
                    <option value="BACKUP">🛡️ Backup</option>
                  </select>

                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                    {item.matchScore}% Match
                  </span>
                </div>

                {/* Title & Area */}
                <div>
                  <h4
                    onClick={() => onSelectProperty(item.propertyId)}
                    className="text-base font-black text-slate-900 line-clamp-1 hover:text-emerald-600 cursor-pointer"
                  >
                    {item.propertyTitle}
                  </h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {item.area}
                  </p>
                </div>

                {/* Price */}
                <div>
                  <span className="text-lg font-black text-slate-900">₦{item.pricePerYear.toLocaleString()}</span>
                  <span className="text-xs text-slate-400"> / year</span>
                </div>

                {/* Positive & Negative summary points */}
                <div className="space-y-1 text-xs">
                  {item.positiveReasons.slice(0, 2).map((p, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-emerald-800 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>{p}</span>
                    </div>
                  ))}

                  {item.negativeWarnings.slice(0, 1).map((w, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-amber-800 font-medium">
                      <span className="text-amber-500 font-bold">⚠</span>
                      <span>{w}</span>
                    </div>
                  ))}
                </div>

                {/* Personal Notes */}
                <div className="pt-2 border-t border-slate-100">
                  {editingNotesId === item.propertyId ? (
                    <div className="space-y-2">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Add your thoughts e.g. 'Room 4 is well lit'"
                        rows={2}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveNotes(item.propertyId)}
                          className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingNotesId(null)}
                          className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="truncate italic">
                        {item.personalNotes || 'No notes added yet'}
                      </span>
                      <button
                        onClick={() => {
                          setEditingNotesId(item.propertyId);
                          setNoteText(item.personalNotes || '');
                        }}
                        className="text-emerald-700 font-bold text-[11px] hover:underline ml-2"
                      >
                        Edit Note
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {onRequestInspection && (
                  <button
                    onClick={() => onRequestInspection(item.propertyId)}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition-colors"
                  >
                    Inspect
                  </button>
                )}

                <button
                  onClick={() => onSelectProperty(item.propertyId)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 ml-auto"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
