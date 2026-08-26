import React, { useState } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  Lock, 
  Scale, 
  Users, 
  AlertCircle, 
  X, 
  CheckCircle2, 
  ChevronRight,
  Download,
  Building2,
  PhoneCall
} from 'lucide-react';

interface TermsPrivacyModalProps {
  isOpen: boolean;
  initialTab?: 'terms' | 'privacy' | 'escrow' | 'landlord' | 'community';
  onClose: () => void;
}

export const TermsPrivacyModal: React.FC<TermsPrivacyModalProps> = ({
  isOpen,
  initialTab = 'terms',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'escrow' | 'landlord' | 'community'>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden text-white my-8 flex flex-col max-h-[85vh]">
        
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 p-6 border-b border-slate-800 flex items-center justify-between relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-600/20 border border-brand-500/40 text-brand-400 flex items-center justify-center shadow-lg">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">Platform Governance & Compliance</span>
                <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  LEGAL DRAFT v9.0
                </span>
              </div>
              <h2 className="text-lg font-black text-white">CampusNest Platform Policies</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Legal Disclaimer Notice Banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center gap-2.5 text-amber-300 text-xs shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>Production Readiness Notice:</strong> These policy frameworks are prepared for LAUTECH launch operations and subject to final formal review by licensed Nigerian legal counsel.
          </span>
        </div>

        {/* Policy Category Tabs */}
        <div className="bg-slate-950/60 border-b border-slate-800 px-6 py-2.5 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'terms' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Terms of Service
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'privacy' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Privacy Policy (NDPA)
          </button>
          <button
            onClick={() => setActiveTab('escrow')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'escrow' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Escrow & Refund Rules
          </button>
          <button
            onClick={() => setActiveTab('landlord')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'landlord' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Host Tenancy Terms
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'community' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Review & Community Guidelines
          </button>
        </div>

        {/* Policy Content Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300 leading-relaxed font-sans">
          
          {/* TAB 1: TERMS OF SERVICE */}
          {activeTab === 'terms' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-black text-white">1. Master Terms of Service</h3>
                <p className="text-slate-400 text-[11px]">Last Updated: August 2026 • Effective for LAUTECH & Nigerian Universities</p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">1.1 Platform Nature & Marketplace Role</h4>
                <p>
                  CampusNest Technologies Ltd operates a digital accommodation discovery and escrow-facilitated reservation marketplace connecting verified tertiary institution students with property owners, caretakers, and authorized real estate agents in Nigeria. CampusNest is not a property owner or direct lessor, but provides verification, search intelligence, reservation workflows, and escrow payment intermediation.
                </p>

                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">1.2 Student User Obligations</h4>
                <p>
                  By registering with CampusNest, student users warrant that they provide accurate academic institution credentials (matriculation number, full name, phone number). Students agree not to engage in impersonation, malicious reporting, false reviews, or fraudulent payment attempts.
                </p>

                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">1.3 Landlord & Agent Obligations</h4>
                <p>
                  Property hosts warrant that all listings published under their account represent genuine physical structures, accurate pricing schedules without concealed add-on fees, and valid authorization to lease. Submitting fraudulent listings or demanding unauthorized offline side-payments constitutes immediate platform suspension and referral to law enforcement authorities.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: PRIVACY POLICY (NDPA COMPLIANCE) */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-black text-white">2. Privacy Policy & Data Protection</h3>
                <p className="text-slate-400 text-[11px]">Compliant with the Nigeria Data Protection Act (NDPA 2023)</p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">2.1 Information We Collect</h4>
                <p>
                  We collect strictly necessary data required to facilitate safe accommodation matching: Student Name, Academic Email, Phone Number, University/Campus, Department, Saved Nests, and Booking Records. For Landlords, we verify National Identity (NIN/Driver&apos;s License), Property Ownership Documents, and NUBAN bank accounts for settlement payouts.
                </p>

                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">2.2 Protection of Financial Information</h4>
                <p>
                  CampusNest does not store raw debit/credit card numbers or banking PINs on its servers. All payment processing is conducted securely via licensed PCI-DSS compliant Nigerian payment gateways (Paystack / Flutterwave). Host bank account numbers are cryptographically masked in all administrative and public views (<code className="text-brand-400">•••• •••• 5521</code>).
                </p>

                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">2.3 Student Data Rights</h4>
                <p>
                  Under NDPA guidelines, users have the right to request access to their stored personal data, request corrections, or request account erasure by contacting our Data Protection Officer at <span className="text-brand-400 font-mono">dpo@campusnest.ng</span>.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: ESCROW, BOOKING & REFUND RULES */}
          {activeTab === 'escrow' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-black text-white">3. CampusNest Escrow Guarantee & Refund Policy</h3>
                <p className="text-slate-400 text-[11px]">48-Hour Protection Window & Safe Tenancy Settlement</p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">3.1 Escrow Holding Period</h4>
                <p>
                  When a student pays online for an accepted booking, the total funds are held in secure escrow (<code className="text-emerald-400">ESCROW_HOLD</code>). Funds are not immediately disbursed to the host until the student conducts their physical move-in check or until 48 hours have elapsed post-scheduled move-in date without an open dispute.
                </p>

                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">3.2 Refund Eligibility Criteria</h4>
                <p>
                  A student is entitled to a 100% full refund under the CampusNest Protection Guarantee if:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                  <li>The physical property condition diverges significantly from verified media (e.g. missing water, collapsed ceiling, uninhabitable state).</li>
                  <li>The landlord fails to provide access keys on the agreed move-in date.</li>
                  <li>The listing is discovered to be double-booked or unavailable upon arrival.</li>
                </ul>

                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">3.3 Cancellation Timeline</h4>
                <p>
                  Student reservations waiting for landlord acceptance can be cancelled instantly without penalty. Once accepted, students have a 48-hour exclusive reservation payment window before the property is automatically released back to public discovery.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: LANDLORD TENANCY TERMS */}
          {activeTab === 'landlord' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-black text-white">4. Host Tenancy & Accreditation Agreement</h3>
                <p className="text-slate-400 text-[11px]">Standards for Student Housing Providers in Ogbomoso & Nigeria</p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">4.1 Transparent Price Guarantee</h4>
                <p>
                  Hosts agree that the total price listed on CampusNest constitutes the complete annual cost. Requesting arbitrary additional inspection fees, gate fees, or unlisted charges upon student arrival is strictly prohibited and results in listing delisting and forfeiture of verified host status.
                </p>

                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">4.2 Physical Verification Consent</h4>
                <p>
                  To receive the <em>Verified Student Shield</em>, hosts grant CampusNest Field Verification Officers permission to inspect the premises, test running water, inspect electricity prepaid meters, and record an uncut video walkthrough.
                </p>

                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">4.3 Habitability & Safety Standard</h4>
                <p>
                  Hosts warrant that the property complies with basic safety standards: functional perimeter fencing, working door/window locks, verified water source, and proper drainage.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: COMMUNITY & REVIEW STANDARDS */}
          {activeTab === 'community' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-black text-white">5. Community Standards & Review Guidelines</h3>
                <p className="text-slate-400 text-[11px]">Ensuring Honest, Uncensored & Authentic Feedback</p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">5.1 Authentic Tenancy Reviews</h4>
                <p>
                  Reviews can only be submitted by students who have interacted with the property (completed viewing, verified inquiry, or confirmed booking). Negative reviews regarding genuine water shortages, noise, or electrical issues cannot be deleted by landlords simply because they are critical.
                </p>

                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">5.2 Prohibited Content</h4>
                <p>
                  Reviews containing hate speech, personal phone numbers/doxxing, commercial spam, or provably false extortion attempts will be hidden following administrative review with logged audit records.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>CampusNest Legal & Compliance Unit • Ogbomoso, Oyo State</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs transition-all shadow-lg cursor-pointer"
          >
            I Understand & Agree
          </button>
        </div>

      </div>
    </div>
  );
};
