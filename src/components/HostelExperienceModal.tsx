import React, { useState } from 'react';
import { X, Building2, Zap, Droplets, Shield, Volume2, Wifi, Sparkles, Send, EyeOff, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface HostelExperienceModalProps {
  propertyId: string;
  propertyTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const HostelExperienceModal: React.FC<HostelExperienceModalProps> = ({
  propertyId,
  propertyTitle,
  isOpen,
  onClose,
  onSuccess,
  onShowToast
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [academicSession, setAcademicSession] = useState('2026/2027');
  const [durationMonths, setDurationMonths] = useState(12);

  const [overallExperience, setOverallExperience] = useState('');
  const [positivesSummary, setPositivesSummary] = useState('');
  const [concernsSummary, setConcernsSummary] = useState('');

  const [electricityNotes, setElectricityNotes] = useState('');
  const [waterNotes, setWaterNotes] = useState('');
  const [cleanlinessNotes, setCleanlinessNotes] = useState('');
  const [securityNotes, setSecurityNotes] = useState('');
  const [internetNotes, setInternetNotes] = useState('');
  const [noiseNotes, setNoiseNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overallExperience.trim() || overallExperience.trim().length < 15) {
      onShowToast('Please provide an overall experience description (at least 15 characters)', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.community.postExperience({
        propertyId,
        isAnonymous,
        academicSession,
        durationMonths,
        overallExperience: overallExperience.trim(),
        positivesSummary: positivesSummary.trim() || undefined,
        concernsSummary: concernsSummary.trim() || undefined,
        electricityNotes: electricityNotes.trim() || undefined,
        waterNotes: waterNotes.trim() || undefined,
        cleanlinessNotes: cleanlinessNotes.trim() || undefined,
        securityNotes: securityNotes.trim() || undefined,
        internetNotes: internetNotes.trim() || undefined,
        noiseNotes: noiseNotes.trim() || undefined
      });

      onShowToast('Your verified hostel experience has been recorded to help future students', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to submit hostel experience', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded">
              Verified Student Experience
            </span>
            <h2 className="text-base font-black mt-1 text-white truncate max-w-md">{propertyTitle}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          
          {/* Instructions Alert */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Keep feedback factual and respectful.</strong> Share real details about water schedules, electricity, and security to reduce uncertainty for other LAUTECH students.
            </p>
          </div>

          {/* Session & Duration & Privacy */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700">Academic Session</label>
              <select
                value={academicSession}
                onChange={(e) => setAcademicSession(e.target.value)}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                <option value="2026/2027">2026/2027 (Current)</option>
                <option value="2025/2026">2025/2026</option>
                <option value="2024/2025">2024/2025</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700">Duration of Stay</label>
              <select
                value={durationMonths}
                onChange={(e) => setDurationMonths(parseInt(e.target.value, 10))}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                <option value={12}>Full Academic Session (12 Mo)</option>
                <option value={6}>Single Semester (6 Mo)</option>
                <option value={3}>Short Term (3 Mo)</option>
              </select>
            </div>

            <div className="flex items-center">
              <label className="mt-4 flex items-center gap-2 p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 cursor-pointer w-full transition-colors">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="accent-emerald-600 rounded"
                />
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                  Post Anonymously
                </span>
              </label>
            </div>
          </div>

          {/* Overall Experience (Required) */}
          <div className="space-y-1">
            <label className="font-black text-slate-900">Overall Experience Summary *</label>
            <textarea
              value={overallExperience}
              onChange={(e) => setOverallExperience(e.target.value)}
              placeholder="e.g. I stayed here for one session. Compound was safe and clean, but generator hours were limited during the holidays..."
              rows={3}
              required
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Positives vs Concerns Quick Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-emerald-800">Key Positive Highlight</label>
              <input
                type="text"
                value={positivesSummary}
                onChange={(e) => setPositivesSummary(e.target.value)}
                placeholder="e.g. Constant borehole water & gated compound"
                className="w-full mt-1 p-2 bg-emerald-50/50 border border-emerald-200 rounded-xl text-slate-900 font-medium"
              />
            </div>
            <div>
              <label className="font-bold text-amber-800">Key Concern / Advice to Inquire</label>
              <input
                type="text"
                value={concernsSummary}
                onChange={(e) => setConcernsSummary(e.target.value)}
                placeholder="e.g. Inquire about generator fueling fee"
                className="w-full mt-1 p-2 bg-amber-50/50 border border-amber-200 rounded-xl text-slate-900 font-medium"
              />
            </div>
          </div>

          {/* Multi-Dimensional Feedback Fields */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
              Optional Specific Facility Observations
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Electricity & Generator Schedule
                </label>
                <input
                  type="text"
                  value={electricityNotes}
                  onChange={(e) => setElectricityNotes(e.target.value)}
                  placeholder="e.g. Solar inverter / 7-11pm generator schedule"
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-blue-500" />
                  Water Supply & Borehole
                </label>
                <input
                  type="text"
                  value={waterNotes}
                  onChange={(e) => setWaterNotes(e.target.value)}
                  placeholder="e.g. Daily borehole pumping into personal buckets"
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  Security & Compound Gate
                </label>
                <input
                  type="text"
                  value={securityNotes}
                  onChange={(e) => setSecurityNotes(e.target.value)}
                  placeholder="e.g. Gate closes at 10pm, security guard on duty"
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-purple-500" />
                  Noise & Study Quietness
                </label>
                <input
                  type="text"
                  value={noiseNotes}
                  onChange={(e) => setNoiseNotes(e.target.value)}
                  placeholder="e.g. Quiet interior street / occasional bike sounds"
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !overallExperience.trim()}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl transition-all flex items-center gap-1.5 shadow"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Publish Experience</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
