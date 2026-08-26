import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, AlertTriangle, Search, ShieldCheck, Activity, 
  MapPin, CheckCircle2, RefreshCw, Layers, Users
} from 'lucide-react';

export const AdminSupplyDemandDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [supplyDemandData, setSupplyDemandData] = useState<any | null>(null);
  const [duplicateFlags, setDuplicateFlags] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [sdRes, dupRes] = await Promise.all([
        fetch('/api/intelligence/admin/supply-demand', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/intelligence/admin/duplicate-flags', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const sdData = await sdRes.json();
      const dupData = await dupRes.json();

      setSupplyDemandData(sdData);
      setDuplicateFlags(dupData.duplicateFlags || []);
    } catch (err) {
      console.error('Failed to load admin supply-demand telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-600">Aggregating LAUTECH accommodation telemetry...</p>
      </div>
    );
  }

  const { supplyDemand, stressMetrics } = supplyDemandData || {};

  return (
    <div className="space-y-6">
      
      {/* 1. PLATFORM STRESS REDUCTION SCORE */}
      {stressMetrics && (
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-indigo-500/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  Live Platform Health
                </span>
                <span className="text-xs text-slate-400">LAUTECH Market Focus</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Platform Stress-Reduction Score
              </h3>
              <p className="text-xs text-slate-300 max-w-xl">
                {stressMetrics.platformEfficiencySummary}
              </p>
            </div>

            <div className="bg-white/10 border border-white/20 px-6 py-4 rounded-3xl text-center">
              <span className="text-3xl sm:text-4xl font-black text-emerald-400">
                {stressMetrics.stressReductionScore}
              </span>
              <span className="text-xs text-slate-300 font-bold block">/ 100 Efficiency</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-white/10">
            <div className="bg-white/5 p-3.5 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Avg Decision Time</span>
              <p className="text-lg font-black text-white mt-0.5">{stressMetrics.averageDecisionDays} Days</p>
            </div>
            <div className="bg-white/5 p-3.5 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Conversion Rate</span>
              <p className="text-lg font-black text-emerald-400 mt-0.5">{stressMetrics.searchToBookingConversionRate}</p>
            </div>
            <div className="bg-white/5 p-3.5 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Cancellation Rate</span>
              <p className="text-lg font-black text-amber-300 mt-0.5">{stressMetrics.bookingCancellationRate}</p>
            </div>
            <div className="bg-white/5 p-3.5 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Dispute Ratio</span>
              <p className="text-lg font-black text-blue-400 mt-0.5">{stressMetrics.activeDisputeRatio}</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. SUPPLY VS DEMAND BY NEIGHBORHOOD */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900">Neighborhood Supply vs Demand Gap</h4>
              <p className="text-xs text-slate-500">Student inquiry volume compared against active verified listings</p>
            </div>
          </div>

          <button
            onClick={fetchDashboardData}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {supplyDemand?.areas?.map((area: any) => (
            <div
              key={area.area}
              className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  {area.area}
                </span>

                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                  area.demandIntensity === 'VERY_HIGH' ? 'bg-rose-100 text-rose-800' :
                  area.demandIntensity === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                  'bg-emerald-100 text-emerald-800'
                }`}>
                  {area.demandIntensity.replace('_', ' ')}
                </span>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Available Verified Hostels:</span>
                  <span className="font-bold text-slate-900">{area.availableHostelsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Area Price:</span>
                  <span className="font-bold text-slate-900">₦{area.averageActualPrice.toLocaleString()}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-200 leading-tight">
                {area.supplyGapSummary}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. DUPLICATE LISTING MODERATION FLAGS */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900">Duplicate Listing Flag Scanner</h4>
            <p className="text-xs text-slate-500">Flags potential duplicates for admin moderation without auto-deleting</p>
          </div>
        </div>

        {duplicateFlags.length === 0 ? (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-slate-700">No duplicate listings detected.</p>
            <p className="text-[11px] text-slate-400">All registered provider listings have distinct locations and records.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {duplicateFlags.map((flag: any) => (
              <div key={flag.flagId} className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900">{flag.propertyA.title}</span>
                    <span className="text-slate-400">vs</span>
                    <span className="font-black text-slate-900">{flag.propertyB.title}</span>
                  </div>
                  <p className="text-[11px] text-amber-900 font-medium">
                    Reasons: {flag.reasons.join(' • ')} (Confidence: {Math.round(flag.confidence * 100)}%)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-amber-200 text-amber-900 font-bold rounded-lg text-[10px]">
                    Flagged for Admin Review
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
