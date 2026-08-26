import React from 'react';
import { 
  Filter, 
  RotateCcw, 
  Search, 
  MapPin, 
  Zap, 
  Droplets, 
  Wifi, 
  ShieldCheck, 
  Utensils, 
  Cpu, 
  Sun, 
  Car, 
  Shirt, 
  BedDouble,
  SlidersHorizontal,
  X,
  Footprints,
  DollarSign,
    CheckCircle2, Sparkles, ArrowRight
  } from 'lucide-react';
import { Area, SearchFilterState } from '../types/hostelEase';
import { formatNaira } from '../utils/formatters';

interface HostelSearchFiltersProps {
  filters: SearchFilterState;
  areas: Area[];
  onChange: (newFilters: SearchFilterState) => void;
  onReset: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  totalResultsCount?: number;
  onOpenAI?: () => void;
}

export const HostelSearchFilters: React.FC<HostelSearchFiltersProps> = ({
  filters,
  areas,
  onChange,
  onReset,
  isMobileOpen = false,
  onCloseMobile,
  totalResultsCount,
  onOpenAI
}) => {
  const facilityOptions = [
    { key: 'electricity', label: 'Constant Light (Dedicated Line)', icon: <Zap className="w-3.5 h-3.5 text-amber-500" /> },
    { key: 'water', label: 'Running Water / Borehole', icon: <Droplets className="w-3.5 h-3.5 text-sky-500" /> },
    { key: 'wifi', label: 'High-Speed Wi-Fi', icon: <Wifi className="w-3.5 h-3.5 text-blue-500" /> },
    { key: 'security', label: 'Gated Perimeter Security', icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> },
    { key: 'inverter', label: 'Solar / Inverter Backup', icon: <Sun className="w-3.5 h-3.5 text-yellow-500" /> },
    { key: 'generator', label: 'Standby Generator', icon: <Cpu className="w-3.5 h-3.5 text-indigo-500" /> },
    { key: 'kitchen', label: 'Dedicated Kitchen Space', icon: <Utensils className="w-3.5 h-3.5 text-orange-500" /> },
    { key: 'parking', label: 'Compound Parking', icon: <Car className="w-3.5 h-3.5 text-slate-600" /> },
    { key: 'laundry', label: 'Laundry Space', icon: <Shirt className="w-3.5 h-3.5 text-cyan-600" /> },
    { key: 'furniture', label: 'Furnished (Bed/Desk)', icon: <BedDouble className="w-3.5 h-3.5 text-rose-500" /> }
  ];

  const handleFacilityToggle = (facilityKey: string) => {
    const exists = filters.facilities.includes(facilityKey);
    const updated = exists 
      ? filters.facilities.filter(k => k !== facilityKey)
      : [...filters.facilities, facilityKey];
    onChange({ ...filters, facilities: updated, page: 1 });
  };

  const handleBudgetPreset = (min: number | '', max: number | '') => {
    onChange({ ...filters, minPrice: min, maxPrice: max, page: 1 });
  };

  const content = (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      {/* Header with Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Filter Accommodations</h3>
        </div>
        <button
          onClick={onReset}
          className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset All
        </button>
      </div>

      {/* Ask AI Trigger Banner */}
      {onOpenAI && (
        <div className="p-3.5 bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-2xl shadow-sm space-y-2 border border-emerald-500/30">
          <div className="flex items-center gap-1.5 text-xs font-black text-emerald-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
            <span>Need Help Deciding?</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            Describe what you need in plain words and let AI match verified LAUTECH lodges.
          </p>
          <button
            type="button"
            onClick={onOpenAI}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow"
          >
            <span>Ask Hostel Ease AI</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Quick Budget Presets */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
          Budget Presets
        </label>
        <div className="grid grid-cols-2 gap-1.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleBudgetPreset('', 100000)}
            className={`p-2 rounded-xl border text-center transition-all ${
              filters.maxPrice === 100000 && !filters.minPrice
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Under ₦100k
          </button>
          <button
            type="button"
            onClick={() => handleBudgetPreset(100000, 180000)}
            className={`p-2 rounded-xl border text-center transition-all ${
              filters.minPrice === 100000 && filters.maxPrice === 180000
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            ₦100k – ₦180k
          </button>
          <button
            type="button"
            onClick={() => handleBudgetPreset(180000, 250000)}
            className={`p-2 rounded-xl border text-center transition-all ${
              filters.minPrice === 180000 && filters.maxPrice === 250000
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            ₦180k – ₦250k
          </button>
          <button
            type="button"
            onClick={() => handleBudgetPreset(250000, '')}
            className={`p-2 rounded-xl border text-center transition-all ${
              filters.minPrice === 250000 && !filters.maxPrice
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            ₦250k+ (Luxury)
          </button>
        </div>

        {/* Custom Price Inputs */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase">Min (₦)</span>
            <input
              type="number"
              value={filters.minPrice}
              onChange={(e) => onChange({ ...filters, minPrice: e.target.value ? Number(e.target.value) : '', page: 1 })}
              placeholder="e.g. 80,000"
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-medium text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase">Max (₦)</span>
            <input
              type="number"
              value={filters.maxPrice}
              onChange={(e) => onChange({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : '', page: 1 })}
              placeholder="e.g. 220,000"
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-medium text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* 2. LAUTECH Proximity / Distance Radius */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
          Distance from LAUTECH Campus
        </label>
        <div className="grid grid-cols-4 gap-1">
          {([
            { value: '' as const, label: 'Any' },
            { value: 0.5, label: '≤ 0.5km' },
            { value: 1.0, label: '≤ 1.0km' },
            { value: 2.0, label: '≤ 2.0km' }
          ] as { value: number | ''; label: string }[]).map(d => (
            <button
              key={d.label}
              type="button"
              onClick={() => onChange({ ...filters, maxDistance: d.value, page: 1 })}
              className={`py-1.5 px-1 rounded-xl text-xs font-semibold text-center border transition-all ${
                filters.maxDistance === d.value
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. LAUTECH Accommodation Area */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
          Accommodation Area
        </label>
        <select
          value={filters.areaId}
          onChange={(e) => onChange({ ...filters, areaId: e.target.value, page: 1 })}
          className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        >
          <option value="all">All Areas around LAUTECH</option>
          {areas.map(a => (
            <option key={a.id} value={a.id}>
              📍 {a.name} ({a.approxDistanceMinKm}-{a.approxDistanceMaxKm} km)
            </option>
          ))}
        </select>
      </div>

      {/* 4. Room Type & Layout */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
          Room Layout
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { value: 'all', label: 'All Room Types' },
            { value: 'SELF_CONTAIN', label: 'Self-Contain' },
            { value: 'SINGLE_ROOM', label: 'Single Room' },
            { value: 'FLAT', label: 'Student Flat' },
            { value: 'SHARED_BEDSPACE', label: 'Shared Bedspace' }
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...filters, roomType: opt.value, page: 1 })}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold text-center border transition-all ${
                filters.roomType === opt.value
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Gender Preference */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
          Gender Policy
        </label>
        <div className="grid grid-cols-3 gap-1">
          {[
            { value: 'ANY', label: 'Mixed / Any' },
            { value: 'FEMALE_ONLY', label: 'Female Only' },
            { value: 'MALE_ONLY', label: 'Male Only' }
          ].map(g => (
            <button
              key={g.value}
              type="button"
              onClick={() => onChange({ ...filters, genderPreference: g.value, page: 1 })}
              className={`py-1.5 px-1 rounded-xl text-xs font-semibold text-center border transition-all ${
                filters.genderPreference === g.value
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* 6. Trust & Availability Badges */}
      <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Trust & Freshness
        </label>

        <label className="flex items-center gap-2 p-2.5 bg-emerald-50/70 dark:bg-emerald-950/50 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs cursor-pointer font-bold text-emerald-950 dark:text-emerald-300">
          <input
            type="checkbox"
            checked={filters.verifiedOnly}
            onChange={(e) => onChange({ ...filters, verifiedOnly: e.target.checked, page: 1 })}
            className="rounded text-emerald-600 focus:ring-emerald-500"
          />
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Hostel Ease Verified Only</span>
        </label>

        <div className="flex items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => onChange({ ...filters, availability: filters.availability === 'AVAILABLE' ? 'all' : 'AVAILABLE', page: 1 })}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
              filters.availability === 'AVAILABLE'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            ✓ Vacant Now
          </button>

          <button
            type="button"
            onClick={() => onChange({ ...filters, availability: filters.availability === 'LIMITED' ? 'all' : 'LIMITED', page: 1 })}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
              filters.availability === 'LIMITED'
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            ⏳ Limited
          </button>
        </div>
      </div>

      {/* 7. Facilities & Utilities Checklist */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
          Essential Utilities & Amenities
        </label>
        <div className="space-y-1.5">
          {facilityOptions.map(facility => {
            const isSelected = filters.facilities.includes(facility.key);
            return (
              <label
                key={facility.key}
                className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                  isSelected 
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-300 font-bold' 
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  {facility.icon}
                  <span>{facility.label}</span>
                </div>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleFacilityToggle(facility.key)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar Filter Panel */}
      <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm sticky top-24 max-h-[85vh] overflow-y-auto">
        {content}
      </div>

      {/* Mobile Bottom Sheet Modal */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl p-5 max-h-[88vh] overflow-y-auto shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">Filters & Preferences</h3>
              </div>
              <button
                onClick={onCloseMobile}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {content}

            {/* Mobile Sticky Action Bar */}
            <div className="sticky bottom-0 pt-3 pb-1 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <button
                onClick={onReset}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-2xl"
              >
                Reset
              </button>
              <button
                onClick={onCloseMobile}
                className="flex-2 py-3 bg-emerald-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-600/30"
              >
                Show Results {totalResultsCount !== undefined ? `(${totalResultsCount})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Active Filter Chips Bar (Displays active filters with 1-click removal)
interface ActiveFilterChipsProps {
  filters: SearchFilterState;
  areas: Area[];
  onRemoveFilter: (key: keyof SearchFilterState, value?: any) => void;
  onClearAll: () => void;
  totalCount: number;
}

export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  filters,
  areas,
  onRemoveFilter,
  onClearAll,
  totalCount
}) => {
  const chips: { label: string; onRemove: () => void }[] = [];

  // Area chip
  if (filters.areaId && filters.areaId !== 'all') {
    const areaObj = areas.find(a => a.id === filters.areaId);
    chips.push({
      label: `📍 ${areaObj?.name || 'Area'}`,
      onRemove: () => onRemoveFilter('areaId', 'all')
    });
  }

  // Price chip
  if (filters.minPrice || filters.maxPrice) {
    let priceLabel = '';
    if (filters.minPrice && filters.maxPrice) priceLabel = `${formatNaira(Number(filters.minPrice))} - ${formatNaira(Number(filters.maxPrice))}`;
    else if (filters.maxPrice) priceLabel = `≤ ${formatNaira(Number(filters.maxPrice))}`;
    else if (filters.minPrice) priceLabel = `≥ ${formatNaira(Number(filters.minPrice))}`;

    chips.push({
      label: `💰 ${priceLabel}`,
      onRemove: () => {
        onRemoveFilter('minPrice', '');
        onRemoveFilter('maxPrice', '');
      }
    });
  }

  // Distance chip
  if (filters.maxDistance) {
    chips.push({
      label: `🚶 ≤ ${filters.maxDistance}km to LAUTECH`,
      onRemove: () => onRemoveFilter('maxDistance', '')
    });
  }

  // Room Type chip
  if (filters.roomType && filters.roomType !== 'all') {
    chips.push({
      label: `🛏️ ${filters.roomType.replace(/_/g, ' ')}`,
      onRemove: () => onRemoveFilter('roomType', 'all')
    });
  }

  // Gender chip
  if (filters.genderPreference && filters.genderPreference !== 'ANY') {
    chips.push({
      label: `👥 ${filters.genderPreference.replace(/_/g, ' ')}`,
      onRemove: () => onRemoveFilter('genderPreference', 'ANY')
    });
  }

  // Verified chip
  if (filters.verifiedOnly) {
    chips.push({
      label: '🛡️ Verified Only',
      onRemove: () => onRemoveFilter('verifiedOnly', false)
    });
  }

  // Availability chip
  if (filters.availability && filters.availability !== 'all') {
    chips.push({
      label: `⚡ ${filters.availability.replace(/_/g, ' ')}`,
      onRemove: () => onRemoveFilter('availability', 'all')
    });
  }

  // Facility chips
  filters.facilities.forEach(fac => {
    chips.push({
      label: `✨ ${fac.charAt(0).toUpperCase() + fac.slice(1)}`,
      onRemove: () => onRemoveFilter('facilities', fac)
    });
  });

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap py-2">
      <span className="text-xs font-bold text-slate-400 mr-1">Active filters:</span>
      {chips.map((chip, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold shadow-xs animate-in zoom-in-95"
        >
          <span>{chip.label}</span>
          <button
            onClick={chip.onRemove}
            className="p-0.5 hover:bg-emerald-200/60 dark:hover:bg-emerald-800 rounded-full text-emerald-700 dark:text-emerald-300 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      <button
        onClick={onClearAll}
        className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 hover:underline px-2 py-1 transition-colors"
      >
        Clear All
      </button>

      <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto font-semibold">
        {totalCount} accommodations match
      </span>
    </div>
  );
};
