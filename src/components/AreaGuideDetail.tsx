import React, { useState, useEffect } from 'react';
import { MapPin, Zap, Droplets, Shield, Bike, Footprints, DollarSign, Store, Landmark, Info } from 'lucide-react';
import { api } from '../services/api';
import { formatNaira } from '../utils/formatters';

export const AreaGuideDetail: React.FC = () => {
  const [areas, setAreas] = useState<any[]>([]);
  const [selectedArea, setSelectedArea] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAreas = async () => {
      setLoading(true);
      try {
        const res = await api.community.getAreas();
        setAreas(res.areas || []);
        if (res.areas?.length > 0) {
          setSelectedArea(res.areas[0]);
        }
      } catch (err) {
        console.error('Failed to load area guides:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAreas();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Area Selector Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {areas.map((a) => {
          const isSelected = selectedArea?.id === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setSelectedArea(a)}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 flex-shrink-0 ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-700'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              <span>{a.area_name}</span>
            </button>
          );
        })}
      </div>

      {/* Selected Area Detail */}
      {selectedArea && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                  LAUTECH Neighborhood
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                  Ogbomoso, Oyo State
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1">{selectedArea.area_name}</h2>
              <p className="text-xs text-slate-600 font-medium mt-0.5 max-w-xl leading-relaxed">
                {selectedArea.description}
              </p>
            </div>

            {/* Commute Quick Badge */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-center space-y-1 sm:min-w-[170px]">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Campus Commute</span>
              <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1">
                  <Footprints className="w-3.5 h-3.5 text-emerald-600" />
                  {selectedArea.walking_minutes_to_campus} min
                </span>
                <span className="flex items-center gap-1">
                  <Bike className="w-3.5 h-3.5 text-blue-600" />
                  {selectedArea.bike_minutes_to_campus} min
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Est. Daily Transport: {formatNaira(selectedArea.estimated_daily_transport)}
              </p>
            </div>
          </div>

          {/* Key Infrastructure Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-amber-900 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-600" />
                  Electricity Status
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-200/80 text-amber-900 rounded">
                  ESTIMATED
                </span>
              </div>
              <p className="text-slate-700 font-medium leading-relaxed">
                {selectedArea.power_reliability_summary}
              </p>
            </div>

            <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-blue-900 flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-blue-600" />
                  Water Infrastructure
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.5 bg-blue-200/80 text-blue-900 rounded">
                  PLATFORM DATA
                </span>
              </div>
              <p className="text-slate-700 font-medium leading-relaxed">
                {selectedArea.water_reliability_summary}
              </p>
            </div>

            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-900 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Security & Environment
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-200/80 text-emerald-900 rounded">
                  COMMUNITY FEEDBACK
                </span>
              </div>
              <p className="text-slate-700 font-medium leading-relaxed">
                {selectedArea.security_summary}
              </p>
            </div>

          </div>

          {/* Landmarks & Services */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
              <h4 className="font-black text-slate-900 flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-slate-600" />
                <span>Popular Landmarks</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {JSON.parse(selectedArea.popular_landmarks_json || '[]').map((lm: string, idx: number) => (
                  <span key={idx} className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold text-[11px]">
                    📍 {lm}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
              <h4 className="font-black text-slate-900 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-slate-600" />
                <span>Nearby Student Services</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {JSON.parse(selectedArea.nearby_services_json || '[]').map((sv: string, idx: number) => (
                  <span key={idx} className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold text-[11px]">
                    🛒 {sv}
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Data Provenance Footer */}
          <div className="p-3 bg-slate-100 rounded-2xl flex items-center gap-2 text-[11px] text-slate-600 font-medium">
            <Info className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <span>
              <strong>Data Provenance Notice:</strong> Commute times and daily transport costs are calculated estimates for typical school days and vary based on weather and peak bike hours.
            </span>
          </div>

        </div>
      )}

    </div>
  );
};
