import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, X, Phone, MessageSquare, MapPin, 
  Calendar, FileText, ArrowRight, ShieldCheck, Download, ExternalLink, CheckSquare, Square
} from 'lucide-react';
import { api } from '../services/api';
import { MoveInChecklistData } from '../types/hostelEase';

interface BookingConfirmationModalProps {
  isOpen: boolean;
  bookingId: string;
  onClose: () => void;
  onViewVoucher?: (bookingId: string) => void;
  onOpenDispute?: (bookingId: string) => void;
}

export const BookingConfirmationModal: React.FC<BookingConfirmationModalProps> = ({
  isOpen,
  bookingId,
  onClose,
  onViewVoucher,
  onOpenDispute
}) => {
  const [checklistData, setChecklistData] = useState<MoveInChecklistData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !bookingId) return;

    setLoading(true);
    api.bookings.getMoveInChecklist(bookingId)
      .then(data => setChecklistData(data))
      .catch(err => console.error('Failed to load move-in checklist:', err))
      .finally(() => setLoading(false));
  }, [isOpen, bookingId]);

  if (!isOpen) return null;

  const toggleChecklistItem = async (key: string) => {
    if (!checklistData) return;
    const updated = {
      ...checklistData.checklist,
      [key]: !checklistData.checklist[key as keyof typeof checklistData.checklist]
    };

    setChecklistData(prev => prev ? { ...prev, checklist: updated } : null);
    try {
      await api.bookings.updateMoveInChecklist(bookingId, updated);
    } catch (e) {
      console.error('Failed to save checklist state:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Success Header Banner */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-xl shadow-emerald-950/20">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <span className="px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-full uppercase tracking-wider">
            Booking Confirmed & Payment Received ✓
          </span>

          <h2 className="text-3xl font-extrabold text-white mt-3">
            Your Accommodation is Secured!
          </h2>
          <p className="text-emerald-100 text-sm mt-1 max-w-md mx-auto">
            {checklistData?.propertyTitle || 'Your Hostel'} is officially booked for you. Your funds are held safely in escrow.
          </p>

          <div className="mt-5 inline-flex items-center gap-2 bg-emerald-900/60 border border-emerald-400/30 px-4 py-2 rounded-xl text-sm font-mono font-bold tracking-wide">
            <span>Booking Reference:</span>
            <span className="text-emerald-300">{checklistData?.bookingReference || 'HE-2026-CONFIRMED'}</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {/* Visual Progress Timeline */}
          <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50/50">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">
              Visual Progress Tracker
            </h4>
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold mb-1 shadow-sm">✓</div>
                <span className="font-semibold text-emerald-700">Created</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold mb-1 shadow-sm">✓</div>
                <span className="font-semibold text-emerald-700">Paid (Escrow)</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold mb-1 shadow-sm">✓</div>
                <span className="font-semibold text-emerald-700">Confirmed</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 border-2 border-emerald-600 flex items-center justify-center text-xs font-bold mb-1 shadow-sm">4</div>
                <span className="font-semibold text-gray-800">Check-in Tour</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold mb-1">5</div>
                <span className="text-gray-500">Move-In</span>
              </div>
            </div>
          </div>

          {/* Next Steps Guidance Card */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>What Happens Next?</span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              1. Your room/bedspace is reserved and locked from other students.<br />
              2. You can contact your landlord directly to arrange your key handover and move-in time.<br />
              3. Check the items on your Move-In Checklist below to ensure a smooth transition.
            </p>
          </div>

          {/* Move-In Interactive Checklist */}
          {checklistData && (
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                <span className="font-bold text-sm text-gray-900">Move-In Preparation Checklist</span>
                <span className="text-xs text-gray-500">Tap items to mark complete</span>
              </div>

              <div className="p-4 space-y-2.5 text-sm">
                {[
                  { key: 'confirmMoveInDate', label: `Confirm move-in date (${checklistData.moveInDate})` },
                  { key: 'saveVoucher', label: `Save digital booking voucher (${checklistData.bookingReference})` },
                  { key: 'contactLandlord', label: 'Contact landlord on WhatsApp for key pickup' },
                  { key: 'reviewHostelRules', label: 'Review hostel gate hours and rules' },
                  { key: 'prepareDocuments', label: 'Prepare student ID / admission letter copy' },
                  { key: 'confirmZeroOutstandingBalance', label: 'Confirm zero outstanding fee balance' },
                  { key: 'getDirections', label: 'Get exact campus gate landmarks & directions' }
                ].map(item => {
                  const isChecked = checklistData.checklist[item.key as keyof typeof checklistData.checklist];
                  return (
                    <div 
                      key={item.key}
                      onClick={() => toggleChecklistItem(item.key)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked ? 'bg-emerald-50/60 border-emerald-200 text-gray-900' : 'bg-gray-50/40 border-gray-200 text-gray-700 hover:bg-gray-100/50'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400 shrink-0" />
                      )}
                      <span className={`text-xs sm:text-sm font-medium ${isChecked ? 'line-through text-gray-500' : ''}`}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Communication Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {checklistData?.providerPhone && (
              <a
                href={`https://wa.me/234${checklistData.providerPhone.replace(/^0+/, '')}?text=Hello,%20I%20just%20booked%20on%20Hostel%20Ease!%20Ref:%20${encodeURIComponent(checklistData.bookingReference)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat Host on WhatsApp</span>
              </a>
            )}

            <button
              onClick={() => onViewVoucher && onViewVoucher(bookingId)}
              className="flex items-center justify-center gap-2 p-3.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-sm transition-colors shadow-sm"
            >
              <FileText className="w-4 h-4" />
              <span>View Official Voucher</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>Need to report a problem?</span>
          <button
            onClick={() => onOpenDispute && onOpenDispute(bookingId)}
            className="text-emerald-700 font-bold hover:underline"
          >
            Open Trust & Dispute Ticket
          </button>
        </div>
      </div>
    </div>
  );
};
