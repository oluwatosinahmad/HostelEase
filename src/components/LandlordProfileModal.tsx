import React from 'react';
import { X, Building2, CheckCircle2, Phone, MessageSquare, Star, Calendar, ShieldCheck, UserCheck } from 'lucide-react';
import { Property } from '../types';

interface LandlordProfileModalProps {
  landlord: Property['landlord'] | null;
  activeListingsCount: number;
  onClose: () => void;
}

export const LandlordProfileModal: React.FC<LandlordProfileModalProps> = ({
  landlord,
  activeListingsCount,
  onClose,
}) => {
  if (!landlord) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3.5">
            <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-extrabold text-xl shadow-md border-2 border-white/20">
              {landlord.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-base text-white">{landlord.name}</h3>
              </div>
              <p className="text-xs text-slate-300 capitalize mt-0.5">
                {landlord.type.replace('_', ' ')}
              </p>
              {landlord.isIdVerified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full mt-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Verified by CampusNest</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Body Stats */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 font-semibold block">Active Listings</span>
              <span className="font-extrabold text-lg text-slate-900">{activeListingsCount || landlord.activeListings}</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 font-semibold block">Student Rating</span>
              <span className="font-extrabold text-lg text-amber-600 flex items-center justify-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{landlord.rating.toFixed(1)}</span>
              </span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs text-slate-600">
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Member on CampusNest Since:</span>
              <span className="font-bold text-slate-800">{landlord.joinedYear}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Primary Campus:</span>
              <span className="font-bold text-slate-800">LAUTECH (Ogbomoso)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Hostel Verification Check:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Physical On-Site Checked
              </span>
            </div>
          </div>

          {/* Action Contact */}
          <div className="space-y-2 pt-2">
            <a
              href={`https://wa.me/${landlord.whatsapp.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(landlord.name)},%20I%20saw%20your%20hostel%20on%20CampusNest%20and%20would%20like%20to%20inquire.`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat Directly on WhatsApp</span>
            </a>

            <a
              href={`tel:${landlord.phone}`}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Phone className="w-4 h-4 text-slate-600" />
              <span>Call Landlord ({landlord.phone})</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
