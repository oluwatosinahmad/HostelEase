import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, CheckCircle2, AlertTriangle, MessageSquare, Plus, User, Clock, EyeOff } from 'lucide-react';
import { api } from '../services/api';
import { HostelExperienceModal } from './HostelExperienceModal';
import { QuestionDetailModal } from './QuestionDetailModal';

interface HostelStudentInsightsProps {
  propertyId: string;
  propertyTitle: string;
  isAuthenticated: boolean;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onOpenAuthModal?: () => void;
}

export const HostelStudentInsights: React.FC<HostelStudentInsightsProps> = ({
  propertyId,
  propertyTitle,
  isAuthenticated,
  onShowToast,
  onOpenAuthModal
}) => {
  const [insights, setInsights] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExpModal, setShowExpModal] = useState(false);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  const fetchInsights = async () => {
    if (!propertyId) return;
    setLoading(true);
    try {
      const data = await api.community.getHostelInsights(propertyId);
      setInsights(data);
    } catch (err) {
      console.error('Failed to load hostel insights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [propertyId]);

  return (
    <div className="bg-slate-50/70 border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-600 text-white shadow-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              STUDENT INSIGHTS
            </span>
            <span className="text-xs text-slate-500 font-bold">
              {insights?.verifiedStayCount || 0} Verified Stays Recorded
            </span>
          </div>
          <h3 className="text-sm font-black text-slate-900 mt-1">Real Student Experiences & Consensus</h3>
        </div>

        <button
          onClick={() => {
            if (!isAuthenticated) {
              if (onOpenAuthModal) onOpenAuthModal();
              return;
            }
            setShowExpModal(true);
          }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Share Your Experience</span>
        </button>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-400">Loading student insights...</div>
      ) : insights ? (
        <div className="space-y-4">
          
          {/* Consensus Grid: Positives vs Inquiries */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-1.5 text-xs">
              <h4 className="font-black text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>What Students Appreciate</span>
              </h4>
              <ul className="space-y-1 text-[11px] text-emerald-950 font-medium">
                {insights.commonPositives?.slice(0, 3).map((p: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-1.5 text-xs">
              <h4 className="font-black text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Recommended to Inquire</span>
              </h4>
              <ul className="space-y-1 text-[11px] text-amber-950 font-medium">
                {insights.commonConcerns?.slice(0, 3).map((c: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recent Experiences */}
          {insights.recentExperiences?.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Recent Student Observations
              </h4>
              <div className="space-y-2">
                {insights.recentExperiences.slice(0, 3).map((exp: any) => (
                  <div key={exp.id} className="p-3.5 bg-white border border-slate-200/90 rounded-2xl text-xs space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-800">{exp.authorName}</span>
                        {exp.isVerifiedStay && (
                          <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-black">
                            VERIFIED STAY
                          </span>
                        )}
                        <span className="text-slate-400 font-normal">({exp.academicSession})</span>
                      </div>
                      <span>{new Date(exp.createdAt).toLocaleDateString()}</span>
                    </div>

                    <p className="text-slate-800 font-medium leading-relaxed">
                      "{exp.overallExperience}"
                    </p>

                    {/* Specific highlights */}
                    <div className="flex flex-wrap gap-2 text-[10px] pt-1">
                      {exp.electricityNotes && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-medium border border-amber-200">
                          ⚡ {exp.electricityNotes}
                        </span>
                      )}
                      {exp.waterNotes && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded font-medium border border-blue-200">
                          💧 {exp.waterNotes}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      ) : null}

      {/* Experience Modal */}
      <HostelExperienceModal
        propertyId={propertyId}
        propertyTitle={propertyTitle}
        isOpen={showExpModal}
        onClose={() => setShowExpModal(false)}
        onSuccess={() => fetchInsights()}
        onShowToast={onShowToast}
      />

      {/* Question Modal */}
      {activeQuestionId && (
        <QuestionDetailModal
          questionId={activeQuestionId}
          isOpen={Boolean(activeQuestionId)}
          onClose={() => setActiveQuestionId(null)}
          isAuthenticated={isAuthenticated}
          onShowToast={onShowToast}
          onOpenAuthModal={onOpenAuthModal}
        />
      )}

    </div>
  );
};
