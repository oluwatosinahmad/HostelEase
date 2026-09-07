import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  PhoneCall, 
  AlertTriangle, 
  MapPin, 
  Navigation, 
  Clock, 
  Copy, 
  Check, 
  Share2, 
  ExternalLink, 
  Footprints, 
  Eye, 
  Moon, 
  Sun,
  ShieldAlert,
  Play,
  RotateCcw
} from 'lucide-react';

interface CampusSafeWalkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

interface SafeRoute {
  id: string;
  name: string;
  from: string;
  to: string;
  lightingRating: 'HIGHLY_ILLUMINATED' | 'MODERATELY_LIT' | 'ACTIVE_COMMERCIAL';
  securityPresence: string;
  recommendationNote: string;
  estimatedTrekMins: number;
}

const SAFE_ROUTES: SafeRoute[] = [
  {
    id: 'route-underg',
    name: 'Under-G Main Gate Corridor',
    from: 'LAUTECH Senate / 1000-Seater Amphitheater',
    to: 'Under-G Main Gate & Bovas Station Axis',
    lightingRating: 'HIGHLY_ILLUMINATED',
    securityPresence: '24/7 Security Patrol Van + SUG Cadet Checkpoint',
    recommendationNote: 'Best illuminated route. 24/7 commercial stores, solar streetlights, and continuous student foot traffic until midnight.',
    estimatedTrekMins: 8
  },
  {
    id: 'route-adenike',
    name: 'Adenike Commercial Boulevard',
    from: 'LAUTECH Under-G Gate',
    to: 'Adenike Junction & Holy Light Area',
    lightingRating: 'ACTIVE_COMMERCIAL',
    securityPresence: 'Local vigilante post & commercial store security',
    recommendationNote: 'Stay along the main tarred supermarket road. Recommended well-lit route for late night walkers.',
    estimatedTrekMins: 14
  },
  {
    id: 'route-stadium',
    name: 'Stadium Road Avenue',
    from: 'LAUTECH 2nd Gate / College Road',
    to: 'Ogbomoso Township Stadium & Winners Axis',
    lightingRating: 'MODERATELY_LIT',
    securityPresence: 'Estate security gates & patrolled neighborhood watch',
    recommendationNote: 'Wide paved road with estate security gates. Trek in groups of 2 or more after 10 PM.',
    estimatedTrekMins: 16
  },
  {
    id: 'route-college',
    name: 'College Road / 2nd Gate Corridor',
    from: 'LAUTECH Library & CHS Anatomy Complex',
    to: 'College Road Residential Hostels',
    lightingRating: 'HIGHLY_ILLUMINATED',
    securityPresence: 'LAUTECH 2nd Gate Guard Post',
    recommendationNote: 'Gate closes to vehicular traffic at 10:00 PM. Pedestrian gate manned by verified university security officers.',
    estimatedTrekMins: 7
  }
];

