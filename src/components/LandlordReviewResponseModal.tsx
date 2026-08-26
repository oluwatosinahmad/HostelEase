import React, { useState } from 'react';
import { X, MessageSquare, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { StudentReview, UserProfile } from '../types';

interface LandlordReviewResponseModalProps {
  review: StudentReview;
  currentUser: UserProfile | null;
  onClose: () => void;
  onSubmitResponse: (reviewId: string, message: string) => void;
}

export const LandlordReviewResponseModal: React.FC<LandlordReviewResponseModalProps> = ({
  review,
  currentUser,
  onClose,
  onSubmitResponse,
}) => {
  const existingResponse = review.landlordResponse?.message || '';
  const [responseMessage, setResponseMessage] = useState(existingResponse);
  const [showError, setShowError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseMessage.trim()) {
      setShowError('Please write your response message before submitting.');
      return;
    }

    if (responseMessage.trim().length < 10) {
      setShowError('Response message should be at least 10 characters.');
      return;
    }

    onSubmitResponse(review.id, responseMessage.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-brand-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 block">
                Official Host Desk
              </span>
              <h3 className="text-base sm:text-lg font-black leading-tight">
                Respond to Student Review
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

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {showError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{showError}</span>
            </div>
          )}

          {/* Student's Review Context */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-800">{review.studentName}</span>
              <span className="text-amber-600 font-bold">★ {review.rating}.0 Overall</span>
            </div>
            <p className="text-slate-600 italic">"{review.comment}"</p>
            <span className="text-[10px] text-slate-400 block pt-1 border-t border-slate-200">
              Department: {review.studentDepartment} • {review.stayPeriod || 'Student Resident'}
            </span>
          </div>

          {/* Landlord Response Text Area */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
              <span>Your Official Public Response</span>
              <span className="text-[10px] text-slate-400 font-normal">Visible on property listing</span>
            </label>
            <textarea
              required
              rows={4}
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
              placeholder="e.g. Thank you for the feedback! We have since repaired the water pump and added extra overhead tanks to ensure 24/7 water supply..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Guidelines */}
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-[11px] text-blue-950 space-y-1">
            <strong className="block font-bold">Tips for professional responses:</strong>
            <p className="text-blue-900/80">
              Acknowledge constructive feedback politely. Explain any upgrades, maintenance, or fixes that have taken place. Prospective students appreciate communicative and transparent landlords!
            </p>
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
              className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{existingResponse ? 'Update Response' : 'Publish Host Response'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
