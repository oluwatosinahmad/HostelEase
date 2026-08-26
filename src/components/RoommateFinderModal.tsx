import React, { useState, useMemo } from 'react';
import { 
  Users, 
  X, 
  Search, 
  Filter, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  MapPin, 
  Moon, 
  Sun, 
  BookOpen, 
  Sparkle, 
  Utensils, 
  Phone, 
  MessageCircle, 
  Plus, 
  Heart,
  Send,
  Building2
} from 'lucide-react';
import { RoommateProfile, UserProfile, CampusZone } from '../types';
import { formatNaira } from '../utils/formatters';

interface RoommateFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  roommates: RoommateProfile[];
  zones: CampusZone[];
  currentUser: UserProfile | null;
  onConnectRoommate: (profile: RoommateProfile) => void;
  onSaveProfile: (profile: RoommateProfile) => void;
}

export const RoommateFinderModal: React.FC<RoommateFinderModalProps> = ({
  isOpen,
  onClose,
  roommates,
  zones,
  currentUser,
  onConnectRoommate,
  onSaveProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'create'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'MALE' | 'FEMALE'>('ALL');
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [maxBudget, setMaxBudget] = useState<number>(200000);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);

  // Create Profile Form State
  const [name, setName] = useState(currentUser?.name || '');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [department, setDepartment] = useState(currentUser?.department || 'Computer Science');
  const [level, setLevel] = useState('300 Level');
  const [budgetPerPerson, setBudgetPerPerson] = useState(120000);
  const [preferredZoneId, setPreferredZoneId] = useState('zone-under-g');
  const [sleepHabit, setSleepHabit] = useState<'EARLY_BIRD' | 'NIGHT_OWL' | 'FLEXIBLE'>('NIGHT_OWL');
  const [studyHabit, setStudyHabit] = useState<'SILENT_STUDY' | 'MUSIC_BACKGROUND' | 'GROUP_STUDY'>('SILENT_STUDY');
  const [cleanliness, setCleanliness] = useState<'VERY_CLEAN' | 'MODERATE' | 'RELAXED'>('VERY_CLEAN');
  const [cookingFrequency, setCookingFrequency] = useState<'DAILY' | 'OCCASIONAL' | 'EAT_OUT'>('DAILY');
  const [hasHostelAlready, setHasHostelAlready] = useState(false);
  const [targetHostelTitle, setTargetHostelTitle] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState(currentUser?.phone || '08034567890');
  const [whatsapp, setWhatsapp] = useState(currentUser?.whatsapp || '08034567890');
  const [formSubmitted, setFormSubmitted] = useState(false);

  const filteredRoommates = useMemo(() => {
    return roommates.filter((r) => {
      if (genderFilter !== 'ALL' && r.gender !== genderFilter) return false;
      if (zoneFilter !== 'ALL' && r.preferredZoneId !== zoneFilter) return false;
      if (r.budgetPerPerson > maxBudget) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = r.name.toLowerCase().includes(q);
        const matchDept = r.department.toLowerCase().includes(q);
        const matchZone = r.preferredZoneName.toLowerCase().includes(q);
        const matchBio = r.bio.toLowerCase().includes(q);
        if (!matchName && !matchDept && !matchZone && !matchBio) return false;
      }
      return true;
    });
  }, [roommates, genderFilter, zoneFilter, maxBudget, searchQuery]);

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const zoneObj = zones.find((z) => z.id === preferredZoneId);
    const newProfile: RoommateProfile = {
      id: `room-${Date.now()}`,
      studentId: currentUser?.id || `stu-${Date.now()}`,
      name: name.trim() || 'LAUTECH Student',
      gender,
      department: department.trim() || 'Engineering',
      level,
      avatarUrl: gender === 'MALE' 
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
        : 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&q=80',
      budgetPerPerson,
      preferredZoneId,
      preferredZoneName: zoneObj?.name || 'Under-G',
      sleepHabit,
      studyHabit,
      cleanliness,
      cookingFrequency,
      hasHostelAlready,
      targetHostelTitle: hasHostelAlready ? targetHostelTitle : undefined,
      bio: bio.trim() || 'Looking for a calm, friendly LAUTECH roommate to split accommodation costs.',
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || phone.trim(),
      isVerifiedStudent: true,
      compatibilityScore: 94,
      status: 'LOOKING',
      createdAt: new Date().toISOString(),
    };
    onSaveProfile(newProfile);
    setFormSubmitted(true);
    setTimeout(() => {
      setFormSubmitted(false);
      setActiveTab('browse');
    }, 1200);
  };

  const handleConnect = (profile: RoommateProfile) => {
    if (!connectedIds.includes(profile.id)) {
      setConnectedIds([...connectedIds, profile.id]);
    }
    onConnectRoommate(profile);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden text-white my-6 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-600/20 border border-brand-500/30 text-brand-400 flex items-center justify-center shadow-inner">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest block">NestMate • LAUTECH Match</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Active
                </span>
              </div>
              <h2 className="text-lg font-black text-white">Find a Roommate & Split Rent</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button
                onClick={() => setActiveTab('browse')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'browse' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Browse Roommates ({filteredRoommates.length})
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'create' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Post Profile</span>
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {activeTab === 'browse' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            
            {/* Filters Bar */}
            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, dept, area..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Gender Filter */}
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 cursor-pointer"
                >
                  <option value="ALL">All Genders</option>
                  <option value="MALE">Male Roommates Only</option>
                  <option value="FEMALE">Female Roommates Only</option>
                </select>

                {/* Area Filter */}
                <select
                  value={zoneFilter}
                  onChange={(e) => setZoneFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 cursor-pointer"
                >
                  <option value="ALL">All Ogbomoso Areas</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1 border-t border-slate-900">
                <span className="text-[11px]">Max Rent Share: <strong className="text-emerald-400 font-mono font-bold">{formatNaira(maxBudget)} / yr</strong></span>
                <input
                  type="range"
                  min="50000"
                  max="250000"
                  step="10000"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(parseInt(e.target.value))}
                  className="w-44 accent-brand-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Roommates Grid */}
            {filteredRoommates.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-500">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-white text-sm">No roommate profiles match your criteria</h3>
                <p className="text-xs text-slate-400">Try adjusting your budget or area filter, or be the first to post your profile!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRoommates.map((r) => {
                  const isConnected = connectedIds.includes(r.id);
                  return (
                    <div
                      key={r.id}
                      className="bg-slate-950/60 border border-slate-800/90 hover:border-brand-500/40 rounded-3xl p-4.5 space-y-3.5 transition-all shadow-md flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Top Profile Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={r.avatarUrl}
                              alt={r.name}
                              className="w-12 h-12 rounded-2xl object-cover border border-slate-700 shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-white text-sm">{r.name}</h4>
                                {r.isVerifiedStudent && (
                                  <span title="Verified LAUTECH Student">
                                    <ShieldCheck className="w-4 h-4 text-brand-400 shrink-0" />
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-400 text-xs">{r.department} • {r.level}</p>
                            </div>
                          </div>

                          <div className="bg-brand-500/10 border border-brand-500/30 px-2 py-1 rounded-xl text-center shrink-0">
                            <span className="text-[9px] text-brand-400 font-bold uppercase block">Match</span>
                            <span className="text-xs font-black text-brand-300 font-mono">{r.compatibilityScore || 90}%</span>
                          </div>
                        </div>

                        {/* Preferred Zone & Budget */}
                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase block">Target Area</span>
                            <span className="font-bold text-slate-200 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-rose-400" />
                              <span className="truncate">{r.preferredZoneName}</span>
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase block">Rent Budget Share</span>
                            <span className="font-bold text-emerald-400 font-mono text-xs">
                              {formatNaira(r.budgetPerPerson)} <span className="text-[10px] text-slate-400">/ yr</span>
                            </span>
                          </div>
                        </div>

                        {/* Status Tag: Has hostel or seeking hostel */}
                        {r.hasHostelAlready && r.targetHostelTitle && (
                          <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded-xl text-[11px] text-amber-300 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="truncate">Has secured <strong>{r.targetHostelTitle}</strong> (Needs 1 person)</span>
                          </div>
                        )}

                        {/* Lifestyle Chips */}
                        <div className="flex flex-wrap gap-1.5 text-[10px]">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                            {r.sleepHabit === 'EARLY_BIRD' ? <Sun className="w-2.5 h-2.5 text-amber-400" /> : <Moon className="w-2.5 h-2.5 text-indigo-400" />}
                            <span>{r.sleepHabit.replace('_', ' ')}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                            <BookOpen className="w-2.5 h-2.5 text-blue-400" />
                            <span>{r.studyHabit.replace('_', ' ')}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                            <Sparkle className="w-2.5 h-2.5 text-teal-400" />
                            <span>{r.cleanliness.replace('_', ' ')}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                            <Utensils className="w-2.5 h-2.5 text-rose-400" />
                            <span>Cooks: {r.cookingFrequency}</span>
                          </span>
                        </div>

                        {/* Bio */}
                        <p className="text-xs text-slate-300 line-clamp-2 italic">
                          "{r.bio}"
                        </p>
                      </div>

                      {/* Connect Buttons */}
                      <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 gap-2">
                        <button
                          onClick={() => {
                            const waUrl = `https://wa.me/234${r.whatsapp.replace(/^0/, '')}?text=${encodeURIComponent(`Hi ${r.name}, I saw your roommate profile on CampusNest for ${r.preferredZoneName} accommodation!`)}`;
                            window.open(waUrl, '_blank');
                          }}
                          className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          onClick={() => handleConnect(r)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isConnected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg'
                          }`}
                        >
                          {isConnected ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Request Sent</span>
                            </>
                          ) : (
                            <>
                              <Heart className="w-3.5 h-3.5" />
                              <span>Connect Roommate</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        ) : (
          /* TAB 2: CREATE / POST PROFILE */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {formSubmitted ? (
              <div className="p-8 text-center space-y-3 animate-fadeIn">
                <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-white text-base">Profile Published Successfully!</h3>
                <p className="text-xs text-slate-400">Other LAUTECH students can now discover your profile and message you to split accommodation.</p>
              </div>
            ) : (
              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                <div className="bg-brand-950/40 border border-brand-500/30 p-3 rounded-2xl flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-brand-400 shrink-0" />
                  <p className="text-xs text-brand-200">
                    Publishing a roommate profile helps you find compatible classmates in LAUTECH to share hostel rent and reduce living expenses by 50%.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Oluwaseun Adeleke"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">Department</label>
                    <input
                      type="text"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Computer Science & Engineering"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">Level</label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    >
                      <option value="100 Level">100 Level (Fresher)</option>
                      <option value="200 Level">200 Level</option>
                      <option value="300 Level">300 Level</option>
                      <option value="400 Level">400 Level</option>
                      <option value="500 Level">500 Level (Finalist)</option>
                      <option value="Postgraduate">Postgraduate</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">Your Rent Budget Share (₦/yr)</label>
                    <input
                      type="number"
                      required
                      value={budgetPerPerson}
                      onChange={(e) => setBudgetPerPerson(parseInt(e.target.value) || 50000)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">Preferred Ogbomoso Area</label>
                    <select
                      value={preferredZoneId}
                      onChange={(e) => setPreferredZoneId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    >
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>{z.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Lifestyle Questions */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase text-[9px]">Sleep Routine</label>
                    <select
                      value={sleepHabit}
                      onChange={(e) => setSleepHabit(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-[11px] text-white"
                    >
                      <option value="EARLY_BIRD">Early Bird</option>
                      <option value="NIGHT_OWL">Night Owl</option>
                      <option value="FLEXIBLE">Flexible</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase text-[9px]">Study Style</label>
                    <select
                      value={studyHabit}
                      onChange={(e) => setStudyHabit(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-[11px] text-white"
                    >
                      <option value="SILENT_STUDY">Silent Study</option>
                      <option value="MUSIC_BACKGROUND">Background Music</option>
                      <option value="GROUP_STUDY">Group Discussion</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase text-[9px]">Cleanliness</label>
                    <select
                      value={cleanliness}
                      onChange={(e) => setCleanliness(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-[11px] text-white"
                    >
                      <option value="VERY_CLEAN">Very Clean</option>
                      <option value="MODERATE">Moderate</option>
                      <option value="RELAXED">Relaxed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase text-[9px]">Cooking Habit</label>
                    <select
                      value={cookingFrequency}
                      onChange={(e) => setCookingFrequency(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-[11px] text-white"
                    >
                      <option value="DAILY">Daily Cooking</option>
                      <option value="OCCASIONAL">Occasional</option>
                      <option value="EAT_OUT">Eat Out</option>
                    </select>
                  </div>
                </div>

                {/* Do you already have a hostel? */}
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasHostelAlready}
                      onChange={(e) => setHasHostelAlready(e.target.checked)}
                      className="w-4 h-4 rounded text-brand-600"
                    />
                    <span className="font-bold text-white">I have already paid for a lodge and need a roommate to move in</span>
                  </label>

                  {hasHostelAlready && (
                    <input
                      type="text"
                      value={targetHostelTitle}
                      onChange={(e) => setTargetHostelTitle(e.target.value)}
                      placeholder="e.g. Crown Heights Self-Contain (Under-G)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                    />
                  )}
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">Short Bio / Expectations</label>
                  <textarea
                    rows={3}
                    required
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell prospective roommates about your hobbies, routine, and ideal living arrangement..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab('browse')}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-lg"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Publish Roommate Profile</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
