import React from 'react';
import { Building2, ShieldCheck, MapPin, Heart } from 'lucide-react';
import { AppView } from '../types/hostelEase';

interface FooterProps {
  onNavigate: (view: AppView) => void;
  onOpenAuth: (role?: 'STUDENT' | 'PROVIDER' | 'ADMIN') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenAuth }) => {
  return (
    <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-800 pt-12 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand & Tagline */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="font-black text-lg tracking-tight">
                HOSTEL<span className="text-emerald-400">EASE</span>
              </span>
            </div>
            <p className="text-emerald-400 font-semibold text-xs">
              "Find your hostel. Stress less."
            </p>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              The official verified student accommodation platform for Ladoke Akintola University of Technology (LAUTECH), Ogbomoso, Oyo State, Nigeria.
            </p>
          </div>

          {/* Col 2: LAUTECH Accommodation Areas */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              LAUTECH Campus Areas
            </h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><button onClick={() => onNavigate('search')} className="hover:text-emerald-400 transition-colors">Under G (Main Gate Axis)</button></li>
              <li><button onClick={() => onNavigate('search')} className="hover:text-emerald-400 transition-colors">Stadium Road & Bovas</button></li>
              <li><button onClick={() => onNavigate('search')} className="hover:text-emerald-400 transition-colors">Adenike Community</button></li>
              <li><button onClick={() => onNavigate('search')} className="hover:text-emerald-400 transition-colors">General & Bowen Hospital</button></li>
              <li><button onClick={() => onNavigate('search')} className="hover:text-emerald-400 transition-colors">Caretaker & Yoaco Corridor</button></li>
            </ul>
          </div>

          {/* Col 3: Student & Landlord Quick Links */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              Student Services
            </h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><button onClick={() => onNavigate('search')} className="hover:text-emerald-400 transition-colors">Search Verified Hostels</button></li>
              <li><button onClick={() => onNavigate('saved')} className="hover:text-emerald-400 transition-colors">My Shortlisted Hostels</button></li>
              <li><button onClick={() => onNavigate('student-dashboard')} className="hover:text-emerald-400 transition-colors">Schedule Inspection Tour</button></li>
              <li><button onClick={() => onOpenAuth('PROVIDER')} className="hover:text-emerald-400 transition-colors">List Your Property (Landlords)</button></li>
              <li><button onClick={() => onOpenAuth('ADMIN')} className="hover:text-emerald-400 transition-colors">Admin Moderation</button></li>
            </ul>
          </div>

          {/* Col 4: Trust & Scam Protection Guarantee */}
          <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>Anti-Scam Guarantee</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Every listing on Hostel Ease features transparent total pricing, authentic room photos, and physical inspection scheduling to keep students 100% secure.
            </p>
            <div className="text-[10px] text-slate-500">
              📍 Ogbomoso, Oyo State, Nigeria
            </div>
          </div>
        </div>

        {/* Demo Notice & Copyright */}
        <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-3 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} Hostel Ease (LAUTECH). All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">
              DEMO MODE ACTIVE
            </span>
            <span>Search First. Visit Less.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
