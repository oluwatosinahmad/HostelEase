import React, { useState } from 'react';
import { 
  Gift, 
  Users, 
  Copy, 
  Check, 
  MessageCircle, 
  X, 
  Sparkles, 
  ShieldCheck, 
  Share2, 
  Award,
  ArrowRight
} from 'lucide-react';
import { UserProfile } from '../types';

interface StudentReferralModalProps {
  isOpen: boolean;
  currentUser: UserProfile | null;
  onClose: () => void;
}

export const StudentReferralModal: React.FC<StudentReferralModalProps> = ({
  isOpen,
  currentUser,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Generate deterministic referral code from user matric/name
  const referralCode = currentUser?.matricNumber
    ? `CN-${currentUser.matricNumber.replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase()}`
    : `CN-${(currentUser?.name || 'STUDENT').replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase()}26`;

  const referralLink = `${window.location.origin}/?ref=${referralCode}`;
  const whatsappShareText = `🎓 Looking for off-campus accommodation around LAUTECH? Avoid fake agents in Under-G & Adenike! Use my CampusNest invite to browse verified lodges with 48-hour escrow payment protection: ${referralLink}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(whatsappShareText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden text-white my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-lg">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Campus Growth Program</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  LAUTECH MVP
                </span>
              </div>
              <h2 className="text-lg font-black text-white">Invite Course Mates & Friends</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Benefits Card */}
        <div className="p-6 space-y-5 text-xs">
          <div className="bg-gradient-to-br from-amber-500/10 via-slate-950 to-slate-950 border border-amber-500/30 rounded-3xl p-5 space-y-3">
            <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>How Student Referrals Work</span>
            </h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              Share your invite link with LAUTECH students looking for hostels in Under-G, Adenike, Stadium Road, or Aroje. When they register and verify their student profile, both of you earn platform reward points!
            </p>

            <div className="grid grid-cols-3 gap-2 text-center pt-2">
              <div className="bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">1. Share Link</span>
                <span className="font-bold text-amber-400">Via WhatsApp</span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">2. Friend Joins</span>
                <span className="font-bold text-emerald-400">+50 Points</span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">3. Books Hostel</span>
                <span className="font-bold text-brand-300">+200 Points</span>
              </div>
            </div>
          </div>

          {/* Referral Code & Link Box */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Your Personal Referral Link
            </label>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700/80 rounded-2xl p-2 pl-3">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="bg-transparent text-slate-200 font-mono text-xs w-full focus:outline-none truncate"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Link' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* WhatsApp Primary CTA */}
          <button
            onClick={handleWhatsAppShare}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Share Invite on WhatsApp Status / Groups</span>
          </button>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Anti-fraud verified • Real LAUTECH students only</span>
        </div>

      </div>
    </div>
  );
};
