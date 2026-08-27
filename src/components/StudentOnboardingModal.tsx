import React, { useState } from 'react';
import { 
  Sparkles, 
  DollarSign, 
  MapPin, 
  Building2, 
  Zap, 
  Check, 
  ArrowRight, 
  X,
  Calendar,
  ShieldCheck,
  Droplets,
  Wifi,
  Shield
} from 'lucide-react';
import { Area, PropertyType, StudentPreferences } from '../types/hostelEase';
import { formatNaira } from '../utils/formatters';

interface StudentOnboardingModalProps {
  areas: Area[];
  isOpen: boolean;
  onClose: () => void;
  onSavePreferences: (prefs: Partial<StudentPreferences>) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const COMMON_FACILITIES = [
  { key: 'water', label: 'Constant Water Supply', icon: Droplets },
  { key: 'electricity', label: 'Reliable Light / Generator / Solar', icon: Zap },
  { key: 'security', label: 'Gated Security & Fencing', icon: Shield },
  { key: 'wifi', label: 'High-Speed Wi-Fi', icon: Wifi },
  { key: 'wardrobe', label: 'Wardrobe & Storage', icon: Building2 },
  { key: 'kitchen', label: 'Tiled Private Kitchen', icon: Sparkles }
];

export const StudentOnboardingModal: React.FC<StudentOnboardingModalProps> = ({
  areas,
  isOpen,
  onClose,
  onSavePreferences,
  onShowToast
}) => {
  const [step, setStep] = useState<number>(1);
  const [saving, setSaving] = useState<boolean>(false);

  // Preference fields
  const [minBudget, setMinBudget] = useState<number>(100000);
  const [maxBudget, setMaxBudget] = useState<number>(200000);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<PropertyType[]>(['SELF_CONTAIN']);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(['water', 'electricity', 'security']);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(2.0);
  const [genderPreference, setGenderPreference] = useState<'ANY' | 'MALE_ONLY' | 'FEMALE_ONLY'>('ANY');
  const [preferredMoveInDate, setPreferredMoveInDate] = useState<string>('2026-09-01');
  const [isMoveInFlexible, setIsMoveInFlexible] = useState<boolean>(true);

  if (!isOpen) return null;

  const toggleArea = (areaId: string) => {
    setSelectedAreas(prev => 
      prev.includes(areaId) ? prev.filter(id => id !== areaId) : [...prev, areaId]
    );
  };

  const toggleRoomType = (type: PropertyType) => {
    setSelectedRoomTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleFacility = (key: string) => {
    setSelectedFacilities(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await onSavePreferences({
        minBudget,
        maxBudget,
        preferredAreas: selectedAreas,
        preferredRoomTypes: selectedRoomTypes,
        preferredFacilities: selectedFacilities,
        maxDistanceKm,
        genderPreference,
        preferredMoveInDate,
        isMoveInFlexible,
        academicSession: '2026/2027',
        onboardingCompleted: true
      });
      onShowToast('Personalized preferences saved! Welcome to Hostel Ease.', 'success');
      onClose();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 dark:from-emerald-950 dark:to-slate-900 text-white p-6 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950 uppercase tracking-wide">
              LAUTECH Personalization
            </span>
            <span className="text-xs text-emerald-200">Step {step} of 3</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black">
            {step === 1 && "What's your accommodation budget & area?"}
            {step === 2 && 'Preferred room type & must-have facilities?'}
            {step === 3 && 'When are you planning to move in?'}
          </h2>
          <p className="text-xs text-emerald-100 mt-1">
            Hostel Ease tailors lodge recommendations, distance calculations, and alerts to your exact needs.
          </p>

          {/* Progress bar */}
          <div className="w-full bg-white/20 h-1.5 rounded-full mt-4 overflow-hidden">
            <div 
              className="bg-emerald-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-grow bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
          {/* STEP 1: Budget & Areas */}
          {step === 1 && (
            <div className="space-y-5 animate-in slide-in-from-right-4">
              {/* Budget Range */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                  Annual Budget Range (₦)
                </label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Min Budget</span>
                    <div className="text-base font-black text-slate-900 dark:text-white">{formatNaira(minBudget)}</div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase">Max Budget</span>
                    <div className="text-base font-black text-emerald-800 dark:text-emerald-300">{formatNaira(maxBudget)}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>₦80,000</span>
                    <span>Max: {formatNaira(maxBudget)}</span>
                    <span>₦500,000</span>
                  </div>
                  <input
                    type="range"
                    min={80000}
                    max={500000}
                    step={10000}
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Preferred Areas */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                  Preferred LAUTECH Areas (Select all that apply)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {areas.map(area => {
                    const isSelected = selectedAreas.includes(area.id);
                    return (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => toggleArea(area.id)}
                        className={`p-3 rounded-2xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 dark:border-emerald-600 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="truncate">
                          <p className="truncate">{area.name}</p>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            ~{area.approxDistanceMinKm} - {area.approxDistanceMaxKm}km
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Max Distance */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Max Distance from School Gate
                  </label>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">{maxDistanceKm} km</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={5.0}
                  step={0.5}
                  value={maxDistanceKm}
                  onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Room Types & Facilities */}
          {step === 2 && (
            <div className="space-y-5 animate-in slide-in-from-right-4">
              {/* Room Types */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                  Preferred Room Types
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { type: 'SELF_CONTAIN', label: 'Self-Contain (Ensuite + Kitchen)' },
                    { type: 'SINGLE_ROOM', label: 'Single Room (Shared Facilities)' },
                    { type: 'FLAT', label: '2/3-Bedroom Shared Apartment' },
                    { type: 'SHARED_BEDSPACE', label: 'Shared Room Bedspace (Budget)' }
                  ].map(item => {
                    const isSelected = selectedRoomTypes.includes(item.type as PropertyType);
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => toggleRoomType(item.type as PropertyType)}
                        className={`p-3.5 rounded-2xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 dark:border-emerald-600 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <span>{item.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Must-Have Facilities */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                  Must-Have Facilities
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {COMMON_FACILITIES.map(fac => {
                    const isSelected = selectedFacilities.includes(fac.key);
                    const Icon = fac.icon;
                    return (
                      <button
                        key={fac.key}
                        type="button"
                        onClick={() => toggleFacility(fac.key)}
                        className={`p-3 rounded-2xl border text-left text-xs font-bold transition-all flex items-center gap-2.5 ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 dark:border-emerald-600 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="truncate">{fac.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Gender Preference */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                  Hostel Gender Policy Preference
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'ANY', label: 'Mixed / Any' },
                    { key: 'FEMALE_ONLY', label: 'Female Only' },
                    { key: 'MALE_ONLY', label: 'Male Only' }
                  ].map(g => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setGenderPreference(g.key as any)}
                      className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                        genderPreference === g.key
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Move-In Timeline */}
          {step === 3 && (
            <div className="space-y-5 animate-in slide-in-from-right-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                  Intended Move-in Date
                </label>
                <input
                  type="date"
                  value={preferredMoveInDate}
                  onChange={(e) => setPreferredMoveInDate(e.target.value)}
                  className="w-full text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl p-3.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMoveInFlexible}
                    onChange={(e) => setIsMoveInFlexible(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <div>
                    <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200">My move-in date is flexible (+/- 2 weeks)</p>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                      Helps match hostels currently undergoing pre-session maintenance or painting.
                    </p>
                  </div>
                </label>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>100% Control Guarantee</span>
                </div>
                <p className="text-[11px]">
                  You can change these preferences at any time in your Student Dashboard. When browsing hostels, you can always search outside these filters with 1-click.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-3 py-2"
          >
            Skip for Now
          </button>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(prev => prev - 1)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
              >
                Back
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(prev => prev + 1)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all flex items-center gap-1.5"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save & Personalize'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
