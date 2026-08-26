import React, { useState } from 'react';
import { X, Flag, AlertTriangle, ShieldCheck, CheckCircle2, MessageSquare } from 'lucide-react';
import { Booking, BookingDisputeReason, UserProfile } from '../types';

interface BookingDisputeModalProps {
  booking: Booking;
  currentUser: UserProfile | null;
  onClose: () => void;
  onSubmitDispute: (disputeData: {
    bookingId: string;
    bookingReference: string;
    propertyId: string;
    propertyTitle: string;
    reporterRole: 'student' | 'landlord';
    reporterName: string;
    reporterEmail: string;
    reporterPhone?: string;
    reason: BookingDisputeReason;
    description: string;
  }) => void;
}

export const BookingDisputeModal: React.FC<BookingDisputeModalProps> = ({
  booking,
  currentUser,
  onClose,
  onSubmitDispute,
}) => {
  const [reason, setReason] = useState<BookingDisputeReason>('Property unavailable after booking');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState(currentUser?.name || booking.studentName);
  const [reporterEmail, setReporterEmail] = useState(currentUser?.email || booking.studentEmail);
  const [reporterPhone, setReporterPhone] = useState(currentUser?.phone || booking.studentPhone);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const disputeReasons: BookingDisputeReason[] = [
    'Property unavailable after booking',
    'Landlord not responding',
    'Incorrect property information',
    'Fee discrepancy',
    'Safety / condition concern',
    'Other',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const ref = `CN-DISP-${Math.floor(1000 + Math.random() * 9000)}`;
    setSubmittedRef(ref);

    const isLandlord = currentUser?.role === 'landlord' || currentUser?.id === booking.landlordId;

    onSubmitDispute({
      bookingId: booking.id,
      bookingReference: booking.referenceNumber,
      propertyId: booking.propertyId,
      propertyTitle: booking.propertyTitle,
      reporterRole: isLandlord ? 'landlord' : 'student',
      reporterName: reporterName.trim() || 'Reporter',
      reporterEmail: reporterEmail.trim() || 'contact@lautech.edu.ng',
      reporterPhone: reporterPhone.trim() || undefined,
      reason,
      description: description.trim(),
    });
  };

  if (submittedRef) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl border border-slate-100">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900">Dispute Ticket Filed</h3>
            <p className="text-xs text-slate-500">
              CampusNest Trust & Support has received your complaint regarding Booking <strong>{booking.referenceNumber}</strong>.
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
            <span className="text-[11px] text-slate-500 block">Case Tracking Reference</span>
            <span className="text-sm font-black text-brand-600 font-mono tracking-wider">{submittedRef}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            A support officer will review this booking record and mediate with both parties within 24 hours.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-400/20 flex items-center justify-center text-rose-400">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400 block">
                Trust & Dispute Desk
              </span>
              <h3 className="text-base font-extrabold text-white">
                Report a Booking Problem
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-800">
          
          {/* Target Booking Info */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Associated Booking</span>
              <span className="font-mono text-[10px] font-black text-brand-600">{booking.referenceNumber}</span>
            </div>
            <p className="font-extrabold text-slate-900">{booking.propertyTitle}</p>
            <span className="text-[11px] text-slate-500 block">Host: {booking.landlordName}</span>
          </div>

          {/* Dispute Reason */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">
              What issue are you experiencing? <span className="text-rose-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as BookingDisputeReason)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {disputeReasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">
              Describe what happened in detail <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide specific dates, payment details if any, or communication attempts made..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 text-[11px]">Your Name</label>
              <input
                type="text"
                required
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 text-[11px]">Phone / WhatsApp</label>
              <input
                type="tel"
                value={reporterPhone}
                onChange={(e) => setReporterPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          {/* Fair Mediation Notice */}
          <div className="p-3 bg-slate-100 rounded-2xl text-[11px] text-slate-600 space-y-1">
            <span className="font-extrabold text-slate-800 block">CampusNest Mediation Guarantee</span>
            <p>
              CampusNest maintains an impartial record of all booking timestamps and communications. Submitting this dispute alerts the compliance team for immediate review.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
            >
              Submit Dispute Ticket
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
