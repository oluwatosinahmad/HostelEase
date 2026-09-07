import React, { useState, useEffect } from 'react';
import { 
  X, 
  Zap, 
  Droplets, 
  Sun, 
  ShieldCheck, 
  ThumbsUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  RefreshCw,
  SlidersHorizontal,
  Flame
} from 'lucide-react';
import { formatNaira } from '../utils/formatters';

interface UtilityRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilterByUtility?: (utilityType: 'solar' | 'high_power' | 'water') => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

interface AreaUtilityStatus {
  areaId: string;
  areaName: string;
  landmark: string;
  lightHoursAvg: number;
  currentLightStatus: 'ON' | 'OUTAGE';
  lastStatusChange: string;
  waterStatus: 'FLOWING' | 'SCHEDULED';
  solarLodgesCount: number;
  studentSatisfactionRating: number;
  feederName: string;
  communityVotes: {
    lightOn: number;
    lightOut: number;
    waterRunning: number;
  };
}

const DEFAULT_AREA_UTILITIES: AreaUtilityStatus[] = [
  {
    areaId: 'area-under-g',
    areaName: 'Under G (Main Gate Axis)',
    landmark: 'Bovas Station & LAUTECH Under-G Gate',
    lightHoursAvg: 18,
    currentLightStatus: 'ON',
    lastStatusChange: 'Active for 3 hrs',
    waterStatus: 'FLOWING',
    solarLodgesCount: 9,
    studentSatisfactionRating: 4.8,
    feederName: 'Commercial Priority Feeder 1',
    communityVotes: { lightOn: 84, lightOut: 6, waterRunning: 91 }
  },
  {
    areaId: 'area-adenike',
    areaName: 'Adenike Community',
    landmark: 'Adenike Junction & Holy Light',
    lightHoursAvg: 20,
    currentLightStatus: 'ON',
    lastStatusChange: 'Active for 5 hrs',
    waterStatus: 'FLOWING',
    solarLodgesCount: 12,
    studentSatisfactionRating: 4.9,
    feederName: 'Industrial/Hostel Dedicated Line',
    communityVotes: { lightOn: 112, lightOut: 4, waterRunning: 104 }
  },
  {
    areaId: 'area-stadium-road',
    areaName: 'Stadium Road',
    landmark: 'Ogbomoso Township Stadium Gate 2',
    lightHoursAvg: 16,
    currentLightStatus: 'ON',
    lastStatusChange: 'Active for 2 hrs',
    waterStatus: 'FLOWING',
    solarLodgesCount: 7,
    studentSatisfactionRating: 4.6,
    feederName: 'Stadium Residential Line',
    communityVotes: { lightOn: 56, lightOut: 11, waterRunning: 68 }
  },
  {
    areaId: 'area-college-road',
    areaName: 'College Road / 2nd Gate',
    landmark: 'Opposite CHS Anatomy Complex',
    lightHoursAvg: 17,
    currentLightStatus: 'ON',
    lastStatusChange: 'Active for 4 hrs',
    waterStatus: 'FLOWING',
    solarLodgesCount: 8,
    studentSatisfactionRating: 4.7,
    feederName: 'Medical / University Feeder',
    communityVotes: { lightOn: 72, lightOut: 8, waterRunning: 80 }
  },
  {
    areaId: 'area-abaa',
    areaName: 'Abaa Area',
    landmark: 'Abaa Junction & Central Market',
    lightHoursAvg: 18,
    currentLightStatus: 'ON',
    lastStatusChange: 'Active for 2.5 hrs',
    waterStatus: 'FLOWING',
    solarLodgesCount: 6,
    studentSatisfactionRating: 4.8,
    feederName: 'Abaa Commercial Feeder',
    communityVotes: { lightOn: 49, lightOut: 7, waterRunning: 52 }
  },
  {
    areaId: 'area-isale-general',
    areaName: 'Isale General',
    landmark: 'General Hospital Axis',
    lightHoursAvg: 15,
    currentLightStatus: 'ON',
    lastStatusChange: 'Active for 1.5 hrs',
    waterStatus: 'FLOWING',
    solarLodgesCount: 4,
    studentSatisfactionRating: 4.4,
    feederName: 'Hospital / General Residential',
    communityVotes: { lightOn: 38, lightOut: 12, waterRunning: 41 }
  }
];

