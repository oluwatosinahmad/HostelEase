import React, { useState } from 'react';
import { X, CheckCircle2, ThumbsUp, ShieldCheck, HeartHandshake } from 'lucide-react';
import { VirtualViewingRequest, ViewingRatingScore, UserProfile } from '../types';

interface ViewingFeedbackModalProps {
  viewing: VirtualViewingRequest;
  currentUser: UserProfile | null;
  onClose: () => void;
  onSubmitFeedback: (feedback: {
    viewingId: string;
    propertyId: string;
    propertyTitle: string;
    studentId: string;
    studentName: string;
    rating: ViewingRatingScore;
    comment?: string;
  }) => void;
}

export const ViewingFeedbackModal: React.FC<ViewingFeedbackModalProps> = ({
  viewing,
  currentUser,
  onClose,
  onSubmitFeedback,
}) => {
  const [rating, setRating] = useState<ViewingRatingScore>('Very good');
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const scores: { score: ViewingRatingScore; label: string; emoji: string }[] = [
    { score: 'Very good', label: 'Punctual & thorough', emoji: '🌟' },
    { score: 'Good', label: 'Satisfactory walkthrough', emoji: '👍' },
    { score: 'Average', label: 'Okay, some questions unanswered', emoji: '😐' },
    { score: 'Poor', label: 'Poor video / late host', emoji: '👎' },
    { score: 'Very poor', label: 'Did not show up / bad experience', emoji: '❌' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitFeedback({
      viewingId: viewing.id,
      propertyId: viewing.propertyId,
      propertyTitle: viewing.propertyTitle,
      studentId: currentUser?.id || 'stu-demo',
      studentName: currentUser?.name || viewing.studentName,
      rating,
      comment: comment.trim() || undefined,
    });
    setIsSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-200 block">
                Private Quality Check
              </span>
              <h3 className="text-base sm:text-lg font-black leading-tight">
                How was your viewing?
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

        {isSubmitted ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-3xl mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-900">Thank You for Your Feedback!</h4>
              <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                Your private rating helps CampusNest monitor host punctuality and verification accuracy across Ogbomoso.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-2xl transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs">
              <span className="font-bold text-slate-900 block">{viewing.propertyTitle}</span>
              <span className="text-slate-500 text-[11px]">
                Host: {viewing.landlordName} • {viewing.platform}
              </span>
            </div>

            {/* Score Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Rate the host's virtual walkthrough punctuality & clarity:
              </label>
              <div className="space-y-1.5">
                {scores.map((s) => (
                  <label
                    key={s.score}
                    onClick={() => setRating(s.score)}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-xs cursor-pointer transition-colors ${
                      rating === s.score
                        ? 'bg-teal-50 border-teal-500 text-teal-950 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="text-lg">{s.emoji}</span>
                      <div>
                        <span className="block font-bold">{s.score}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{s.label}</span>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="viewingScore"
                      checked={rating === s.score}
                      onChange={() => {}}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Optional Comment */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Private Notes or Feedback for CampusNest (Optional)
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Did the host show you the running water and compound? Was the video clear?..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>
                This feedback is confidential and will <strong>not</strong> be posted as a public review.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Skip
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Submit Private Feedback</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
