import React from 'react';
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  TrendingUp, 
  CreditCard, 
  Clock, 
  PhoneCall, 
  Lock,
  ChevronRight
} from 'lucide-react';

interface LandlordMarketingSectionProps {
  onOpenAddProperty: () => void;
  onOpenAuthModal: () => void;
  onNavigateHome: () => void;
}

export const LandlordMarketingSection: React.FC<LandlordMarketingSectionProps> = ({
  onOpenAddProperty,
  onOpenAuthModal,
  onNavigateHome,
}) => {
  const steps = [
    { num: '01', title: 'Create Host Account', desc: 'Register as a verified property owner, authorized agent, or lodge caretaker in under 2 minutes.' },
    { num: '02', title: 'Add Property & Pricing', desc: 'Upload photos, continuous video walkthrough, set transparent rent in Naira (₦) with annual/semester frequency.' },
    { num: '03', title: 'Physical Verification', desc: 'A CampusNest field officer inspects borehole water, prepaid meter, and compound security.' },
    { num: '04', title: 'Get Verified Shield', desc: 'Your listing receives the trusted verification badge, elevating ranking in student search results.' },
    { num: '05', title: 'Receive Direct Bookings', desc: 'Accept verified student reservations and schedule virtual WhatsApp video walkthroughs.' },
    { num: '06', title: 'Guaranteed Payouts', desc: 'Rent is collected via Paystack/Flutterwave escrow and settled directly into your NUBAN bank account.' },
  ];

  const benefits = [
    {
      title: 'Direct Reach to 35,000+ Students',
      desc: 'Connect directly with verified LAUTECH undergraduate and postgraduate students searching in Under-G, Adenike, and Stadium Road.',
      icon: Users,
      color: 'text-brand-400 bg-brand-500/10',
    },
    {
      title: 'Zero Traditional Commission Loss',
      desc: 'Avoid shady roadside middlemen charging unapproved cuts. Keep 100% of your advertised rental price.',
      icon: TrendingUp,
      color: 'text-emerald-400 bg-emerald-500/10',
    },
    {
      title: '48-Hour Escrow Protection',
      desc: 'Eliminate payment disputes and bouncing cheques. Funds are pre-funded securely online before move-in date.',
      icon: CreditCard,
      color: 'text-blue-400 bg-blue-500/10',
    },
    {
      title: 'Pre-Screened Student Tenants',
      desc: 'All booking requests include verified student matriculation numbers, academic level, and faculty details.',
      icon: ShieldCheck,
      color: 'text-amber-400 bg-amber-500/10',
    },
  ];

  return (
    <div className="py-12 bg-slate-950 text-white min-h-[90vh] font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Top Hero Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-3xl space-y-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-300 text-xs font-bold">
              <Building2 className="w-3.5 h-3.5" />
              <span>Ogbomoso Landlords & Property Owners Portal</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              List Your Property Directly to <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-brand-400">
                35,000+ LAUTECH Students
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
              Eliminate vacancies in Under-G, Adenike, and Stadium Road. Receive verified student bookings, manage inspections online, and enjoy guaranteed escrow payouts directly to your bank account.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-4">
              <button
                onClick={onOpenAddProperty}
                className="px-6 py-3.5 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-xl shadow-brand-950 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>List Your Property Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenAuthModal}
                className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm rounded-2xl border border-slate-700 transition-all cursor-pointer"
              >
                <span>Host Sign In</span>
              </button>
            </div>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-white">Why Ogbomoso Property Owners Choose CampusNest</h2>
            <p className="text-xs text-slate-400">The premier technology platform bridging student housing supply and demand.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {benefits.map((b, idx) => {
              const Icon = b.icon;
              return (
                <div key={idx} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 hover:border-slate-700 transition-all">
                  <div className={`w-12 h-12 rounded-2xl ${b.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-white text-sm">{b.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6-Step Workflow */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-400">Simple & Transparent Process</span>
            <h2 className="text-xl sm:text-2xl font-black text-white">How Onboarding Works for Hostels</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            {steps.map((st, idx) => (
              <div key={idx} className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 space-y-2 relative">
                <span className="text-2xl font-black text-slate-700 font-mono block">{st.num}</span>
                <h4 className="font-bold text-white text-sm">{st.title}</h4>
                <p className="text-slate-400 leading-relaxed text-xs">{st.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>CampusNest physical verification is completely free for all LAUTECH zone property owners.</span>
            </div>
            <button
              onClick={onOpenAddProperty}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all cursor-pointer shadow-md"
            >
              Get Started Now
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
