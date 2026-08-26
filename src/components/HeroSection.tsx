import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  ShieldCheck, 
  Eye, 
  Zap, 
  Footprints, 
  ArrowRight,
  SlidersHorizontal,
  DollarSign
} from 'lucide-react';
import { Area } from '../types/hostelEase';

interface HeroSectionProps {
  areas: Area[];
  onSearchSubmit: (searchTerm: string, areaId: string, roomType: string) => void;
  onSelectArea: (areaId: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  areas,
  onSearchSubmit,
  onSelectArea
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedRoomType, setSelectedRoomType] = useState('all');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(searchTerm, selectedArea, selectedRoomType);
  };

  return (
    <div className="relative bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-900 text-white overflow-hidden pt-8 pb-14 md:pt-14 md:pb-20">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Brand Headline & Core Principle */}
        <div className="text-center max-w-3xl mx-auto space-y-3.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            LAUTECH Ogbomoso Student Housing Platform
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Find your hostel. <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">
              Stress less.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto font-normal">
            Discover verified student hostels around LAUTECH campus. Transparent pricing, genuine photos, real distances, and fast inspection booking.
          </p>
        </div>

        {/* Search First Bar (Mobile-First) */}
        <div className="max-w-4xl mx-auto">
          <form 
            onSubmit={handleSubmit}
            className="bg-white/10 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl md:rounded-3xl border border-white/20 shadow-2xl space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-2"
          >
            {/* Search Input */}
            <div className="flex-1 relative flex items-center bg-white rounded-xl px-3 py-2 text-slate-800">
              <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search by hostel name, landmark, or street..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs sm:text-sm bg-transparent border-none outline-none font-medium placeholder:text-slate-400"
              />
            </div>

            {/* Area Dropdown */}
            <div className="sm:w-48 bg-white rounded-xl px-3 py-2 flex items-center text-slate-800">
              <MapPin className="w-4 h-4 text-emerald-600 mr-1.5 flex-shrink-0" />
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full text-xs sm:text-sm bg-transparent border-none outline-none font-medium text-slate-700 cursor-pointer"
              >
                <option value="all">All LAUTECH Areas</option>
                {areas.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            {/* Room Type */}
            <div className="sm:w-40 bg-white rounded-xl px-3 py-2 flex items-center text-slate-800">
              <select
                value={selectedRoomType}
                onChange={(e) => setSelectedRoomType(e.target.value)}
                className="w-full text-xs sm:text-sm bg-transparent border-none outline-none font-medium text-slate-700 cursor-pointer"
              >
                <option value="all">Any Room Type</option>
                <option value="SELF_CONTAIN">Self-Contain</option>
                <option value="SINGLE_ROOM">Single Room</option>
                <option value="FLAT">Flat / Apartment</option>
                <option value="SHARED_BEDSPACE">Bedspace</option>
              </select>
            </div>

            {/* Submit CTA Button */}
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-1.5"
            >
              <span>FIND A HOSTEL</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Popular LAUTECH Areas Quick Chips */}
        <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">
            Popular Areas:
          </span>
          {areas.slice(0, 6).map(area => (
            <button
              key={area.id}
              onClick={() => onSelectArea(area.id)}
              className="px-3 py-1 bg-white/5 hover:bg-white/15 border border-white/10 rounded-full text-xs font-medium text-slate-200 hover:text-white transition-all whitespace-nowrap flex items-center gap-1"
            >
              <span>📍 {area.name}</span>
              {area.approxDistanceMinKm && (
                <span className="text-[10px] text-emerald-400 font-bold">
                  ({area.approxDistanceMinKm}km)
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Core Product Principle Value Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl mx-auto pt-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur text-left space-y-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
              <Eye className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">Search First. Visit Less.</h4>
            <p className="text-[11px] text-slate-400">Inspect rooms via photos & video tours before visiting in person.</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur text-left space-y-1">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2">
              <DollarSign className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">Transparent Pricing</h4>
            <p className="text-[11px] text-slate-400">See all mandatory charges, caution fees, and agency costs upfront.</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur text-left space-y-1">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-2">
              <Footprints className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">Real LAUTECH Distance</h4>
            <p className="text-[11px] text-slate-400">Know the exact walking or transit distance to campus lecture halls.</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur text-left space-y-1">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-2">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">Verified Accommodations</h4>
            <p className="text-[11px] text-slate-400">Every approved hostel is physically checked to protect students from scams.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