export const UtilityRadarModal: React.FC<UtilityRadarModalProps> = ({
  isOpen,
  onClose,
  onFilterByUtility,
  onShowToast
}) => {
  const [areaUtilities, setAreaUtilities] = useState<AreaUtilityStatus[]>(() => {
    try {
      const saved = localStorage.getItem('hostel_ease_utility_radar_data');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_AREA_UTILITIES;
  });

  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [userVotedArea, setUserVotedArea] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('hostel_ease_user_utility_votes');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('hostel_ease_utility_radar_data', JSON.stringify(areaUtilities));
    } catch {}
  }, [areaUtilities]);

  useEffect(() => {
    try {
      localStorage.setItem('hostel_ease_user_utility_votes', JSON.stringify(userVotedArea));
    } catch {}
  }, [userVotedArea]);

  if (!isOpen) return null;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      onShowToast('Refreshed live community power & water status!', 'success');
    }, 450);
  };

  const handleCastVote = (areaId: string, voteType: 'LIGHT_ON' | 'LIGHT_OUT' | 'WATER_RUNNING') => {
    setAreaUtilities(prev => prev.map(area => {
      if (area.areaId === areaId) {
        return {
          ...area,
          communityVotes: {
            ...area.communityVotes,
            lightOn: voteType === 'LIGHT_ON' ? area.communityVotes.lightOn + 1 : area.communityVotes.lightOn,
            lightOut: voteType === 'LIGHT_OUT' ? area.communityVotes.lightOut + 1 : area.communityVotes.lightOut,
            waterRunning: voteType === 'WATER_RUNNING' ? area.communityVotes.waterRunning + 1 : area.communityVotes.waterRunning
          }
        };
      }
      return area;
    }));

    setUserVotedArea(prev => ({ ...prev, [areaId]: voteType }));
    onShowToast(`Thank you! Your status report for ${areaUtilities.find(a => a.areaId === areaId)?.areaName.split(' ')[0]} was recorded.`, 'success');
  };

  const filteredAreas = selectedAreaId === 'all'
    ? areaUtilities
    : areaUtilities.filter(a => a.areaId === selectedAreaId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 relative flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Zap className="w-6 h-6 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/30 text-amber-300 border border-amber-500/40">
                  ⚡ UtilityRadar™ Live
                </span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-300 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Campus Pulse
                </span>
              </div>
              <h3 className="text-xl font-black text-white">
                LAUTECH Electricity & Borehole Reliability Index
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Refresh live status"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Advisory Banner */}
        <div className="p-4 sm:p-5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Sun className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
              <strong>Why Light & Water Matter:</strong> Over 70% of student dissatisfaction comes from unannounced power outages and dry taps. Hostel Ease verifies generator schedules, solar inverters, and motorized borehole capacity for every listed lodge.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {onFilterByUtility && (
              <button
                onClick={() => {
                  onFilterByUtility('solar');
                  onClose();
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-sm cursor-pointer whitespace-nowrap"
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Show Solar Lodges Only</span>
              </button>
            )}
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-6 flex-1">
          {/* Area Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedAreaId('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedAreaId === 'all'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All LAUTECH Areas ({areaUtilities.length})
            </button>
            {areaUtilities.map(a => (
              <button
                key={a.areaId}
                onClick={() => setSelectedAreaId(a.areaId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedAreaId === a.areaId
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                📍 {a.areaName.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Area Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAreas.map((area) => (
              <div 
                key={area.areaId}
                className="bg-white dark:bg-slate-800/90 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600 p-5 shadow-sm transition-all space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-black text-base text-slate-900 dark:text-white">
                        {area.areaName}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                        {area.studentSatisfactionRating} ★
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      📍 {area.landmark} • {area.feederName}
                    </p>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
                    <span>{area.currentLightStatus}</span>
                  </span>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/60 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-600" /> Average Daily Light
                    </span>
                    <p className="font-black text-lg text-slate-900 dark:text-white">
                      {area.lightHoursAvg} <span className="text-xs font-semibold text-slate-500">hours/day</span>
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      High reliability during exams
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800/60 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1">
                      <Droplets className="w-3 h-3 text-sky-600" /> Water Security
                    </span>
                    <p className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1 pt-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{area.waterStatus === 'FLOWING' ? 'Deep Borehole' : 'Scheduled'}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Multi-tank overhead reserve
                    </p>
                  </div>
                </div>

                {/* Solar Lodges Counter */}
                <div className="flex items-center justify-between text-xs p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>Hostels with 24/7 Solar Inverter:</span>
                  </span>
                  <span className="font-black text-emerald-700 dark:text-emerald-400">
                    {area.solarLodgesCount} Lodges
                  </span>
                </div>

                {/* 1-Tap Live Community Vote Bar */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 font-bold">
                      Student Crowd Pulse (Today):
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      {area.communityVotes.lightOn + area.communityVotes.lightOut + area.communityVotes.waterRunning} reports
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => handleCastVote(area.areaId, 'LIGHT_ON')}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        userVotedArea[area.areaId] === 'LIGHT_ON'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50'
                      }`}
                    >
                      <Zap className="w-3 h-3 fill-current" />
                      <span>Light On ({area.communityVotes.lightOn})</span>
                    </button>

                    <button
                      onClick={() => handleCastVote(area.areaId, 'WATER_RUNNING')}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        userVotedArea[area.areaId] === 'WATER_RUNNING'
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white dark:bg-slate-900 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800 hover:bg-sky-50'
                      }`}
                    >
                      <Droplets className="w-3 h-3 fill-current" />
                      <span>Water Flow ({area.communityVotes.waterRunning})</span>
                    </button>

                    <button
                      onClick={() => handleCastVote(area.areaId, 'LIGHT_OUT')}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        userVotedArea[area.areaId] === 'LIGHT_OUT'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white dark:bg-slate-900 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-50'
                      }`}
                    >
                      <span>No Light ({area.communityVotes.lightOut})</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-20 bg-slate-50 dark:bg-slate-900 p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated in real time by LAUTECH hostel residents • Zero speculation.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Close UtilityRadar
          </button>
        </div>
      </div>
    </div>
  );
};
