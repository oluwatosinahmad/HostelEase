import React, { useState, useEffect } from 'react';
import { 
  X, 
  Zap, 
  Droplets, 
  Sun, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  PlusCircle,
  Send,
  MessageSquare,
  AlertTriangle,
  Radio,
  SlidersHorizontal,
  Flame,
  BatteryCharging
} from 'lucide-react';
import { getAuthToken } from '../services/api';

interface UtilityRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  onFilterByUtility?: (utilityType: 'solar' | 'high_power' | 'water') => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

interface AreaRadarData {
  areaId: string;
  areaName: string;
  slug: string;
  landmark: string;
  electricity: {
    status: string;
    consensusStatus: string;
    reportCount: number;
    lastReportedAt: string | null;
    isConflicted: boolean;
    conflictNote: string | null;
    freshnessMinutes: number | null;
    recentNotes: Array<{ notes: string; created_at: string }>;
  };
  water: {
    status: string;
    consensusStatus: string;
    reportCount: number;
    lastReportedAt: string | null;
    isConflicted: boolean;
    conflictNote: string | null;
    freshnessMinutes: number | null;
    recentNotes: Array<{ notes: string; created_at: string }>;
  };
}

export const UtilityRadarModal: React.FC<UtilityRadarModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onFilterByUtility,
  onShowToast
}) => {
  const [areasData, setAreasData] = useState<AreaRadarData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Quick report state
  const [reportingAreaId, setReportingAreaId] = useState<string | null>(null);
  const [reportUtilityType, setReportUtilityType] = useState<'ELECTRICITY' | 'WATER'>('ELECTRICITY');
  const [reportStatus, setReportStatus] = useState<string>('POWER_ON');
  const [reportNotes, setReportNotes] = useState<string>('');
  const [submittingReport, setSubmittingReport] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchRadarOverview();
  }, [isOpen]);

  const getHeaders = () => {
    const token = getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (currentUser?.id) {
      headers['x-user-id'] = currentUser.id;
      headers['x-user-role'] = currentUser.role || 'STUDENT';
      headers['x-user-email'] = currentUser.email || '';
    }
    return headers;
  };

  const fetchRadarOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/utilities/overview', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAreasData(data.areas || []);
      }
    } catch (err) {
      console.error('Failed to load UtilityRadar:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchRadarOverview();
    setIsRefreshing(false);
    onShowToast('Refreshed live community power & water status across campus!', 'success');
  };

  const handleOpenReportModal = (areaId: string, utilityType: 'ELECTRICITY' | 'WATER') => {
    setReportingAreaId(areaId);
    setReportUtilityType(utilityType);
    setReportStatus(utilityType === 'ELECTRICITY' ? 'POWER_ON' : 'WATER_AVAILABLE');
    setReportNotes('');
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingAreaId) return;

    setSubmittingReport(true);
    try {
      const res = await fetch('/api/utilities/report', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          areaId: reportingAreaId,
          utilityType: reportUtilityType,
          status: reportStatus,
          notes: reportNotes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      onShowToast(data.message || 'Report submitted! Thank you for updating fellow students.', 'success');
      setReportingAreaId(null);
      fetchRadarOverview();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to submit report', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  const formatFreshness = (mins: number | null) => {
    if (mins === null || mins === undefined) return 'No recent reports';
    if (mins < 2) return 'Just now (< 2 mins ago)';
    if (mins < 60) return `${mins} mins ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  };

  const getElecStatusBadge = (status: string) => {
    switch (status) {
      case 'POWER_ON':
        return (
          <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Zap className="w-3.5 h-3.5 fill-emerald-500" />
            <span>Power ON (IBEDC)</span>
          </span>
        );
      case 'GENERATOR_ON':
        return (
          <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
            <BatteryCharging className="w-3.5 h-3.5 text-amber-500" />
            <span>Generator ON</span>
          </span>
        );
      case 'POWER_OFF':
        return (
          <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Power OFF (Outage)</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            Awaiting Reports
          </span>
        );
    }
  };

  const getWaterStatusBadge = (status: string) => {
    switch (status) {
      case 'WATER_AVAILABLE':
        return (
          <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/30 flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-sky-500 fill-sky-500" />
            <span>Water Running</span>
          </span>
        );
      case 'WATER_UNAVAILABLE':
        return (
          <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Taps Dry / Pumping Due</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            Awaiting Reports
          </span>
        );
    }
  };

  const filteredAreas = selectedAreaId === 'all'
    ? areasData
    : areasData.filter(a => a.areaId === selectedAreaId);

  if (!isOpen) return null;

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
                  LIVE
                </span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-300 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Real-Time Campus Utility Pulse
                </span>
              </div>
              <h3 className="text-xl font-black text-white">
                UtilityRadar™
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
              <strong>Crowd-Sourced Real-Time Reliability:</strong> Reports are submitted directly by students living in Under G, Adenike, Olubere, College Road, Abaa, and Isale General. Rate-limited and consensus verified.
            </p>
          </div>

          {onFilterByUtility && (
            <button
              onClick={() => {
                onFilterByUtility('solar');
                onClose();
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-sm cursor-pointer whitespace-nowrap flex-shrink-0"
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Filter Solar Lodges</span>
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-6 flex-1">
          {/* Area Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedAreaId('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedAreaId === 'all'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All LAUTECH Areas ({areasData.length})
            </button>
            {areasData.map(a => (
              <button
                key={a.areaId}
                onClick={() => setSelectedAreaId(a.areaId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedAreaId === a.areaId
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                📍 {a.areaName.split(' ')[0]}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
              Loading real-time utility reports...
            </div>
          ) : (
            /* Area Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAreas.map((area) => (
                <div 
                  key={area.areaId}
                  className="bg-white dark:bg-slate-800/90 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600 p-5 shadow-sm transition-all space-y-4"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-base text-slate-900 dark:text-white">
                        {area.areaName}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        📍 {area.landmark || 'LAUTECH Axis'}
                      </p>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {area.electricity.reportCount + area.water.reportCount} reports today
                    </span>
                  </div>

                  {/* Electricity Section */}
                  <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>Electricity Status</span>
                      </span>
                      {getElecStatusBadge(area.electricity.status)}
                    </div>

                    {/* Conflict Warning */}
                    {area.electricity.isConflicted && (
                      <div className="p-2 rounded-lg bg-amber-100/90 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 text-[10px] text-amber-950 dark:text-amber-200 flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                        <span>Mixed reports from students in this area — conditions may be changing.</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-amber-200/40">
                      <span>Updated: {formatFreshness(area.electricity.freshnessMinutes)}</span>
                      <button
                        onClick={() => handleOpenReportModal(area.areaId, 'ELECTRICITY')}
                        className="text-amber-700 dark:text-amber-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>Submit Power Update</span>
                      </button>
                    </div>

                    {/* Recent notes preview */}
                    {area.electricity.recentNotes?.length > 0 && area.electricity.recentNotes[0].notes && (
                      <p className="text-[10px] text-slate-600 dark:text-slate-300 italic bg-white/70 dark:bg-slate-900/70 p-1.5 rounded-lg border border-amber-100 dark:border-amber-900">
                        "{area.electricity.recentNotes[0].notes}"
                      </p>
                    )}
                  </div>

                  {/* Water Section */}
                  <div className="p-3.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                        <Droplets className="w-3.5 h-3.5 text-sky-500" />
                        <span>Borehole Water Status</span>
                      </span>
                      {getWaterStatusBadge(area.water.status)}
                    </div>

                    {/* Conflict Warning */}
                    {area.water.isConflicted && (
                      <div className="p-2 rounded-lg bg-sky-100/90 dark:bg-sky-900/60 border border-sky-300 dark:border-sky-700 text-[10px] text-sky-950 dark:text-sky-200 flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-sky-700 flex-shrink-0" />
                        <span>Mixed reports — conditions may be changing.</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-sky-200/40">
                      <span>Updated: {formatFreshness(area.water.freshnessMinutes)}</span>
                      <button
                        onClick={() => handleOpenReportModal(area.areaId, 'WATER')}
                        className="text-sky-700 dark:text-sky-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>Submit Water Update</span>
                      </button>
                    </div>

                    {/* Recent notes preview */}
                    {area.water.recentNotes?.length > 0 && area.water.recentNotes[0].notes && (
                      <p className="text-[10px] text-slate-600 dark:text-slate-300 italic bg-white/70 dark:bg-slate-900/70 p-1.5 rounded-lg border border-sky-100 dark:border-sky-900">
                        "{area.water.recentNotes[0].notes}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submission Modal Overlay */}
        {reportingAreaId && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-amber-500" />
                  <span>Report Utility Condition</span>
                </h4>
                <button
                  onClick={() => setReportingAreaId(null)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitReport} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Area:
                  </label>
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                    📍 {areasData.find(a => a.areaId === reportingAreaId)?.areaName}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Utility Type:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReportUtilityType('ELECTRICITY');
                        setReportStatus('POWER_ON');
                      }}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        reportUtilityType === 'ELECTRICITY'
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Electricity</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReportUtilityType('WATER');
                        setReportStatus('WATER_AVAILABLE');
                      }}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        reportUtilityType === 'WATER'
                          ? 'border-sky-500 bg-sky-50 dark:bg-sky-950 text-sky-900 dark:text-sky-200'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <Droplets className="w-3.5 h-3.5 text-sky-500" />
                      <span>Water</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Current Condition:
                  </label>
                  {reportUtilityType === 'ELECTRICITY' ? (
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'POWER_ON', label: 'Power ON' },
                        { id: 'POWER_OFF', label: 'Power OFF' },
                        { id: 'GENERATOR_ON', label: 'Generator ON' }
                      ].map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setReportStatus(s.id)}
                          className={`py-2 px-1 rounded-xl text-[11px] font-bold border text-center cursor-pointer ${
                            reportStatus === s.id
                              ? 'border-amber-600 bg-amber-600 text-white font-black'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'WATER_AVAILABLE', label: 'Water Available' },
                        { id: 'WATER_UNAVAILABLE', label: 'Water Unavailable' }
                      ].map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setReportStatus(s.id)}
                          className={`py-2 px-2 rounded-xl text-[11px] font-bold border text-center cursor-pointer ${
                            reportStatus === s.id
                              ? 'border-sky-600 bg-sky-600 text-white font-black'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Notes / Axis specifics (Optional):
                  </label>
                  <input
                    type="text"
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                    placeholder="e.g. Transformer restored at 1:30pm around Bovas junction"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportingAreaId(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {submittingReport ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Broadcasting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Broadcast Report</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 z-20 bg-slate-50 dark:bg-slate-900 p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated in real time by LAUTECH hostel residents • Anti-spam protected.</span>
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
