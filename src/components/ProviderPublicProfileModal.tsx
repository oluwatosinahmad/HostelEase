import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  ShieldCheck, 
  Phone, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  ExternalLink,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { PublicProviderProfile } from '../types/hostelEase';
import { api } from '../services/api';
import { formatNaira, formatDistance } from '../utils/formatters';

interface ProviderPublicProfileModalProps {
  providerId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectProperty?: (propertyId: string) => void;
}

export const ProviderPublicProfileModal: React.FC<ProviderPublicProfileModalProps> = ({
  providerId,
  isOpen,
  onClose,
  onSelectProperty
}) => {
  const [profile, setProfile] = useState<PublicProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && providerId) {
      setLoading(true);
      setError(null);
      api.publicProvider.getProfile(providerId)
        .then(res => {
          setProfile(res.provider);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message || 'Failed to load landlord profile');
          setLoading(false);
        });
    }
  }, [isOpen, providerId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading landlord profile...</div>
          ) : profile ? (
            <div className="flex items-start gap-4">
              <img
                src={profile.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80'}
                alt={profile.fullName}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-md flex-shrink-0"
              />

              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black">{profile.fullName}</h2>
                  {profile.verificationStatus === 'VERIFIED' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> VERIFIED PROVIDER
                    </span>
                  )}
                </div>

                <p className="text-xs text-emerald-400 font-semibold">{profile.businessName}</p>
                <p className="text-[11px] text-slate-300">
                  Role: <strong className="text-white">{profile.providerType.replace('_', ' ')}</strong> • Preferred: {profile.preferredContactMethod}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-rose-400 text-xs">{error || 'Provider not found'}</div>
          )}
        </div>

        {profile && (
          <div className="p-6 space-y-6">
            {/* Bio */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">About This Landlord</h3>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                {profile.bio}
              </p>
            </div>

            {/* Anti-Scam Protection Box */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Student Safety Guarantee:</strong> Never make payments into any account before conducting an in-person or virtual inspection tour.
              </div>
            </div>

            {/* Active Approved Lodges */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Active Verified Accommodations ({profile.properties.length})
                </h3>
              </div>

              {profile.properties.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No public listings currently active.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {profile.properties.map(p => (
                    <div
                      key={p.id}
                      onClick={() => {
                        if (onSelectProperty) onSelectProperty(p.id);
                        onClose();
                      }}
                      className="bg-slate-50 hover:bg-emerald-50/50 p-3 rounded-2xl border border-slate-200 hover:border-emerald-400 transition-all cursor-pointer flex gap-3 items-center group"
                    >
                      <img
                        src={p.coverImage}
                        alt={p.title}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-slate-200"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                          {p.title}
                        </h4>
                        <p className="text-[10px] text-slate-500">📍 {(p as any).areaName || p.area?.name} • {formatDistance(p.distanceFromCampusKm)}</p>
                        <p className="text-xs font-bold text-emerald-800 mt-1">{formatNaira((p as any).rentAmount || p.priceSummary?.rentAmount || 0)}/yr</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
