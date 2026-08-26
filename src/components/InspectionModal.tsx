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
  ShieldCheck
} from 'lucide-react';
import { Property, InspectionType } from '../types/hostelEase';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface InspectionModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const InspectionModal: React.FC<InspectionModalProps> = ({
  property,
  isOpen,
  onClose,
  onSuccess
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
  const [studentPhone, setStudentPhone] = useState<string>(user?.phone || '');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setError('Please log in as a student to schedule an inspection.');
      return;
    }

    if (!preferredDate || !preferredTime) {
      setError('Please select your preferred date and time.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (preferredDate < todayStr) {
      setError('Inspection date cannot be in the past.');
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
        studentPhone: studentPhone.trim() || undefined,
        notes: notes.trim() || undefined
      });

      onSuccess(res.message);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit inspection request');
    } finally {
      setSubmitting(false);
    }
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
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inspection Form */}
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
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
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
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                  inspectionType === 'VIRTUAL'
                    ? 'bg-purple-50 border-purple-500 text-purple-950 ring-2 ring-purple-500/20 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Video className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-black">Virtual Tour</p>
                  <p className="text-[10px] text-slate-500 font-medium">Live video walkthrough via meeting link</p>
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
                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
              placeholder="e.g. +234 803 123 4567"
              value={studentPhone}
              onChange={(e) => setStudentPhone(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Used strictly for inspection logistics confirmation.
            </p>
          </div>

          {/* 5. Optional Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Specific Inquiries or Checks (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. I would like to inspect the 2-person room and test the water pump."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
            />
          </div>

          {/* Security Notice */}
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] leading-relaxed">
              <strong>Anti-Scam Protection:</strong> Never transfer caution fee or rent before attending a physical or virtual inspection.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Confirm Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
