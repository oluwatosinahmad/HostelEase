import React, { useState } from 'react';
import { 
  Heart, 
  X, 
  ShieldCheck, 
  Users, 
  PhoneCall, 
  Sparkles, 
  MapPin, 
  ArrowRight, 
  Lock, 
  CheckCircle2, 
  AlertTriangle,
  Zap,
  Building2,
  ExternalLink
} from 'lucide-react';
import { Property } from '../types/hostelEase';
import { formatNaira, formatDistance } from '../utils/formatters';

interface WomensLivingModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  onSelectProperty: (property: Property) => void;
  onOpenSafeWalk: () => void;
  onOpenRoommates?: () => void;
}

export const WomensLivingModal: React.FC<WomensLivingModalProps> = ({
  isOpen,
  onClose,
  properties,
  onSelectProperty,
  onOpenSafeWalk,
  onOpenRoommates,
}) => {
  const [activeTab, setActiveTab] = useState<'lodges' | 'safewalk' | 'emergency' | 'roommates'>('lodges');

  if (!isOpen) return null;

  // Filter female-only or female-preferring verified properties
  const femaleLodges = properties.filter(
    (p) => p.genderPreference === 'FEMALE_ONLY' || (p.genderPreference as string) === 'FEMALE' || p.title.toLowerCase().includes('female') || p.title.toLowerCase().includes('girls')
  );

  const emergencyContacts = [
    {
      title: 'LAUTECH Security Unit (Main Gate)',
      phone: '08034567890',
      hours: '24/7 Rapid Response',
      desc: 'Campus security patrol and emergency station located at the Main University Gate.'
    },
    {
      title: 'LAUTECH University Health Center',
      phone: '08023456789',
      hours: '24/7 Medical Clinic',
      desc: 'Full clinical support, emergency triage, ambulance, and student trauma care.'
    },
    {
      title: 'Ogbomoso Police Area Command (Owode)',
      phone: '08037890123',
      hours: '24/7 Law Enforcement',
      desc: 'Off-campus student zone policing covering Under G, Stadium, Adenike, and Aroje.'
    },
    {
      title: 'LAUTECH Dean of Student Affairs Desk',
      phone: '08129876543',
      hours: '8:00 AM - 6:00 PM',
      desc: 'Official student welfare, lodging arbitration, and gender harassment advocacy.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-950 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-purple-700 p-5 sm:p-6 text-white flex items-center justify-between shrink-0 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-inner">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full border border-white/30">
                  LAUTECH Female Student Sanctuary
                </span>
                <span className="text-[10px] bg-rose-900/60 font-bold px-2 py-0.5 rounded-full">
                  100% Safe Living
                </span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight mt-0.5">Women's Living & Safety Portal</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors relative z-10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-4 sm:px-6 flex items-center gap-2 overflow-x-auto py-2.5">
          <button
            onClick={() => setActiveTab('lodges')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'lodges'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Female-Only Verified Lodges ({femaleLodges.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('safewalk')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'safewalk'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SafeWalk™ Night-Trek</span>
          </button>

          <button
            onClick={() => setActiveTab('roommates')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'roommates'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Verified Female Roommates</span>
          </button>

          <button
            onClick={() => setActiveTab('emergency')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'emergency'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Campus Emergency SOS</span>
          </button>
        </div>

        {/* Content View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* TAB 1: FEMALE-ONLY LODGES */}
          {activeTab === 'lodges' && (
            <div className="space-y-4">
              <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 p-4 rounded-2xl flex items-start gap-3">
                <Lock className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-950 dark:text-rose-200">Gated, Safe & Strictly Female Accommodations</h4>
                  <p className="text-[11px] text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
                    These hostels have strict female-tenant policies, full compound perimeter gating, continuous security lighting, and verified caretakers vetted by Hostel Ease.
                  </p>
                </div>
              </div>

              {femaleLodges.length === 0 ? (
                <div className="text-center py-12 space-y-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                  <Heart className="w-10 h-10 text-rose-400 mx-auto opacity-60" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No female-only lodges found in this batch</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">Check back shortly or explore our co-ed lodges with individual en-suite security locks.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {femaleLodges.map((lodge) => (
                    <div
                      key={lodge.id}
                      onClick={() => {
                        onClose();
                        onSelectProperty(lodge);
                      }}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-400 dark:hover:border-rose-500 rounded-2xl p-4 transition-all hover:shadow-lg cursor-pointer group space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                            <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                            Female Only
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Verified Lodge
                          </span>
                        </div>

                        <h3 className="font-black text-sm text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors line-clamp-1">
                          {lodge.title}
                        </h3>

                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{lodge.address}</span>
                          <span>•</span>
                          <span className="shrink-0">{formatDistance(lodge.distanceFromCampusKm)} to campus</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Rent from</span>
                          <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                            {lodge.priceSummary?.rentAmount ? formatNaira(lodge.priceSummary.rentAmount) : (lodge as any).rentAmount ? formatNaira((lodge as any).rentAmount) : 'Contact'}
                            <span className="text-[10px] text-slate-400 font-normal"> /yr</span>
                          </span>
                        </div>
                        <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 group-hover:bg-rose-600 group-hover:text-white transition-all">
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SAFEWALK COMPANION */}
          {activeTab === 'safewalk' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 p-6 rounded-3xl text-white border border-emerald-500/30 space-y-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                  <span className="font-black text-xs uppercase tracking-wider">Campus SafeWalk™ Protocol</span>
                </div>

                <div>
                  <h3 className="text-lg font-black">Never Walk Alone at Night Around LAUTECH</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    SafeWalk™ connects you with vetted female peers trekking along the same route from campus (Under-G, Stadium, Aroje, Adenike), tracks your walk in real-time, and provides a 1-tap SOS panic trigger directly to campus security.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="bg-white/5 border border-white/10 p-3 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Feature 1</span>
                    <h5 className="font-bold text-xs">Live Route Tracking</h5>
                    <p className="text-[10px] text-slate-400">Share your live ETA and step progress with trusted roommates.</p>
                  </div>

                  <div className="bg-white/5 border border-white/10 p-3 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Feature 2</span>
                    <h5 className="font-bold text-xs">Buddy Pairing</h5>
                    <p className="text-[10px] text-slate-400">Trek with verified female students departing lecture halls at night.</p>
                  </div>

                  <div className="bg-white/5 border border-white/10 p-3 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Feature 3</span>
                    <h5 className="font-bold text-xs">Instant 1-Tap SOS</h5>
                    <p className="text-[10px] text-slate-400">Instantly alerts Campus Security and sends SMS coordinates.</p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSafeWalk();
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Launch SafeWalk™ Night Companion Now</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VERIFIED ROOMMATES */}
          {activeTab === 'roommates' && (
            <div className="space-y-4">
              <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 p-4 rounded-2xl flex items-start gap-3">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-purple-950 dark:text-purple-200">Verified Female Roommate Matching</h4>
                  <p className="text-[11px] text-purple-800 dark:text-purple-300 mt-0.5 leading-relaxed">
                    Split rent and living expenses safely. Match with matriculated female LAUTECH students who match your study habits, sleeping schedule, and cleaning preferences.
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">Explore Female Roommate Feed</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                    Connect with fellow female students looking for flatmates in Under G, Stadium, and Adenike. All profiles are verified with LAUTECH matriculation numbers.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onOpenRoommates) onOpenRoommates();
                    }}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                  >
                    <span>Open Roommate Hub</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EMERGENCY CONTACTS */}
          {activeTab === 'emergency' && (
            <div className="space-y-4">
              <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 p-4 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-950 dark:text-rose-200">1-Tap Direct Emergency Dialers</h4>
                  <p className="text-[11px] text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
                    Tap any contact to immediately call for emergency response, medical assistance, or safety dispatch around Ogbomoso.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {emergencyContacts.map((contact, i) => (
                  <div 
                    key={i}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          {contact.hours}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white pt-1">{contact.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{contact.desc}</p>
                    </div>

                    <a
                      href={`tel:${contact.phone}`}
                      className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Call {contact.phone}</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Hostel Ease Women's Living & Safety Initiative
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
