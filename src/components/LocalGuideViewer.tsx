import React, { useState, useEffect } from 'react';
import { BookOpen, ShieldCheck, Clock, ArrowRight, CheckCircle2, FileText, ChevronRight } from 'lucide-react';
import { api } from '../services/api';

interface LocalGuideViewerProps {
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const defaultGuides = [
  {
    id: 'guide-inspection-101',
    title: 'The Essential LAUTECH Hostel Inspection Checklist',
    category: 'INSPECTIONS',
    read_time_minutes: 4,
    content_markdown: `Before making any deposit or commitment on a hostel around LAUTECH (Under G, Adenike, Stadium, or General), follow this non-negotiable checklist:

1. ⚡ **Electricity Feeder & Inverter Status**: Test wall sockets, inspect meter availability, and ask surrounding occupants about daily grid hours.
2. 💧 **Borehole & Water Flow**: Turn on taps inside the room and bathroom. Verify whether pumping is automated or powered by a dedicated generator during blackouts.
3. 🔒 **Compound Security & Burglary Proofing**: Check window iron grilles, perimeter wall height, and compound gate lock policies (most student gates lock at 10 PM).
4. 💰 **Transparent Price Disclosures**: Ensure caution fee, agreement fee, and waste disposal levies are in writing. Never make offline informal cash transfers.`
  },
  {
    id: 'guide-scam-prevention',
    title: 'How to Prevent Off-Campus Housing Scams in Ogbomoso',
    category: 'SCAM_DEFENSE',
    read_time_minutes: 5,
    content_markdown: `Student fraud in university environments happens when urgency overrides caution. Follow Hostel Ease safety protocols:

• **Never Pay Before Viewing**: Always inspect the exact room you are renting, not a representative photo.
• **Confirm Landlord Authorization**: Verify that the person showing you the hostel has authorized keys and documentation.
• **Use Escrow & Verified Channels**: Always book through Hostel Ease with a structured 48-hour confirmation and bank-backed receipt.
• **Watch Out for "Urgent Pressure"**: Scammers claim "3 other students are bringing money right now". Take your time and verify.`
  },
  {
    id: 'guide-roommate-agreement',
    title: 'Living Peacefully: Setting Ground Rules with Roommates',
    category: 'ROOMMATES',
    read_time_minutes: 3,
    content_markdown: `Sharing a room reduces rent by 50%, but requires clear expectations:

• 🧹 **Cleaning & Chore Rotations**: Agree on bathroom scrubbing days and kitchen cleaning rules immediately.
• 💡 **Electricity & Generator Fuel Splitting**: Agree in writing how generator fuel and prepaid recharge tokens are split.
• 👥 **Visitors & Study Hours**: Agree on overnight visitor frequency and quiet study hours during test and examination weeks.`
  }
];

export const LocalGuideViewer: React.FC<LocalGuideViewerProps> = ({ onShowToast }) => {
  const [guides, setGuides] = useState<any[]>(defaultGuides);
  const [selectedGuide, setSelectedGuide] = useState<any | null>(defaultGuides[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchGuides = async () => {
      try {
        const res = await api.community.getGuides();
        if (res.guides && res.guides.length > 0) {
          setGuides(res.guides);
          setSelectedGuide(res.guides[0]);
        }
      } catch (err: any) {
        console.error('Failed to load dynamic guides:', err);
      }
    };
    fetchGuides();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      
      {/* Sidebar: Guides List */}
      <div className="md:col-span-4 space-y-2">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider px-2">
          Official Hostel Ease Guides
        </h3>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading guides...</div>
        ) : (
          guides.map((g) => {
            const isSelected = selectedGuide?.id === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setSelectedGuide(g)}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-950/20'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="space-y-1 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                      isSelected ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {(g.category || 'GUIDE').replace(/_/g, ' ')}
                    </span>
                    <span className={`text-[10px] flex items-center gap-0.5 ${
                      isSelected ? 'text-emerald-200' : 'text-slate-400'
                    }`}>
                      <Clock className="w-3 h-3" />
                      {g.read_time_minutes} min
                    </span>
                  </div>
                  <h4 className={`text-xs font-bold leading-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {g.title}
                  </h4>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-200' : 'text-slate-400'}`} />
              </button>
            );
          })
        )}
      </div>

      {/* Guide Content Display */}
      <div className="md:col-span-8">
        {selectedGuide ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            
            {/* Guide Header */}
            <div className="space-y-3 pb-6 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-900 text-xs font-black rounded-full border border-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  HOSTEL EASE VERIFIED GUIDE
                </span>
                <span className="text-xs text-slate-400">• {selectedGuide.read_time_minutes} min read</span>
              </div>

              <h2 className="text-xl font-black text-slate-900 leading-tight">
                {selectedGuide.title}
              </h2>
            </div>

            {/* Markdown Content Renderer */}
            <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium space-y-4 whitespace-pre-line">
              {selectedGuide.content_markdown}
            </div>

            {/* Verified Footer */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-bold">Fact-checked for LAUTECH (Ogbomoso) session 2026/2027</span>
              </div>
              <span className="text-[11px] text-slate-400">Written by Hostel Ease Advisory</span>
            </div>

          </div>
        ) : (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl text-xs text-slate-400">
            Select a guide from the list to view.
          </div>
        )}
      </div>

    </div>
  );
};
