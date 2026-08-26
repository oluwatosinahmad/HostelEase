import React, { useState } from 'react';
import { 
  X, 
  Flag, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2 
} from 'lucide-react';
import { Property, ReportReason } from '../types/hostelEase';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ReportListingModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const ReportListingModal: React.FC<ReportListingModalProps> = ({
  property,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { isAuthenticated } = useAuth();
  const [reason, setReason] = useState<ReportReason>('WRONG_PRICE');
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const reasonsList: { key: ReportReason; label: string; desc: string }[] = [
    { key: 'WRONG_PRICE', label: 'Inaccurate / Hidden Price', desc: 'Landlord demanded unlisted extra fees or higher rent amount' },
    { key: 'FAKE_HOSTEL', label: 'Fake Listing / Scam Alert', desc: 'Property does not exist or provider is impersonating the owner' },
    { key: 'WRONG_PHOTOS', label: 'Deceptive Photos or Videos', desc: 'Real room condition differs drastically from displayed photos' },
    { key: 'HOSTEL_UNAVAILABLE', label: 'Already Fully Occupied', desc: 'Lodge has no available rooms despite being marked Available' },
    { key: 'WRONG_LOCATION', label: 'Incorrect Location / Distance', desc: 'Lodge is further away from LAUTECH than stated' },
    { key: 'SUSPICIOUS_PROVIDER', label: 'Suspicious / Hostile Landlord', desc: 'Refused inspection or requested unsafe payment transfers' },
    { key: 'MISLEADING_INFO', label: 'Missing / Broken Amenities', desc: 'Stated facilities like running water or generator are non-functional' },
    { key: 'OTHER', label: 'Other Concern', desc: 'Any other safety or integrity violation' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setError('Please log in to report a listing.');
      return;
    }

    if (!description.trim()) {
      setError('Please provide specific details to help our moderation team investigate.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.reports.submit(property.id, {
        reason,
        description: description.trim()
      });

      onSuccess(res.message);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="bg-rose-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <ShieldAlert className="w-5 h-5 text-rose-200" />
            </div>
            <div>
              <h3 className="font-bold text-base">Report Listing</h3>
              <p className="text-xs text-rose-100 line-clamp-1">{property.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Report Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Primary Reason
            </label>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {reasonsList.map(r => (
                <label
                  key={r.key}
                  className={`flex items-start gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    reason === r.key
                      ? 'bg-rose-50/70 border-rose-400 text-slate-900 font-medium ring-1 ring-rose-400/30'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    checked={reason === r.key}
                    onChange={() => setReason(r.key)}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <p className="font-bold text-slate-900">{r.label}</p>
                    <p className="text-[11px] text-slate-500">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Explain the Issue in Detail
            </label>
            <textarea
              rows={3}
              placeholder="Please describe what occurred or what was inaccurate during your search or visit..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              required
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-[11px] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Reports are audited directly by Hostel Ease administrators to keep students safe.</span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              {submitting ? 'Submitting Report...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
