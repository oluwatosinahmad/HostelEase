import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Building2, 
  Sparkles, 
  CheckCircle2, 
  Hourglass, 
  ArrowRight, 
  Mail, 
  Check, 
  Compass,
  GraduationCap
} from 'lucide-react';
import { University } from '../types';
import { UNIVERSITIES } from '../data/campusData';

interface CampusExpansionModalProps {
  currentUniversity: University;
  onSelectUniversity: (univ: University) => void;
  onClose: () => void;
}

export const CampusExpansionModal: React.FC<CampusExpansionModalProps> = ({
  currentUniversity,
  onSelectUniversity,
  onClose,
}) => {
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [selectedWaitlistUniv, setSelectedWaitlistUniv] = useState<string>('ui');
  const [isWaitlistSubmitted, setIsWaitlistSubmitted] = useState(false);

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail) return;
    setIsWaitlistSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 relative flex flex-col">
        
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xl text-slate-900">
                University & Campus Coverage
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                CampusNest multi-university architecture & nationwide rollout roadmap
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Active Launch Institution Banner */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Live Marketplace (MVP)
              </span>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                Currently Live
              </span>
            </div>

            {UNIVERSITIES.filter((u) => u.status === 'active').map((univ) => (
              <div
                key={univ.id}
                onClick={() => {
                  onSelectUniversity(univ);
                  onClose();
                }}
                className="bg-emerald-50/70 border-2 border-emerald-500 rounded-2xl p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-emerald-100/60 transition-all shadow-xs group"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-lg shrink-0 shadow-sm">
                    {univ.shortName}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-base text-slate-900 group-hover:text-emerald-800">
                        {univ.name}
                      </h4>
                    </div>
                    <p className="text-xs text-emerald-900/80 font-medium mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{univ.cityName} Campus, {univ.stateName}</span>
                    </p>
                    <p className="text-xs text-slate-600 mt-2">
                      {univ.cityName} • <strong>Inspected student hostels & virtual video tours</strong>
                    </p>
                  </div>
                </div>

                <span className="shrink-0 bg-emerald-600 text-white p-2 rounded-xl text-xs font-bold group-hover:translate-x-1 transition-transform">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            ))}
          </div>

          {/* National Expansion Universities (Architecture Ready) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  Expanding to Universities Across Nigeria
                </h4>
                <p className="text-xs text-slate-500">
                  CampusNest is scaling to make student accommodation seamless nationwide.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {UNIVERSITIES.filter((u) => u.status !== 'active').map((univ) => (
                <div
                  key={univ.id}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-brand-600" />
                        {univ.shortName}
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded uppercase">
                        {univ.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-1">{univ.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{univ.cityName}, {univ.stateName}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">{univ.totalStudentsEstimate?.toLocaleString() || '35,000'}+ students</span>
                    <button
                      type="button"
                      onClick={() => setSelectedWaitlistUniv(univ.id)}
                      className="text-brand-700 font-bold hover:underline"
                    >
                      Vote for Campus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Student Campus Request & Waitlist Form */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-5 border border-slate-800">
            {isWaitlistSubmitted ? (
              <div className="text-center py-4 space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h5 className="font-bold text-sm text-white">You are on the CampusNest Priority Waitlist!</h5>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  We will notify you the moment verified hostels and virtual tours go live for your university campus.
                </p>
              </div>
            ) : (
              <form onSubmit={handleWaitlistSubmit} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h5 className="font-bold text-sm text-white">
                    Want CampusNest at your university next?
                  </h5>
                </div>
                <p className="text-xs text-slate-400">
                  Join 10,000+ Nigerian students voting for their campus. Get notified first when verified hostels launch in your city.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <select
                    value={selectedWaitlistUniv}
                    onChange={(e) => setSelectedWaitlistUniv(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                  >
                    {UNIVERSITIES.filter((u) => u.status !== 'active').map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.shortName} ({u.cityName})
                      </option>
                    ))}
                  </select>

                  <input
                    type="email"
                    required
                    placeholder="Enter your student email"
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />

                  <button
                    type="submit"
                    className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl py-2 px-3 transition-colors shadow-sm"
                  >
                    Join Priority Waitlist
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
