import React, { useState } from 'react';
import { X, Flag, AlertTriangle, CheckCircle2, ShieldAlert, UserX, Send } from 'lucide-react';
import { Property, LandlordReport, LandlordReportReason } from '../types';

interface ReportLandlordModalProps {
  landlord: Property['landlord'] | null;
  onClose: () => void;
  onSubmitReport: (report: LandlordReport) => void;
}

export const ReportLandlordModal: React.FC<ReportLandlordModalProps> = ({
  landlord,
  onClose,
  onSubmitReport,
}) => {
  if (!landlord) return null;

  const [reason, setReason] = useState<LandlordReportReason>('Fraud concern');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [referenceCode, setReferenceCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const ref = `REP-HOST-${Math.floor(1000 + Math.random() * 9000)}`;
    setReferenceCode(ref);

    const newReport: LandlordReport = {
      id: `lrep-${Date.now()}`,
      referenceNumber: ref,
      landlordId: landlord.id,
      landlordName: landlord.name,
      reporterName: reporterName.trim() || 'Anonymous Student',
      reporterEmail: reporterEmail.trim() || 'student@lautech.edu.ng',
      reporterPhone: reporterPhone.trim() || 'Not provided',
      reason,
      description: description.trim(),
      status: 'NEW',
      priority: reason === 'Fraud concern' || reason === 'Harassment' ? 'HIGH' : 'MEDIUM',
      createdAt: new Date().toISOString(),
    };

    onSubmitReport(newReport);
    setIsSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 rounded-2xl bg-rose-600/30 text-rose-300 shrink-0 border border-rose-500/30">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-300 block">
                Confidential Student Safety Desk
              </span>
              <h3 className="text-lg font-extrabold text-white">Report Landlord / Agent</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Reporting: <strong>{landlord.name}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form or Confirmation */}
        {isSubmitted ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
                Reference Code: {referenceCode}
              </span>
              <h4 className="text-lg font-bold text-slate-900 pt-2">Report Received by Safety Desk</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Thank you. Your report has been securely registered with CampusNest Trust & Safety officers. We will investigate this conduct confidentially.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-xs hover:bg-slate-800"
            >
              Close Window
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Reports are 100% confidential. CampusNest will never disclose your identity to the reported host.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Primary Reason for Report <span className="text-rose-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
              >
                <option value="Fraud concern">Fraud concern / Demanding offline advance fees</option>
                <option value="Misleading information">Misleading or false hostel information</option>
                <option value="Harassment">Harassment / Inappropriate conduct</option>
                <option value="Fake listing">Fake or non-existent property listings</option>
                <option value="Hidden fees">Extortionate undisclosed fees</option>
                <option value="Unprofessional behavior">Unprofessional or aggressive behavior</option>
                <option value="Other">Other conduct issue</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Detailed Description of the Incident <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Describe what happened with dates, amounts discussed, and context..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Your Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Oluwaseun Adeleke"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Your Email (For Follow-up)</label>
                <input
                  type="email"
                  placeholder="student@lautech.edu.ng"
                  value={reporterEmail}
                  onChange={(e) => setReporterEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Confidential Report</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
