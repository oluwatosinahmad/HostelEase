import React, { useState, useEffect } from 'react';
import { MapPin, Zap, Droplets, Shield, Bike, Footprints, DollarSign, Store, Landmark, Info } from 'lucide-react';
import { api } from '../services/api';
import { formatNaira } from '../utils/formatters';

const parseJsonArray = (val: any): string[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return val ? [val] : [];
    }
  }
  return [];
};

const defaultAreaGuides = [
  {
    id: 'area-guide-under-g',
    area_name: 'Under G',
    description: 'Premier student residential zone closest to LAUTECH Campus. Famous for high availability of modern self-contain apartments, restaurants, and active nightlife.',
    walking_minutes_to_campus: 8,
    bike_minutes_to_campus: 3,
    estimated_daily_transport: 200,
    power_reliability_summary: '6 - 9 hours daily grid power. Most hostels feature dedicated solar inverters or central generators.',
    water_reliability_summary: 'Clean treated borehole water in 90% of lodges with automated overhead tanks.',
    security_summary: 'Gated student compounds with private night security guards and vigilant community vigilante patrols.',
    popular_landmarks_json: '["Under G Gate", "Bovas Petrol Station", "The Hive Eatery", "Tivoli Lounge"]',
    nearby_services_json: '["Mini Supermarkets", "Cybercafes & Printing", "POS Terminals", "Pharmacies"]'
  },
  {
    id: 'area-guide-adenike',
    area_name: 'Adenike',
    description: 'Bustling student hub with numerous budget-friendly hostels, study cafes, and frequent commercial bike transit directly into faculty gates.',
    walking_minutes_to_campus: 12,
    bike_minutes_to_campus: 4,
    estimated_daily_transport: 250,
    power_reliability_summary: 'Steady feeder supply averaging 7 - 10 hours daily. Excellent solar inverter adoption.',
    water_reliability_summary: 'Reliable private boreholes in compounds.',
    security_summary: 'Active police outpost nearby, well-lit main streets, and compound perimeter fencing.',
    popular_landmarks_json: '["Adenike Gate", "Destiny Supermarket", "Winner Chapel Junction", "Alata Market"]',
    nearby_services_json: '["Laundromats", "Student Cafeterias", "Stationery Hubs", "Medical Clinics"]'
  },
  {
    id: 'area-guide-stadium',
    area_name: 'Stadium Road',
    description: 'Serene and modern residential district preferred by senior students and medical scholars who need quieter study environments.',
    walking_minutes_to_campus: 20,
    bike_minutes_to_campus: 6,
    estimated_daily_transport: 350,
    power_reliability_summary: 'High stability feeder with up to 10 - 12 hours daily electricity.',
    water_reliability_summary: 'Independent pressurized borehole systems.',
    security_summary: 'Very high security rating with neighborhood security gates locked by 10 PM.',
    popular_landmarks_json: '["Ogbomoso Township Stadium", "Stadium Gate", "Peace Arena", "D-Spot Supermarket"]',
    nearby_services_json: '["Fitness Centers", "Supermarkets", "Tech Hubs", "Co-working spaces"]'
  },
  {
    id: 'area-guide-general',
    area_name: 'General Area',
    description: 'Located in proximity to LAUTECH Teaching Hospital and College of Health Sciences. Ideal for clinical and basic medical students.',
    walking_minutes_to_campus: 15,
    bike_minutes_to_campus: 5,
    estimated_daily_transport: 300,
    power_reliability_summary: 'Priority hospital line power with up to 14 hours daily electricity.',
    water_reliability_summary: 'Clean public and private water access.',
    security_summary: 'Surrounded by hospital security and constant street surveillance.',
    popular_landmarks_json: '["LAUTECH Teaching Hospital", "General Gas", "Health Gate", "Mercy Hospital"]',
    nearby_services_json: '["24/7 Pharmacies", "Medical Bookshops", "Diagnostic Centers", "Fruit Markets"]'
  }
];

export const AreaGuideDetail: React.FC = () => {
  const [areas, setAreas] = useState<any[]>(defaultAreaGuides);
  const [selectedArea, setSelectedArea] = useState<any | null>(defaultAreaGuides[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const res = await api.community.getAreas();
        if (res.areas && res.areas.length > 0) {
          setAreas(res.areas);
          setSelectedArea(res.areas[0]);
        }
      } catch (err) {
        console.error('Failed to load area guides from API:', err);
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
                {parseJsonArray(selectedArea.popular_landmarks_json).map((lm: string, idx: number) => (
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
                {parseJsonArray(selectedArea.nearby_services_json).map((sv: string, idx: number) => (
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
