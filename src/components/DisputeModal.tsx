import React, { useState } from 'react';
import { 
  AlertCircle, X, ShieldAlert, Upload, CheckCircle2, 
  RefreshCw, FileText, Camera 
} from 'lucide-react';
import { api } from '../services/api';
import { DisputeCategory } from '../types/hostelEase';

interface DisputeModalProps {
  isOpen: boolean;
  bookingId: string;
  bookingReference: string;
  propertyTitle: string;
  onClose: () => void;
  onSubmitted: (disputeCode: string) => void;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({
  isOpen,
  bookingId,
  bookingReference,
  propertyTitle,
  onClose,
  onSubmitted
}) => {
  const [category, setCategory] = useState<DisputeCategory>('HOSTEL_NOT_AS_DESCRIBED');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceList, setEvidenceList] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const addEvidence = () => {
    if (evidenceUrl.trim()) {
      setEvidenceList(prev => [...prev, evidenceUrl.trim()]);
      setEvidenceUrl('');
    }
  };

  const removeEvidence = (index: number) => {
    setEvidenceList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError('Please provide both a subject and full description of the issue.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.disputes.create({
        bookingId,
        category,
        subject: subject.trim(),
        description: description.trim(),
        evidence: evidenceList
      });
      onSubmitted(res.disputeCode);
    } catch (err: any) {
      setError(err.message || 'Failed to submit dispute');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Hostel Ease Trust & Safety Center</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Report a Problem / Open Dispute</h2>
          <p className="text-slate-300 text-sm mt-1">
            Booking Ref: <span className="font-mono text-amber-300 font-bold">{bookingReference}</span> • {propertyTitle}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Issue Category <span className="text-red-600">*</span>
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as DisputeCategory)}
              className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-sm font-medium"
            >
              <option value="HOSTEL_NOT_AS_DESCRIBED">Hostel Not as Described (Photos/Facilities Mismatch)</option>
              <option value="PROVIDER_ISSUE">Host / Caretaker Conduct Issue</option>
              <option value="PAYMENT_ISSUE">Payment / Fee Dispute</option>
              <option value="BOOKING_ISSUE">Room Double-Booked / Unavailable</option>
              <option value="REFUND_ISSUE">Refund Delay or Amount Discrepancy</option>
              <option value="INSPECTION_ISSUE">Inspection Disagreement</option>
              <option value="SAFETY_ISSUE">Security / Structural Hazard</option>
              <option value="OTHER">Other Accommodation Issue</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Subject Summary <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="E.g., Borehole not working or room photos different from reality"
              className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Detailed Description <span className="text-red-600">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe exactly what happened, when you noticed the issue, and what resolution you are requesting (e.g. repair, partial refund, or relocation)..."
              className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-sm"
            />
          </div>

          {/* Evidence Attachments */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Photo / Document Evidence (Optional)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={evidenceUrl}
                onChange={e => setEvidenceUrl(e.target.value)}
                placeholder="Paste image / screenshot URL..."
                className="flex-1 p-2.5 rounded-xl border border-gray-300 text-sm"
              />
              <button
                type="button"
                onClick={addEvidence}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors"
              >
                Add Link
              </button>
            </div>

            {evidenceList.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {evidenceList.map((url, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs border border-gray-200">
                    <span className="truncate max-w-[80%] text-gray-600">{url}</span>
                    <button type="button" onClick={() => removeEvidence(i)} className="text-red-600 font-bold hover:underline">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
            <span className="font-bold text-slate-900">Fair Resolution Guarantee: </span>
            Our administrative trust team investigates all disputes impartially and holds funds in escrow during review.
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors text-sm"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || !subject.trim() || !description.trim()}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting Dispute...</span>
                </>
              ) : (
                <span>Submit to Trust & Safety</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
