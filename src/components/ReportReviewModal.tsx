import React, { useState } from 'react';
import { X, Flag, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { StudentReview, ReviewReportReason, UserProfile } from '../types';

interface ReportReviewModalProps {
  review: StudentReview;
  currentUser: UserProfile | null;
  onClose: () => void;
  onSubmitReport: (reportData: {
    reviewId: string;
    propertyId: string;
    propertyTitle: string;
    reviewAuthor: string;
    reviewSnippet: string;
    reporterName: string;
    reporterEmail: string;
    reporterRole: 'student' | 'landlord' | 'admin';
    reason: ReviewReportReason;
    description: string;
  }) => void;
}

export const ReportReviewModal: React.FC<ReportReviewModalProps> = ({
  review,
  currentUser,
  onClose,
  onSubmitReport,
}) => {
  const [reason, setReason] = useState<ReviewReportReason>('Fake review');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState(currentUser?.name || '');
  const [reporterEmail, setReporterEmail] = useState(currentUser?.email || '');
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const reasonsList: ReviewReportReason[] = [
    'Fake review',
    'Spam',
    'Harassment',
    'Offensive content',
    'Personal information',
    'Misleading information',
    'Other',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const ref = `REP-REV-${Math.floor(1000 + Math.random() * 9000)}`;
    setSubmittedRef(ref);

    onSubmitReport({
      reviewId: review.id,
      propertyId: review.propertyId,
      propertyTitle: review.propertyTitle || 'CampusNest Hostel',
      reviewAuthor: review.studentName,
      reviewSnippet: review.comment.slice(0, 100),
      reporterName: reporterName.trim() || 'Anonymous Reporter',
      reporterEmail: reporterEmail.trim() || 'reporter@campusnest.ng',
      reporterRole: currentUser?.role || 'student',
      reason,
      description: description.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-200 block">
                Trust & Moderation Desk
              </span>
              <h3 className="text-base sm:text-lg font-black leading-tight">
                Report Student Review
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submittedRef ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-900">Review Report Submitted</h4>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                Thank you for helping keep CampusNest honest. The admin moderation desk has logged your investigation ticket.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 inline-block text-center">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                Confidential Tracking Reference
              </span>
              <span className="text-base font-black text-brand-700 tracking-wider">
                {submittedRef}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Please note: CampusNest protects genuine negative feedback. Reviews are only hidden if they violate platform rules (e.g. extortion, hate speech, doxed personal details).
            </p>

            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-2xl transition-colors"
            >
              Done & Return
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            {/* Snippet of Reported Review */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-700">Review by {review.studentName}</span>
                <span className="text-amber-600 font-extrabold">★ {review.rating}.0</span>
              </div>
              <p className="text-slate-600 italic line-clamp-2">"{review.comment}"</p>
            </div>

            {/* Reason Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Select Violation Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {reasonsList.map((r) => (
                  <label
                    key={r}
                    onClick={() => setReason(r)}
                    className={`flex items-center space-x-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                      reason === r
                        ? 'bg-rose-50 border-rose-500 text-rose-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      checked={reason === r}
                      onChange={() => {}}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Provide Investigation Details & Evidence
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain why this review violates platform policies (e.g. contains personal phone number, fake tenant, harassment)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Reporter Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Your Email</label>
                <input
                  type="email"
                  required
                  value={reporterEmail}
                  onChange={(e) => setReporterEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>
            </div>

            {/* Notice */}
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-950 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Moderation decisions are objective. Genuine negative reviews describing actual shortcomings will not be removed.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Submit Investigation Report</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
