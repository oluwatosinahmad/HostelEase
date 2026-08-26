import React, { useState, useEffect } from 'react';
import { 
  X, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, 
  CreditCard, MapPin, Building, Calendar, Info, Sparkles 
} from 'lucide-react';
import { api } from '../services/api';
import { BookingReviewData } from '../types/hostelEase';

interface BookingReviewModalProps {
  isOpen: boolean;
  bookingId: string;
  onClose: () => void;
  onProceedToPayment: (bookingId: string, optionalFeeIds: string[]) => void;
}

export const BookingReviewModal: React.FC<BookingReviewModalProps> = ({
  isOpen,
  bookingId,
  onClose,
  onProceedToPayment
}) => {
  const [data, setData] = useState<BookingReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptionalIds, setSelectedOptionalIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen || !bookingId) return;

    setLoading(true);
    setError(null);
    api.bookings.getReview(bookingId)
      .then(res => {
        setData(res);
      })
      .catch(err => {
        setError(err.message || 'Failed to load booking review breakdown');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, bookingId]);

  if (!isOpen) return null;

  const toggleOptional = (id: string) => {
    setSelectedOptionalIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const optionalTotal = (data?.priceBreakdown.optionalCharges || [])
    .filter(opt => selectedOptionalIds.includes(opt.id))
    .reduce((sum, opt) => sum + opt.amount, 0);

  const grandTotal = (data?.priceBreakdown.totalAmount || 0) + optionalTotal;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white p-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-emerald-200 text-sm font-semibold tracking-wider uppercase mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Transparent Booking Review • No Hidden Fees</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Review Your Accommodation Details</h2>
          <p className="text-emerald-100 text-sm mt-1">
            Carefully verify your room, pricing breakdown, and terms before proceeding to secure payment.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 font-medium">Calculating itemized price breakdown...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : data ? (
            <>
              {/* Hostel & Room Summary Card */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row gap-4 items-start">
                <img 
                  src={data.hostel.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'} 
                  alt={data.hostel.title}
                  className="w-full sm:w-28 h-24 object-cover rounded-lg shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                      Ref: {data.bookingReference}
                    </span>
                    {data.hostel.isVerified && (
                      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        Verified Hostel
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mt-1 truncate">{data.hostel.title}</h3>
                  <p className="text-gray-600 text-sm flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    {data.hostel.address} ({data.hostel.distanceFromCampusKm} km from LAUTECH Gate)
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="px-2.5 py-1 bg-white border border-gray-200 rounded-md font-medium text-gray-700">
                      🛏️ {data.room.name} ({data.room.bedspace})
                    </span>
                    <span className="px-2.5 py-1 bg-white border border-gray-200 rounded-md font-medium text-gray-700">
                      📅 Move-in: {data.moveInDate}
                    </span>
                    <span className="px-2.5 py-1 bg-white border border-gray-200 rounded-md font-medium text-gray-700">
                      🎓 Session: {data.academicSession}
                    </span>
                  </div>
                </div>
              </div>

              {/* Provider Trust Card */}
              <div className="flex items-center justify-between p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-sm">
                    {data.provider.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-gray-900 text-sm">{data.provider.name}</span>
                      {data.provider.isVerified && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 capitalize">
                      {data.provider.managementType.replace('_', ' ').toLowerCase()} • Responsive on WhatsApp
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <span>Funds held safely in escrow</span>
                </div>
              </div>

              {/* Itemized Price Breakdown */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-bold text-gray-800 text-sm flex items-center justify-between">
                  <span>Itemized Fee Breakdown</span>
                  <span className="text-xs text-gray-500 font-normal">Standard 1-Year Academic Stay</span>
                </div>

                <div className="p-4 space-y-3 text-sm">
                  <div className="flex justify-between items-center text-gray-700">
                    <div>
                      <p className="font-medium text-gray-900">Room Base Rent</p>
                      <p className="text-xs text-gray-500">Annual accommodation fee payable to landlord</p>
                    </div>
                    <span className="font-bold text-gray-900">₦{data.priceBreakdown.baseRent.toLocaleString()}</span>
                  </div>

                  {data.priceBreakdown.serviceCharge > 0 && (
                    <div className="flex justify-between items-center text-gray-700">
                      <div>
                        <p className="font-medium text-gray-900">Mandatory Service Charge</p>
                        <p className="text-xs text-gray-500">Borehole pumping, security gate guard, waste disposal</p>
                      </div>
                      <span className="font-semibold text-gray-800">₦{data.priceBreakdown.serviceCharge.toLocaleString()}</span>
                    </div>
                  )}

                  {data.priceBreakdown.cautionDeposit > 0 && (
                    <div className="flex justify-between items-center text-gray-700">
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="font-medium text-gray-900">Caution Deposit</p>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">Refundable</span>
                        </div>
                        <p className="text-xs text-gray-500">Held in escrow and refunded upon move-out inspection</p>
                      </div>
                      <span className="font-semibold text-gray-800">₦{data.priceBreakdown.cautionDeposit.toLocaleString()}</span>
                    </div>
                  )}

                  {data.priceBreakdown.agencyFee > 0 && (
                    <div className="flex justify-between items-center text-gray-700">
                      <div>
                        <p className="font-medium text-gray-900">Legal Agreement & Caretaker Fee</p>
                        <p className="text-xs text-gray-500">Tenancy agreement stamping and documentation</p>
                      </div>
                      <span className="font-semibold text-gray-800">₦{data.priceBreakdown.agencyFee.toLocaleString()}</span>
                    </div>
                  )}

                  {data.priceBreakdown.platformFee > 0 && (
                    <div className="flex justify-between items-center text-gray-700">
                      <div>
                        <p className="font-medium text-gray-900">Hostel Ease Platform Fee</p>
                        <p className="text-xs text-gray-500">Anti-scam payment protection, 24/7 student support & escrow security</p>
                      </div>
                      <span className="font-semibold text-gray-800">₦{data.priceBreakdown.platformFee.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Optional Fees Section */}
                  {data.priceBreakdown.optionalCharges && data.priceBreakdown.optionalCharges.length > 0 && (
                    <div className="pt-3 border-t border-gray-100 space-y-2">
                      <div className="flex items-center gap-1 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Optional Move-In Add-Ons (Unselected by default)</span>
                      </div>
                      {data.priceBreakdown.optionalCharges.map(opt => {
                        const isChecked = selectedOptionalIds.includes(opt.id);
                        return (
                          <label 
                            key={opt.id}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                              isChecked ? 'bg-emerald-50/70 border-emerald-300' : 'bg-gray-50/50 border-gray-200 hover:bg-gray-100/60'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleOptional(opt.id)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 cursor-pointer"
                              />
                              <span className="text-sm font-medium text-gray-800">{opt.title}</span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">+₦{opt.amount.toLocaleString()}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Total Card */}
                  <div className="pt-3 border-t border-gray-200 flex justify-between items-center text-base">
                    <div>
                      <span className="font-bold text-gray-900">Total Payable Amount</span>
                      <p className="text-xs text-emerald-700 font-medium">Guaranteed price lock • No unexpected surprise fees</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-extrabold text-emerald-700">₦{grandTotal.toLocaleString()}</span>
                      <p className="text-[11px] text-gray-500">Payable securely via Paystack</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cancellation Policy Box */}
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <p className="font-bold text-amber-950">Transparent Cancellation Policy</p>
                  <p>{data.cancellationPolicy.summary}</p>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors text-sm"
          >
            Cancel & Return
          </button>

          <button
            type="button"
            disabled={loading || !data}
            onClick={() => data && onProceedToPayment(data.bookingId, selectedOptionalIds)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4" />
            <span>Continue to Secure Payment (₦{grandTotal.toLocaleString()})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
