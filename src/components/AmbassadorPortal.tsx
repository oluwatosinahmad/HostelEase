import React, { useState } from 'react';
import { 
  Award, 
  Sparkles, 
  Users, 
  Copy, 
  Check, 
  MessageCircle, 
  ArrowRight, 
  TrendingUp, 
  ShieldCheck, 
  GraduationCap, 
  CheckCircle2, 
  Calendar,
  Share2,
  FileText
} from 'lucide-react';
import { CampusAmbassador, UserProfile } from '../types';

interface AmbassadorPortalProps {
  ambassadors: CampusAmbassador[];
  currentUser: UserProfile | null;
  onApplyAmbassador: (data: {
    name: string;
    email: string;
    phone: string;
    matricNumber: string;
    department: string;
    level: string;
  }) => void;
  onNavigateHome: () => void;
}

export const AmbassadorPortal: React.FC<AmbassadorPortalProps> = ({
  ambassadors,
  currentUser,
  onApplyAmbassador,
  onNavigateHome,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedKit, setCopiedKit] = useState<number | null>(null);

  // Application form state
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [matricNumber, setMatricNumber] = useState(currentUser?.matricNumber || '');
  const [department, setDepartment] = useState(currentUser?.department || '');
  const [level, setLevel] = useState(currentUser?.level || '300 Level');
  const [isApplying, setIsApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  // Find if current user is an active ambassador
  const activeAmbassador = ambassadors.find(
    (a) => a.email === currentUser?.email || a.matricNumber === currentUser?.matricNumber
  ) || ambassadors[0]; // fallback to demo ambassador

  const referralLink = `${window.location.origin}/?ambassador=${activeAmbassador?.referralCode || 'CN-AHMAD123'}`;

  const promoKits = [
    {
      title: 'WhatsApp Status Broadcast (Short)',
      text: '🏠 Searching for hostels in Under-G, Adenike, or Stadium Road? Skip fake agents! Check out verified hostels with 48h escrow protection on CampusNest: ' + referralLink,
    },
    {
      title: 'Department / Faculty Group Chat Broadcast',
      text: 'Good day course mates! 🎓 CampusNest is making LAUTECH accommodation search stress-free. Real pictures, uncut video tours, tested borehole water, and direct host booking without agent cuts: ' + referralLink,
    },
    {
      title: 'Freshmen 100L Orientation Post',
      text: 'Welcome to LAUTECH, 100L Freshmen! ✨ Avoid falling victim to roadside accommodation scams around School Gate. Discover safe student lodges on CampusNest: ' + referralLink,
    },
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyKit = (index: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKit(index);
    setTimeout(() => setCopiedKit(null), 2500);
  };

  const handleApplicationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsApplying(true);
    setTimeout(() => {
      onApplyAmbassador({
        name,
        email,
        phone,
        matricNumber,
        department,
        level,
      });
      setIsApplying(false);
      setHasApplied(true);
    }, 800);
  };

  return (
    <div className="py-10 bg-slate-950 text-white min-h-[90vh] font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <Award className="w-3.5 h-3.5" />
              <span>CampusNest Student Ambassador Program • LAUTECH Chapter</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white">
              Lead Student Growth on Campus
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Help LAUTECH students avoid accommodation scams and house-hunting stress while building leadership experience, community influence, and earning ambassador rewards.
            </p>
          </div>

          <button
            onClick={onNavigateHome}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-2xl border border-slate-700 transition-colors cursor-pointer shrink-0"
          >
            Return to Marketplace
          </button>
        </div>

        {/* If user is active ambassador, show Dashboard; else show Application Form + Benefits */}
        {activeAmbassador && activeAmbassador.status === 'ACTIVE' ? (
          <div className="space-y-8">
            
            {/* Live Performance Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Referral Clicks</span>
                <div className="text-2xl font-black text-white font-mono">{activeAmbassador.totalClicks}</div>
                <span className="text-[10px] text-emerald-400">Total link impressions</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Registered Students</span>
                <div className="text-2xl font-black text-white font-mono">{activeAmbassador.totalSignups}</div>
                <span className="text-[10px] text-brand-300">Signed up via your link</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Verified Recruits</span>
                <div className="text-2xl font-black text-emerald-400 font-mono">{activeAmbassador.totalVerifiedStudents}</div>
                <span className="text-[10px] text-slate-400">Student ID approved</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Ambassador Points</span>
                <div className="text-2xl font-black text-amber-400 font-mono">{activeAmbassador.earnedPoints}</div>
                <span className="text-[10px] text-amber-300 font-bold">{activeAmbassador.tier} TIER AMBASSADOR</span>
              </div>
            </div>

            {/* Unique Link & Promotion Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h3 className="text-lg font-black text-white">Your Official Ambassador Referral Link</h3>
                  <p className="text-xs text-slate-400">Every student who visits using this link is attributed to your ambassador dashboard.</p>
                </div>
                <span className="text-xs bg-brand-500/20 text-brand-300 font-mono font-bold px-3 py-1 rounded-xl border border-brand-500/30 self-start">
                  Code: {activeAmbassador.referralCode}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-slate-950 border border-slate-700/80 rounded-2xl p-2 pl-4 text-xs">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="bg-transparent text-slate-200 font-mono w-full focus:outline-none truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    copiedLink ? 'bg-emerald-600 text-white' : 'bg-brand-600 hover:bg-brand-500 text-white shadow-md'
                  }`}
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copied Link' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* Campaign Broadcast Kits */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white">Pre-Formatted Social Media & WhatsApp Broadcast Kits</h3>
                <span className="text-xs text-slate-400">Click copy and share to student groups</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {promoKits.map((kit, idx) => {
                  const isCopied = copiedKit === idx;
                  return (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-brand-400">{kit.title}</span>
                        <p className="text-slate-300 leading-relaxed text-xs bg-slate-950/60 p-3 rounded-2xl border border-slate-800 font-mono text-[11px]">
                          {kit.text}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopyKit(idx, kit.text)}
                        className={`w-full py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isCopied ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        }`}
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? 'Copied Kit!' : 'Copy Broadcast'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        ) : (
          /* Application Screen */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-2xl mx-auto space-y-6 text-xs">
            <div className="text-center space-y-2 border-b border-slate-800 pb-5">
              <h2 className="text-xl font-black text-white">Apply to Become a LAUTECH Campus Ambassador</h2>
              <p className="text-slate-400">Open to registered 200L–500L LAUTECH students.</p>
            </div>

            {hasApplied ? (
              <div className="p-8 text-center space-y-3 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="font-bold text-white text-base">Application Received!</h3>
                <p className="text-slate-300 text-xs">The CampusNest Student Community Team will review your profile and assign your unique ambassador referral code within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleApplicationSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 text-[10px] uppercase">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ahmad Tijani"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 text-[10px] uppercase">LAUTECH Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. ahmad@student.lautech.edu.ng"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 text-[10px] uppercase">WhatsApp Number</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 08123456789"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 text-[10px] uppercase">Matriculation Number</label>
                    <input
                      type="text"
                      required
                      value={matricNumber}
                      onChange={(e) => setMatricNumber(e.target.value)}
                      placeholder="e.g. LAU/21/0492"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1 text-[10px] uppercase">Department & Level</label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Computer Science (400 Level)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isApplying}
                  className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer mt-2"
                >
                  {isApplying ? 'Submitting Application...' : 'Submit Ambassador Application'}
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
