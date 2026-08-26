import React, { useState } from 'react';
import { 
  MessageSquareHeart, 
  X, 
  Star, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Send
} from 'lucide-react';
import { UserProfile } from '../types';

interface StudentFeedbackModalProps {
  isOpen: boolean;
  currentUser: UserProfile | null;
  onClose: () => void;
  onSubmitFeedback: (feedback: {
    biggestStruggle: 'AGENT_FEES' | 'FAKE_LISTINGS' | 'WATER_LIGHT' | 'TRANSPORT_COMMUTE' | 'PRICING' | 'OTHER';
    whatWasDifficult?: string;
    whatDidYouLike?: string;
    whatWouldMakeEasier?: string;
    whatInformationMissing?: string;
    comments: string;
    rating: number;
  }) => void;
}

export const StudentFeedbackModal: React.FC<StudentFeedbackModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onSubmitFeedback,
}) => {
  const [biggestStruggle, setBiggestStruggle] = useState<'AGENT_FEES' | 'FAKE_LISTINGS' | 'WATER_LIGHT' | 'TRANSPORT_COMMUTE' | 'PRICING' | 'OTHER'>('AGENT_FEES');
  const [whatWasDifficult, setWhatWasDifficult] = useState('');
  const [whatDidYouLike, setWhatDidYouLike] = useState('');
  const [whatWouldMakeEasier, setWhatWouldMakeEasier] = useState('');
  const [whatInformationMissing, setWhatInformationMissing] = useState('');
  const [comments, setComments] = useState('');
  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitFeedback({
      biggestStruggle,
      whatWasDifficult: whatWasDifficult.trim(),
      whatDidYouLike: whatDidYouLike.trim(),
      whatWouldMakeEasier: whatWouldMakeEasier.trim(),
      whatInformationMissing: whatInformationMissing.trim(),
      comments: comments.trim() || whatWasDifficult.trim() || whatDidYouLike.trim(),
      rating,
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden text-white my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-600/20 text-brand-400 flex items-center justify-center">
              <MessageSquareHeart className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black text-brand-400 uppercase tracking-wider block">LAUTECH Student Voice</span>
              <h2 className="text-lg font-black text-white">Beta Feedback Survey</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3 animate-fadeIn">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-white text-base">Thank You for Your Feedback!</h3>
            <p className="text-xs text-slate-400">Your feedback directly shapes how CampusNest protects LAUTECH students from accommodation stress.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
            
            {/* Overall Rating */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Overall Experience Rating
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-slate-600 hover:text-amber-400 transition-colors cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs text-amber-400 font-bold ml-2">{rating} / 5 Stars</span>
              </div>
            </div>

            {/* Question 1: What was difficult? */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                1. What was difficult?
              </label>
              <input
                type="text"
                value={whatWasDifficult}
                onChange={(e) => setWhatWasDifficult(e.target.value)}
                placeholder="e.g. Understanding fees, slow video loading, filtering areas..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Question 2: What did you like? */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                2. What did you like?
              </label>
              <input
                type="text"
                value={whatDidYouLike}
                onChange={(e) => setWhatDidYouLike(e.target.value)}
                placeholder="e.g. 48-hour escrow safety, real video tours, comparison table..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Question 3: What would make finding accommodation easier? */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                3. What would make finding accommodation easier?
              </label>
              <input
                type="text"
                value={whatWouldMakeEasier}
                onChange={(e) => setWhatWouldMakeEasier(e.target.value)}
                placeholder="e.g. Roommate pairing, live landlord chat, bike price estimates..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Question 4: What information were you missing? */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                4. What information were you missing?
              </label>
              <input
                type="text"
                value={whatInformationMissing}
                onChange={(e) => setWhatInformationMissing(e.target.value)}
                placeholder="e.g. Light bill history, borehole pump schedule, gate closing time..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Beta Feedback</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
