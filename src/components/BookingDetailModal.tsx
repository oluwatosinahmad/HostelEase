import React, { useState, useEffect } from 'react';
import { 
  X, 
  Receipt, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  MessageSquare, 
  User, 
  Phone, 
  Mail, 
  Building2, 
  Sparkles,
  Info,
  Download,
  Printer
} from 'lucide-react';
import { BookingDetail, BookingHistoryItem, BookingStatus } from '../types/hostelEase';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatNaira, formatDistance } from '../utils/formatters';

interface BookingDetailModalProps {
  bookingId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenConversation?: (propertyId: string) => void;
  onCancelBooking?: (bookingId: string) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({
  bookingId,
  isOpen,
  onClose,
  onOpenConversation,
  onCancelBooking,
  onShowToast
}) => {
  const { user } = useAuth();
  const [detail, setDetail] = useState<{ booking: BookingDetail; history: BookingHistoryItem[] } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen && bookingId) {
      setLoading(true);
      api.bookings.getById(bookingId)
        .then(res => {
          setDetail(res);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load booking detail:', err);
          onShowToast(err.message || 'Failed to load booking details', 'error');
          setLoading(false);
        });
    } else {
      setDetail(null);
    }
  }, [isOpen, bookingId]);

  if (!isOpen || !bookingId) return null;

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> CONFIRMED</span>;
      case 'PENDING':
        return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-600" /> PENDING CONFIRMATION</span>;
      case 'DECLINED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-rose-600" /> DECLINED</span>;
      case 'CANCELLED_BY_STUDENT':
      case 'CANCELLED_BY_PROVIDER':
        return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-slate-500" /> CANCELLED</span>;
      case 'EXPIRED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-800 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-purple-600" /> EXPIRED</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> COMPLETED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-emerald-950 text-white flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold flex-shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.2 rounded text-[9px] font-black bg-emerald-400 text-slate-950 uppercase tracking-wider">
                  Hostel Ease Voucher
                </span>
                <span className="text-[10px] text-slate-300">Phase 5 Reservation</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white truncate">
                {detail?.booking.bookingReference || 'Booking Voucher'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {loading || !detail ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-bold">Loading reservation voucher...</p>
            </div>
          ) : (
            <>
              {/* Top Reference & Status Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Official Booking Reference
                  </p>
                  <h3 className="text-lg font-mono font-black text-slate-900">
                    {detail.booking.bookingReference}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Booked on {new Date(detail.booking.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  {getStatusBadge(detail.booking.status)}
                </div>
              </div>

              {/* Status Advisory Banner */}
              {detail.booking.status === 'CONFIRMED' && (
                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
                  <div className="font-black flex items-center gap-1.5 text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Reservation Confirmed by Landlord!
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Your space has been locked. In Phase 6, secure online payment will be completed. Contact the landlord directly to prepare for move-in.
                  </p>
                </div>
              )}

              {detail.booking.status === 'PENDING' && (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-1">
                  <div className="font-black flex items-center gap-1.5 text-amber-900">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Awaiting Landlord Confirmation
                  </div>
                  <p className="text-[11px] text-amber-800">
                    The accommodation provider has 48 hours to confirm this reservation. If unresponded by {new Date(detail.booking.expiresAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}, the hold will expire.
                  </p>
                </div>
              )}

              {/* Accommodation Information */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  Accommodation Details
                </h4>

                <div className="flex items-center gap-3">
                  <img
                    src={detail.booking.property.coverImage}
                    alt={detail.booking.property.title}
                    className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 bg-slate-100"
                  />
                  <div className="min-w-0">
                    <h5 className="font-black text-sm text-slate-900 truncate">
                      {detail.booking.property.title}
                    </h5>
                    <p className="text-xs text-slate-600 truncate">
                      📍 {detail.booking.property.areaName} ({formatDistance(detail.booking.property.distanceFromCampusKm)} from Main Gate)
                    </p>
                    <p className="text-xs font-bold text-emerald-800 pt-0.5">
                      🛏️ {detail.booking.room.name} {detail.booking.bedspace ? `• Bedspace ${detail.booking.bedspace.number}` : ''}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold">Move-in Date</span>
                    <p className="font-black text-slate-800">{detail.booking.moveInDate}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold">Academic Session</span>
                    <p className="font-black text-slate-800">{detail.booking.academicSession} (12 Months)</p>
                  </div>
                </div>
              </div>

              {/* Participants & Contacts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Student Info */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Student Details
                  </span>
                  <p className="font-black text-slate-900">{detail.booking.student.name}</p>
                  <p className="text-slate-600">{detail.booking.student.email}</p>
                  {detail.booking.student.phone && (
                    <p className="text-slate-700 font-bold">{detail.booking.student.phone}</p>
                  )}
                </div>

                {/* Provider Info */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Accommodation Provider
                  </span>
                  <p className="font-black text-slate-900">{detail.booking.provider.name}</p>
                  <p className="text-slate-600">{detail.booking.provider.email}</p>
                  {detail.booking.provider.phone && (
                    <p className="text-slate-700 font-bold">{detail.booking.provider.phone}</p>
                  )}
                </div>
              </div>

              {/* 100% Disclosed Pricing Breakdown */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
                    Transparent Pricing Summary
                  </span>
                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded">
                    100% DISCLOSED
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-700">
                  <span>Annual Rent</span>
                  <span className="font-black text-slate-900">{formatNaira(detail.booking.pricing.rentAmount)}</span>
                </div>

                {detail.booking.pricing.serviceCharge > 0 && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Service Charge</span>
                    <span className="font-semibold text-slate-800">{formatNaira(detail.booking.pricing.serviceCharge)}</span>
                  </div>
                )}

                {detail.booking.pricing.agencyFee > 0 && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Agreement / Agency Fee</span>
                    <span className="font-semibold text-slate-800">{formatNaira(detail.booking.pricing.agencyFee)}</span>
                  </div>
                )}

                {detail.booking.pricing.cautionDeposit > 0 && (
                  <div className="flex justify-between items-center text-emerald-800 bg-emerald-50 p-2 rounded-xl border border-emerald-200 font-medium">
                    <span>Refundable Caution Deposit</span>
                    <span className="font-black">{formatNaira(detail.booking.pricing.cautionDeposit)}</span>
                  </div>
                )}

                {detail.booking.pricing.otherCharges > 0 && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Sanitation & Security Levy</span>
                    <span className="font-semibold text-slate-800">{formatNaira(detail.booking.pricing.otherCharges)}</span>
                  </div>
                )}

                <div className="pt-3 border-t-2 border-dashed border-slate-200 flex justify-between items-baseline">
                  <div>
                    <span className="font-black text-slate-900 uppercase text-xs">Total First Year Cost</span>
                    <p className="text-[10px] text-slate-400">Total estimated payment upon lease finalization</p>
                  </div>
                  <span className="text-xl font-black text-emerald-700">
                    {formatNaira(detail.booking.pricing.totalCost)}
                  </span>
                </div>
              </div>

              {/* Status History Timeline */}
              {detail.history && detail.history.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider">
                    Reservation Audit Timeline
                  </h4>

                  <div className="space-y-2">
                    {detail.history.map((h, idx) => (
                      <div key={h.id || idx} className="flex items-start gap-2.5 text-xs">
                        <div className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800">
                            Status changed to <span className="text-emerald-700">{h.newStatus}</span> by {h.actorName} ({h.actorRole})
                          </p>
                          {h.notes && <p className="text-[11px] text-slate-500">{h.notes}</p>}
                          {h.reason && <p className="text-[11px] text-rose-600">Reason: {h.reason}</p>}
                        </div>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  {onOpenConversation && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenConversation(detail.booking.property.id);
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      Chat Landlord
                    </button>
                  )}

                  {['PENDING', 'CONFIRMED'].includes(detail.booking.status) && onCancelBooking && (
                    <button
                      onClick={() => onCancelBooking(detail.booking.id)}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors"
                    >
                      Cancel Reservation
                    </button>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors ml-auto"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
