import React from 'react';
import { 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Eye, 
  FileText, 
  PhoneCall, 
  Check, 
  DollarSign, 
  Info,
  Building2,
  Lock,
  Sparkles
} from 'lucide-react';

interface SafetyEscrowModalProps {
  onClose: () => void;
}

export const SafetyEscrowModal: React.FC<SafetyEscrowModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 relative flex flex-col">
        
        {/* Header */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-emerald-600/30 text-emerald-300 border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                CampusNest Trust & Safety Standard
              </div>
              <h3 className="text-xl font-extrabold text-white">
                Stay Safe: Student Accommodation Guide
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Honest Transparency Notice */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
              <Info className="w-4 h-4 text-brand-600" />
              <span>Our Transparency Commitment</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              CampusNest helps students find and evaluate accommodation online before traveling. While we thoroughly verify property details, photos, and host credentials, <strong>no online platform can guarantee that off-campus housing is 100% risk-free.</strong> We provide the evidence so you can make informed decisions.
            </p>
          </div>

          {/* Section 1: Before Paying for Accommodation */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>7 Essential Rules Before Paying for Accommodation</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1">
                <strong className="text-slate-900 block font-bold">1. Confirm Property Details</strong>
                <p className="text-slate-500">Cross-check room dimensions, toilet setup, and power backup using the video tour.</p>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1">
                <strong className="text-slate-900 block font-bold">2. Review All Itemized Fees</strong>
                <p className="text-slate-500">Ensure the total breakdown includes caution, agency, and agreement before committing.</p>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1">
                <strong className="text-slate-900 block font-bold">3. Check Verification Status</strong>
                <p className="text-slate-500">Look for the "Verified by CampusNest" badge and check the last verified date.</p>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1">
                <strong className="text-slate-900 block font-bold">4. Never Rush into Offline Payments</strong>
                <p className="text-slate-500">Do not transfer advance reservation fees to unknown intermediaries claiming urgency.</p>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1">
                <strong className="text-slate-900 block font-bold">5. Ask Clear Questions</strong>
                <p className="text-slate-500">Inquire about water pumping schedules, electricity meter sharing, and gate curfew rules.</p>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1">
                <strong className="text-slate-900 block font-bold">6. Keep Payment Records</strong>
                <p className="text-slate-500">Always request signed receipts, bank transfer receipts, and tenancy agreements.</p>
              </div>
            </div>
          </div>

          {/* Section 2: Anti-Scam Education - Warning Signs */}
          <div className="space-y-3 pt-2">
            <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Common Warning Signs & Red Flags</span>
            </h4>

            <div className="space-y-2.5">
              {[
                { title: 'High Pressure to Pay Immediately', desc: 'Host claims "10 other students are with cash right now" to force you to pay before seeing the room.' },
                { title: 'Rent Far Below Area Average', desc: 'A luxury self-contain in Under-G listed for ₦100,000 (normal range is ₦250k - ₦350k) is almost certainly fraudulent.' },
                { title: 'Refusal to Show Video or Allow Physical Inspection', desc: 'Host gives excuses why you or a friend cannot inspect the compound in person.' },
                { title: 'Demanding "Viewing Fees" or "Registration Forms"', desc: 'Unregistered agents asking for ₦3,000 - ₦5,000 just to reveal a hostel address.' },
                { title: 'Inconsistent Property Information', desc: 'Photos showing amenities (e.g. tiles, POP) that contradict the actual building.' },
              ].map((flag, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-amber-950 font-bold">{flag.title}: </strong>
                    <span className="text-amber-900/80">{flag.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: What CampusNest Verifies */}
          <div className="space-y-3 pt-2">
            <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-600" />
              <span>What CampusNest Actually Checks</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-0.5">📸 Real Media</span>
                <p className="text-slate-500">Unfiltered photos and continuous video walkthroughs.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-0.5">📍 Exact Address</span>
                <p className="text-slate-500">Accurate distance and walking time to university gates.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-0.5">💰 Zero Hidden Fees</span>
                <p className="text-slate-500">Full itemized breakdown of rent, caution, and agency.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            I Understand
          </button>
        </div>

      </div>
    </div>
  );
};