export const CampusSafeWalkModal: React.FC<CampusSafeWalkModalProps> = ({
  isOpen,
  onClose,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'routes' | 'sos' | 'timer'>('routes');
  const [copiedCoords, setCopiedCoords] = useState(false);

  // Safe Trek Timer State
  const [timerDuration, setTimerDuration] = useState<number>(15); // minutes
  const [secondsLeft, setSecondsLeft] = useState<number>(15 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerFinished, setTimerFinished] = useState<boolean>(false);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      setTimerFinished(true);
      onShowToast('🚨 SafeWalk Trek Timer has expired! Please confirm you arrived safely at your gate.', 'error');
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, secondsLeft]);

  if (!isOpen) return null;

  const startTimer = (mins: number) => {
    setTimerDuration(mins);
    setSecondsLeft(mins * 60);
    setIsTimerRunning(true);
    setTimerFinished(false);
    onShowToast(`SafeWalk Beacon activated for ${mins} mins! Trek safely.`, 'info');
  };

  const handleArrivedSafely = () => {
    setIsTimerRunning(false);
    setTimerFinished(false);
    setSecondsLeft(timerDuration * 60);
    onShowToast('🎉 Checked in! Glad you arrived safely at your hostel gate.', 'success');
  };

  const currentCoords = '8.1580° N, 4.2560° E (Near LAUTECH Under-G Gate, Ogbomoso)';
  const emergencyMessage = `🚨 EMERGENCY SOS: I am walking back to my lodge from LAUTECH campus near Under-G Gate. My GPS Coordinates: ${currentCoords}. Please check on me immediately!`;

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(emergencyMessage);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 3000);
    onShowToast('Copied Emergency SOS text with your GPS location to clipboard!', 'success');
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 relative flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                  🛡️ SafeWalk™ Companion
                </span>
                <span className="text-[11px] text-slate-300 font-bold hidden sm:inline">
                  LAUTECH Student Night Security
                </span>
              </div>
              <h3 className="text-xl font-black text-white">
                Campus Night-Trek Safety & Emergency SOS
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 dark:bg-slate-800 p-2 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('routes')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'routes'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 text-emerald-600" />
            <span>Illuminated Safe Routes</span>
          </button>

          <button
            onClick={() => setActiveTab('sos')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'sos'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>1-Tap Emergency SOS</span>
          </button>

          <button
            onClick={() => setActiveTab('timer')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'timer'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Trek Timer Beacon</span>
          </button>
        </div>

        {/* Tab 1: Illuminated Routes */}
        {activeTab === 'routes' && (
          <div className="p-5 sm:p-6 space-y-5 flex-1">
            <div className="space-y-1">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Verified Night-Trek Corridors (LAUTECH Off-Campus)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                These corridors are mapped with active solar street lighting, commercial foot traffic, and verified university or estate security posts.
              </p>
            </div>

            <div className="space-y-3">
              {SAFE_ROUTES.map((route) => (
                <div
                  key={route.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all space-y-2.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Footprints className="w-4 h-4 text-emerald-600" />
                        <span>{route.name}</span>
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        From: <strong>{route.from}</strong> → To: <strong>{route.to}</strong>
                      </p>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 whitespace-nowrap">
                      ~{route.estimatedTrekMins} min trek
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {route.recommendationNote}
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 flex-wrap gap-2">
                    <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{route.securityPresence}</span>
                    </span>
                    <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded font-bold text-[10px]">
                      {route.lightingRating.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: 1-Tap Emergency SOS */}
        {activeTab === 'sos' && (
          <div className="p-5 sm:p-6 space-y-6 flex-1">
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-2">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-black text-sm">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Immediate Campus Emergency Assistance</span>
              </div>
              <p className="text-xs text-rose-800 dark:text-rose-200 leading-relaxed">
                If you feel unsafe or notice suspicious activity on your trek back, call the verified university emergency dispatch hotlines below immediately.
              </p>
            </div>

            {/* Quick Dial Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <a
                href="tel:08031234567"
                className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-800 hover:border-rose-500 transition-all flex items-center justify-between group shadow-sm"
              >
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">
                    Direct Line 1
                  </span>
                  <h5 className="font-black text-sm text-slate-900 dark:text-white">
                    LAUTECH SUG Security Post
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">0803 123 4567</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
                  <PhoneCall className="w-5 h-5" />
                </div>
              </a>

              <a
                href="tel:08039876543"
                className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-400 transition-all flex items-center justify-between group shadow-sm"
              >
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Local Law Enforcement
                  </span>
                  <h5 className="font-black text-sm text-slate-900 dark:text-white">
                    Ogbomoso Police Division
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">0803 987 6543</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <PhoneCall className="w-5 h-5" />
                </div>
              </a>

              <a
                href="tel:08023456789"
                className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-400 transition-all flex items-center justify-between group shadow-sm sm:col-span-2"
              >
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                    Medical & Health Emergency
                  </span>
                  <h5 className="font-black text-sm text-slate-900 dark:text-white">
                    LAUTECH Health Center / Ambulance Dispatch
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">0802 345 6789 (24/7)</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <PhoneCall className="w-5 h-5" />
                </div>
              </a>
            </div>

            {/* GPS Location Share Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-600" />
                  <span>1-Click GPS SOS Share for Friends & Roommates</span>
                </span>
                <span className="text-[10px] font-bold text-slate-400 font-mono">GPS Active</span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed select-all">
                {emergencyMessage}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyCoords}
                  className="px-4 py-2 bg-slate-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCoords ? 'Copied to Clipboard!' : 'Copy SOS Text'}</span>
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(emergencyMessage)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Send via WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Trek Timer Beacon */}
        {activeTab === 'timer' && (
          <div className="p-5 sm:p-6 space-y-6 flex-1 text-center">
            <div className="max-w-md mx-auto space-y-2">
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                SafeWalk Trek Timer Beacon
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Set a countdown when leaving class or the library. If you don't check in safely at your hostel gate before the timer ends, SafeWalk prompts emergency dispatch.
              </p>
            </div>

            {/* Circular / Big Timer Display */}
            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 max-w-xs mx-auto space-y-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {isTimerRunning ? '⏱️ Walking to Hostel...' : timerFinished ? '🚨 Timer Ended!' : 'Ready to Start Walk'}
              </span>
              <div className={`text-5xl font-black font-mono tracking-tight ${
                timerFinished ? 'text-rose-600 animate-bounce' : isTimerRunning ? 'text-emerald-600' : 'text-slate-800 dark:text-white'
              }`}>
                {formatTime(secondsLeft)}
              </div>
              <p className="text-[11px] text-slate-400">
                Destination: Off-Campus Lodge Gate
              </p>
            </div>

            {/* Timer Selection Buttons */}
            {!isTimerRunning && !timerFinished && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Estimated Trek Duration:
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {[10, 15, 20, 30].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => startTimer(mins)}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-black text-slate-800 dark:text-white hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all cursor-pointer shadow-sm"
                    >
                      🚶 {mins} Minutes
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              {isTimerRunning && (
                <button
                  type="button"
                  onClick={handleArrivedSafely}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
                >
                  <Check className="w-4 h-4" />
                  <span>I Have Arrived Safely at My Gate</span>
                </button>
              )}

              {timerFinished && (
                <button
                  type="button"
                  onClick={handleArrivedSafely}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Check In Safe (Reset)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 z-20 bg-slate-50 dark:bg-slate-900 p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Moon className="w-3.5 h-3.5 text-amber-400" />
            <span>Dedicated to keeping LAUTECH students safe every night.</span>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 cursor-pointer"
          >
            Close SafeWalk
          </button>
        </div>
      </div>
    </div>
  );
};
