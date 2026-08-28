import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Video, 
  Footprints, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  BedDouble,
  ShieldCheck,
  MessageCircle,
  MessageSquare,
  User
} from 'lucide-react';
import { Property, InspectionType } from '../types/hostelEase';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface InspectionModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onOpenConversation?: (propertyId: string) => void;
}

export const InspectionModal: React.FC<InspectionModalProps> = ({
  property,
  isOpen,
  onClose,
  onSuccess,
  onOpenConversation
}) => {
  const { user, isAuthenticated } = useAuth();

  const [inspectionType, setInspectionType] = useState<InspectionType>('PHYSICAL');
  const [preferredDate, setPreferredDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [preferredTime, setPreferredTime] = useState<string>('10:00 AM');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(property.rooms?.[0]?.id || '');
  const [studentName, setStudentName] = useState<string>(user?.fullName || '');
  const [studentPhone, setStudentPhone] = useState<string>(user?.phone || '');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [confirmedDetails, setConfirmedDetails] = useState<{
    id: string;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!preferredDate || !preferredTime) {
      setError('Please select your preferred date and time.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (preferredDate < todayStr) {
      setError('Inspection date cannot be in the past.');
      return;
    }

    if (!studentPhone && !user?.phone) {
      setError('Please provide a phone number for inspection confirmation.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.inspections.request(property.id, {
        inspectionType,
        preferredDate,
        preferredTime,
        roomId: selectedRoomId || undefined,
        studentPhone: studentPhone.trim() || user?.phone || undefined,
        notes: notes.trim() || undefined
      });

      const successMsg = res.message || `Inspection request submitted for ${property.title}.`;
      setConfirmedDetails({
        id: res.inspectionId || `insp-${Date.now()}`,
        message: successMsg
      });
      setConfirmed(true);
      onSuccess(successMsg);
    } catch (err: any) {
      setError(err.message || 'Failed to submit inspection request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenWhatsApp = () => {
    const rawPhone = property.provider?.phone || '08039876543';
    let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '234' + cleanPhone.substring(1);
    }
    const msg = encodeURIComponent(`Hello ${property.provider?.name || 'Landlord'}, I have scheduled a ${inspectionType.toLowerCase()} inspection for "${property.title}" on ${preferredDate} at ${preferredTime}. Looking forward to confirming!`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-600/20 text-emerald-400 rounded-2xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base">Schedule Hostel Inspection</h3>
              <p className="text-xs text-slate-300 line-clamp-1">{property.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Confirmed Screen */}
        {confirmed ? (
          <div className="p-6 text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/20">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-lg text-slate-900">Inspection Scheduled!</h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                {confirmedDetails?.message || 'Your inspection request has been submitted to the landlord.'}
              </p>
            </div>

            {/* Appointment Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Hostel:</span>
                <span className="font-bold text-slate-900">{property.title}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Mode:</span>
                <span className="font-black text-emerald-700 uppercase">{inspectionType} Inspection</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Date & Time:</span>
                <span className="font-bold text-slate-900">📅 {preferredDate} • {preferredTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Hostel Landlord:</span>
                <span className="font-bold text-slate-900">{property.provider?.name || 'Verified Landlord'}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Message Landlord on WhatsApp to Confirm</span>
              </button>

              {onOpenConversation && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenConversation(property.id);
                  }}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Open In-App Direct Chat with Landlord</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 text-slate-600 hover:bg-slate-100 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Done / Close
              </button>
            </div>
          </div>
        ) : (
          /* Inspection Form */
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Inspection Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Choose Inspection Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setInspectionType('PHYSICAL')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                    inspectionType === 'PHYSICAL'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Footprints className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-black">Physical Visit</p>
                    <p className="text-[10px] text-slate-500 font-medium">Walkthrough in person in Ogbomoso</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectionType('VIRTUAL')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                    inspectionType === 'VIRTUAL'
                      ? 'bg-purple-50 border-purple-500 text-purple-950 ring-2 ring-purple-500/20 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Video className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-black">Virtual Tour</p>
                    <p className="text-[10px] text-slate-500 font-medium">Live video walkthrough with Landlord</p>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Room Selection (if hostel has multiple rooms) */}
            {property.rooms && property.rooms.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Room / Space to Inspect
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  {property.rooms.map(room => (
                    <option key={room.id} value={room.id}>
                      {room.name || room.type.replace(/_/g, ' ')} ({room.quantityAvailable} available)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 3. Date & Time Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Preferred Date
                </label>
                <input
                  type="date"
                  value={preferredDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Preferred Time Slot
                </label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  {['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Student Contact Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Your Phone Number / WhatsApp
              </label>
              <input
                type="tel"
                placeholder="e.g. 0803 123 4567"
                value={studentPhone}
                onChange={(e) => setStudentPhone(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">
                The landlord will reach out on this number to confirm inspection logistics.
              </p>
            </div>

            {/* 5. Optional Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Specific Inquiries or Checks (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. I would like to inspect the ensuite bathroom and test the water pump."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium resize-none"
              />
            </div>

            {/* Security Notice */}
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] leading-relaxed">
                <strong>Anti-Scam Protection:</strong> Never transfer caution fee or rent before completing a verified inspection with the landlord.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Submitting...' : 'Confirm Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
