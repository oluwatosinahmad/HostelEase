import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  GraduationCap, 
  FileText, 
  Sparkles,
  Info,
  ChevronRight
} from 'lucide-react';
import { Property, UserProfile } from '../types';
import { formatNaira } from '../utils/formatters';

interface BookingRequestModalProps {
  property: Property;
  currentUser: UserProfile | null;
  onClose: () => void;
  onSubmitBooking: (bookingData: {
    moveInDate: string;
    durationMonths: number;
    durationLabel: string;
    studentMessage?: string;
    studentPhone: string;
    studentWhatsapp?: string;
    studentMatricNumber?: string;
    studentDepartment?: string;
    studentLevel?: string;
  }) => void;
  onOpenAuthModal?: () => void;
}

export const BookingRequestModal: React.FC<BookingRequestModalProps> = ({
  property,
  currentUser,
  onClose,
  onSubmitBooking,
  onOpenAuthModal,
}) => {
  // Move-in date default (14 days from now)
  const defaultMoveIn = new Date();
  defaultMoveIn.setDate(defaultMoveIn.getDate() + 14);
  const defaultDateStr = defaultMoveIn.toISOString().split('T')[0];

  const [moveInDate, setMoveInDate] = useState(defaultDateStr);
  const [durationMonths, setDurationMonths] = useState(12);
  const [studentPhone, setStudentPhone] = useState(currentUser?.phone || '');
  const [studentWhatsapp, setStudentWhatsapp] = useState(currentUser?.whatsapp || currentUser?.phone || '');
  const [matricNumber, setMatricNumber] = useState(currentUser?.matricNumber || '');
  const [department, setDepartment] = useState(currentUser?.department || '');
  const [level, setLevel] = useState('300 Level');
  const [studentMessage, setStudentMessage] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [acknowledgedDisclaimer, setAcknowledgedDisclaimer] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Duration label lookup
  const getDurationLabel = (months: number) => {
    if (months === 6) return '1 Semester (6 Months)';
    if (months === 24) return '2 Academic Sessions (24 Months)';
    return '1 Academic Session (12 Months)';
  };

  // Financial calculations
  const rent = property.fees.annualRent || property.fees.rentPerYear || 0;
  const agency = property.fees.agencyFee || 0;
  const agreement = property.fees.agreementFee || 0;
  const service = property.fees.serviceCharge || 0;
  const caution = property.fees.cautionFee || 0;
  const platformFee = 0; // Phase 6 Zero Fee Foundation
  const totalAmount = rent + agency + agreement + service + caution + platformFee;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    if (!moveInDate) {
      setFormError('Please choose your preferred move-in date.');
      return;
    }

    if (!studentPhone.trim()) {
      setFormError('Please provide your phone number so the landlord can reach you.');
      return;
    }

    if (!agreedToTerms || !acknowledgedDisclaimer) {
      setFormError('Please review and check both agreement boxes before submitting.');
      return;
    }

    onSubmitBooking({
      moveInDate,
      durationMonths,
      durationLabel: getDurationLabel(durationMonths),
      studentMessage: studentMessage.trim() || undefined,
      studentPhone: studentPhone.trim(),
      studentWhatsapp: studentWhatsapp.trim() || undefined,
      studentMatricNumber: matricNumber.trim() || undefined,
      studentDepartment: department.trim() || undefined,
      studentLevel: level,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-brand-900 p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-amber-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                  Step 1 of 3: Reservation Request
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/20">
                  No Immediate Payment Required
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-white">
                Reserve Accommodation
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          
          {/* Property Mini-Card */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-4">
            <img
              src={property.coverImage}
              alt={property.title}
              className="w-20 h-20 rounded-xl object-cover shrink-0 border border-slate-200"
            />
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase">{property.zoneName}</span>
                {property.verificationStatus === 'VERIFIED' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Verified
                  </span>
                )}
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 truncate">{property.title}</h4>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-lg font-black text-brand-600">{formatNaira(property.fees.annualRent || property.fees.rentPerYear || 0)}</span>
                <span className="text-xs font-semibold text-slate-500">/ academic session</span>
              </div>
            </div>
          </div>

          {/* Transparent Itemized Financials */}
          <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Transparent Itemized Fees (CampusNest Policy)</span>
              </h4>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                Zero Hidden Charges
              </span>
            </div>

            <div className="space-y-2 text-xs divide-y divide-amber-200/40">
              <div className="flex justify-between pt-1">
                <span className="text-slate-600">Base Annual Rent</span>
                <span className="font-bold text-slate-900">{formatNaira(rent)}</span>
              </div>
              {agency > 0 && (
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">Agency / Caretaker Fee</span>
                  <span className="font-bold text-slate-900">{formatNaira(agency)}</span>
                </div>
              )}
              {agreement > 0 && (
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">Tenancy Legal Agreement Fee</span>
                  <span className="font-bold text-slate-900">{formatNaira(agreement)}</span>
                </div>
              )}
              {service > 0 && (
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">Compound Service Charge (Water/Clean)</span>
                  <span className="font-bold text-slate-900">{formatNaira(service)}</span>
                </div>
              )}
              {caution > 0 && (
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">Refundable Caution Deposit</span>
                  <span className="font-bold text-slate-900">{formatNaira(caution)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1">
                <span className="text-slate-600 flex items-center gap-1">
                  <span>CampusNest Platform Fee</span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">FREE</span>
                </span>
                <span className="font-bold text-emerald-700">₦0 (Launch Offer)</span>
              </div>
              <div className="flex justify-between pt-2 text-sm">
                <span className="font-black text-slate-900">Total Move-in Commitment</span>
                <span className="font-black text-brand-700 text-base">{formatNaira(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Reservation Duration & Move-In Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Preferred Move-in Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Duration of Stay <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value={12}>1 Academic Session (12 Months)</option>
                  <option value={6}>1 Semester (6 Months)</option>
                  <option value={24}>2 Academic Sessions (24 Months)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Student Profile & Contact Confirmation */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-600" />
              <span>Student Details for Landlord Evaluation</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block font-semibold">Full Name</span>
                <span className="font-bold text-slate-800">{currentUser?.name || 'Guest Student'}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block font-semibold">LAUTECH Email</span>
                <span className="font-bold text-slate-800">{currentUser?.email || 'N/A'}</span>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 font-semibold mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  placeholder="08012345678"
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 font-semibold mb-1">
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={studentWhatsapp}
                  onChange={(e) => setStudentWhatsapp(e.target.value)}
                  placeholder="08012345678"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 font-semibold mb-1">
                  Matric Number (Optional)
                </label>
                <input
                  type="text"
                  value={matricNumber}
                  onChange={(e) => setMatricNumber(e.target.value)}
                  placeholder="e.g. 19/40EC/0042"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 font-semibold mb-1">
                  Academic Level
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-brand-500"
                >
                  <option value="100 Level">100 Level (Freshman)</option>
                  <option value="200 Level">200 Level</option>
                  <option value="300 Level">300 Level</option>
                  <option value="400 Level">400 Level</option>
                  <option value="500 Level">500 Level (Finalist)</option>
                  <option value="Postgraduate">Postgraduate</option>
                </select>
              </div>
            </div>
          </div>

          {/* Optional Message */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Optional Note for the Landlord / Host
            </label>
            <textarea
              rows={2}
              value={studentMessage}
              onChange={(e) => setStudentMessage(e.target.value)}
              placeholder="e.g., Hi Alhaji, I am a 300L computer engineering student. I prefer a quiet room on the upper floor..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {/* Crucial Acknowledgments & Disclaimers */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start space-x-3 p-3 bg-slate-100 rounded-2xl border border-slate-200">
              <input
                type="checkbox"
                id="disclaimer-check"
                checked={acknowledgedDisclaimer}
                onChange={(e) => setAcknowledgedDisclaimer(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
              <label htmlFor="disclaimer-check" className="text-xs font-semibold text-slate-700 cursor-pointer">
                I understand that submitting this request does <strong>NOT automatically guarantee</strong> the property. The landlord must review and accept before payment is due.
              </label>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-slate-100 rounded-2xl border border-slate-200">
              <input
                type="checkbox"
                id="terms-check"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
              <label htmlFor="terms-check" className="text-xs font-semibold text-slate-700 cursor-pointer">
                I agree to the <strong>CampusNest Student Booking Terms</strong> and physical verification checklist prior to final key handover.
              </label>
            </div>
          </div>

          {formError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!agreedToTerms || !acknowledgedDisclaimer}
              className="w-full sm:w-auto px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <span>Submit Booking Request</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
