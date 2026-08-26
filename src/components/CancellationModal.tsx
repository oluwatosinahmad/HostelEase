import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, X, ShieldAlert, ArrowRight, RefreshCw, 
  Building, MapPin, CheckCircle2, Info 
} from 'lucide-react';
import { api } from '../services/api';
import { CancellationPreviewData, AlternativeHostelRecommendation } from '../types/hostelEase';

interface CancellationModalProps {
  isOpen: boolean;
  bookingId: string;
  onClose: () => void;
  onCancelled: () => void;
  onSelectAlternative?: (hostelId: string) => void;
}

export const CancellationModal: React.FC<CancellationModalProps> = ({
  isOpen,
  bookingId,
  onClose,
  onCancelled,
  onSelectAlternative
}) => {
  const [preview, setPreview] = useState<CancellationPreviewData | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativeHostelRecommendation[]>([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !bookingId) return;

    setLoading(true);
    setError(null);

    Promise.all([
      api.bookings.getCancellationPreview(bookingId),
      api.bookings.getAlternatives(bookingId)
    ])
      .then(([prevData, altData]) => {
        setPreview(prevData);
        setAlternatives(altData.alternatives || []);
      })
      .catch(err => {
        setError(err.message || 'Failed to calculate cancellation terms');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, bookingId]);

  if (!isOpen) return null;

  const handleConfirmCancel = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for cancelling this reservation.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.bookings.cancel(bookingId, reason.trim());
      onCancelled();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel reservation');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="bg-red-700 text-white p-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-red-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Cancellation & Refund Policy</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Cancel Booking Reservation</h2>
          <p className="text-red-100 text-sm mt-1">
            Review the calculated refund and consequences before confirming cancellation.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 text-sm font-medium">Calculating deterministic refund terms...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : preview ? (
            <>
              {/* Financial Consequences Summary */}
              <div className="border border-gray-200 rounded-xl overflow-hidden text-sm">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-bold text-gray-800 flex items-center justify-between">
                  <span>Calculated Refund Breakdown</span>
                  <span className="text-xs text-gray-500">Ref: {preview.bookingReference}</span>
                </div>

                <div className="p-4 space-y-2.5">
                  <div className="flex justify-between items-center text-gray-700">
                    <span>Original Payment Received:</span>
                    <span className="font-semibold text-gray-900">₦{preview.originalPayment.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center text-gray-700">
                    <span className="flex items-center gap-1">
                      Cancellation Fee:
                      {preview.isFreeWindow && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">Grace Window</span>
                      )}
                    </span>
                    <span className={`font-semibold ${preview.cancellationFee > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      -₦{preview.cancellationFee.toLocaleString()}
                    </span>
                  </div>

                  <div className="pt-2.5 border-t border-gray-200 flex justify-between items-center text-base font-bold">
                    <span className="text-gray-900">Expected Net Refund:</span>
                    <span className="text-emerald-700 text-xl font-extrabold">₦{preview.expectedRefund.toLocaleString()}</span>
                  </div>

                  <div className="pt-2 text-xs text-gray-500">
                    <span className="font-medium text-gray-700">Refund Channel: </span>
                    <span>{preview.refundMethod}</span>
                  </div>
                </div>
              </div>

              {/* Policy Explanation Banner */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Policy Note: </span>
                  <span>{preview.policyTerms}</span>
                </div>
              </div>

              {/* Reason for Cancellation Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Reason for Cancellation <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="E.g., Changed preferred hostel location, budget change, or personal reasons..."
                  className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                />
              </div>

              {/* Real Alternative Hostels (Stress Reduction) */}
              {alternatives.length > 0 && (
                <div className="pt-2 border-t border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                      Need Another Room? Recommended Alternatives
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {alternatives.map(alt => (
                      <div 
                        key={alt.id}
                        onClick={() => onSelectAlternative && onSelectAlternative(alt.id)}
                        className="p-3 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all cursor-pointer flex gap-2.5 items-center"
                      >
                        <img 
                          src={alt.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=300&q=80'} 
                          alt={alt.title}
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-900 truncate">{alt.title}</p>
                          <p className="text-[11px] text-gray-500">{alt.areaName} • {alt.distanceFromCampusKm}km</p>
                          <p className="text-xs font-extrabold text-emerald-700 mt-0.5">₦{alt.rentAmount.toLocaleString()}/yr</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors text-sm"
          >
            Keep My Booking
          </button>

          <button
            type="button"
            disabled={submitting || loading || !reason.trim()}
            onClick={handleConfirmCancel}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-700/20 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing Refund...</span>
              </>
            ) : (
              <span>Confirm & Request Refund</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
