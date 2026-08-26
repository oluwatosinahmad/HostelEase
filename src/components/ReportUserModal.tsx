import React, { useState } from 'react';
import { Flag, X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

interface ReportUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId: string;
  reportedUserName: string;
  conversationId?: string;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const ReportUserModal: React.FC<ReportUserModalProps> = ({
  isOpen,
  onClose,
  reportedUserId,
  reportedUserName,
  conversationId,
  onShowToast
}) => {
  const [reason, setReason] = useState<string>('SCAM');
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const reasons = [
    { value: 'SCAM', label: 'Suspicion of Scam / Advance Fee Fraud' },
    { value: 'HARASSMENT', label: 'Harassment / Abusive Messages' },
    { value: 'SUSPICIOUS_BEHAVIOR', label: 'Suspicious / Untrustworthy Behavior' },
    { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate Photos or Content' },
    { value: 'OTHER', label: 'Other Safety Concern' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      onShowToast('Please provide details explaining your report', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.messages.reportUser({
        reportedUserId,
        conversationId,
        reason,
        description: description.trim()
      });
      onShowToast('Safety report submitted to Hostel Ease administrators', 'success');
      onClose();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to submit report', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-rose-600">
            <Flag className="w-5 h-5" />
            <h3 className="font-black text-base text-slate-900">Report Inappropriate Activity</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Reporting <strong>{reportedUserName}</strong>. Our moderation team reviews all flagged communications to protect LAUTECH students and providers.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Reason for report</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              {reasons.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Details & Evidence</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened or why you feel unsafe..."
              rows={4}
              required
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md"
            >
              {submitting ? 'Submitting...' : 'Submit Safety Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
