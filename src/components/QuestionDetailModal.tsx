import React, { useState } from 'react';
import { X, ThumbsUp, ThumbsDown, MessageSquare, ShieldCheck, CheckCircle, Flag, Send, HelpCircle, Building2, User } from 'lucide-react';
import { api } from '../services/api';

interface QuestionDetailModalProps {
  questionId: string;
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onOpenAuthModal?: () => void;
}

export const QuestionDetailModal: React.FC<QuestionDetailModalProps> = ({
  questionId,
  isOpen,
  onClose,
  isAuthenticated,
  onShowToast,
  onOpenAuthModal
}) => {
  const [data, setData] = useState<{ question: any; answers: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reportingEntity, setReportingEntity] = useState<{ type: string; id: string } | null>(null);
  const [reportReason, setReportReason] = useState('FALSE_INFORMATION');
  const [reportDescription, setReportDescription] = useState('');

  const fetchDetails = async () => {
    if (!questionId) return;
    setLoading(true);
    try {
      const res = await api.community.getQuestionDetail(questionId);
      setData(res);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to load question details', 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && questionId) {
      fetchDetails();
    }
  }, [isOpen, questionId]);

  if (!isOpen) return null;

  const handleSendAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }
    if (!answerText.trim() || answerText.trim().length < 10) {
      onShowToast('Please provide a helpful answer (at least 10 characters)', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.community.answerQuestion({
        questionId,
        content: answerText.trim()
      });
      setAnswerText('');
      onShowToast('Your answer has been published to the student community', 'success');
      fetchDetails();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to submit answer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReaction = async (answerId: string, reactionType: 'HELPFUL' | 'UNHELPFUL') => {
    if (!isAuthenticated) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }
    try {
      await api.community.reactToAnswer({ answerId, reactionType });
      fetchDetails();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to submit feedback', 'error');
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingEntity) return;
    try {
      await api.community.submitReport({
        entityType: reportingEntity.type,
        entityId: reportingEntity.id,
        reason: reportReason,
        description: reportDescription
      });
      onShowToast('Report submitted to Trust & Safety for administrator review', 'success');
      setReportingEntity(null);
      setReportDescription('');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to submit report', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {data?.question?.category || 'Community Question'}
            </span>
            {data?.question?.areaName && (
              <span className="text-xs text-slate-300 font-medium">📍 {data.question.areaName}</span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Loading student answers...</p>
            </div>
          ) : data?.question ? (
            <>
              {/* Question Card */}
              <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                <h2 className="text-lg font-black text-slate-900 leading-snug">{data.question.title}</h2>
                <p className="text-xs text-slate-700 font-medium whitespace-pre-line leading-relaxed">{data.question.description}</p>
                
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {data.question.authorName}
                    </span>
                    {data.question.isVerifiedStudent && (
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-black tracking-wide">
                        VERIFIED STUDENT
                      </span>
                    )}
                    {data.question.isVerifiedStay && (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-wide">
                        VERIFIED STAY
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span>{new Date(data.question.createdAt).toLocaleDateString()}</span>
                    <button
                      onClick={() => setReportingEntity({ type: 'QUESTION', id: data.question.id })}
                      className="text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1"
                      title="Report this question"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Report</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Answers Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span>Answers & Experiences ({data.answers.length})</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">Prioritizes verified & helpful advice</span>
                </div>

                {data.answers.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
                    <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">No student answers yet.</p>
                    <p className="text-[11px] text-slate-500">Be the first to share your experience or advice for this student!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.answers.map((ans: any) => (
                      <div
                        key={ans.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          ans.isOfficialGuide
                            ? 'bg-indigo-50/70 border-indigo-200'
                            : ans.authorRole === 'PROVIDER'
                            ? 'bg-amber-50/70 border-amber-200'
                            : 'bg-white border-slate-200 shadow-sm'
                        }`}
                      >
                        {/* Author Badges */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900">{ans.authorName}</span>
                            {ans.isOfficialGuide && (
                              <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-black">
                                HOSTEL EASE GUIDE
                              </span>
                            )}
                            {ans.authorRole === 'PROVIDER' && (
                              <span className="px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-black">
                                PROVIDER
                              </span>
                            )}
                            {ans.isVerifiedStay && (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                VERIFIED STAY
                              </span>
                            )}
                            {ans.isHelpfulContributor && (
                              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-black">
                                HELPFUL CONTRIBUTOR
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">{new Date(ans.createdAt).toLocaleDateString()}</span>
                        </div>

                        {/* Content */}
                        <p className="text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-line">{ans.content}</p>

                        {/* Reaction / Helpful Counter */}
                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-500">Was this helpful?</span>
                            <button
                              onClick={() => handleReaction(ans.id, 'HELPFUL')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all ${
                                ans.userReaction === 'HELPFUL'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                              <span>Helpful ({ans.helpfulCount})</span>
                            </button>
                            <button
                              onClick={() => handleReaction(ans.id, 'UNHELPFUL')}
                              className={`p-1.5 rounded-lg text-xs transition-colors ${
                                ans.userReaction === 'UNHELPFUL'
                                  ? 'bg-rose-600 text-white'
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                              title="Not helpful"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            onClick={() => setReportingEntity({ type: 'ANSWER', id: ans.id })}
                            className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1"
                          >
                            <Flag className="w-3 h-3" />
                            <span>Report</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Answer Form Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <form onSubmit={handleSendAnswer} className="flex gap-2">
            <input
              type="text"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder={isAuthenticated ? "Write factual, respectful accommodation advice..." : "Log in to answer this question"}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={submitting || !answerText.trim()}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Post Answer</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Report Modal */}
        {reportingEntity && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Flag className="w-4 h-4 text-rose-600" />
                  <span>Report Community Content</span>
                </h4>
                <button onClick={() => setReportingEntity(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleReport} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700">Reason</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                  >
                    <option value="SPAM">Spam / Promotional content</option>
                    <option value="SCAM">Scam / Fraud / Informal payment solicitation</option>
                    <option value="HARASSMENT">Harassment or abusive language</option>
                    <option value="FALSE_INFORMATION">False or fabricated information</option>
                    <option value="IMPERSONATION">Impersonating a student or official</option>
                    <option value="INAPPROPRIATE_CONTENT">Inappropriate content</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700">Additional Details</label>
                  <textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Describe why this content violates community trust guidelines..."
                    rows={3}
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportingEntity(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black shadow"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
