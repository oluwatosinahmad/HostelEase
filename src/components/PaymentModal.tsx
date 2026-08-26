import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  X, 
  AlertCircle, 
  Clock, 
  Building2, 
  Sparkles, 
  FileText, 
  ArrowRight,
  RefreshCw,
  HelpCircle,
  QrCode
} from 'lucide-react';
import { BookingItem, BookingDetail, PaymentReceipt as IPaymentReceipt } from '../types/hostelEase';
import { api } from '../services/api';
import { formatNaira } from '../utils/formatters';
import { PaymentReceiptModal } from './PaymentReceiptModal';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingItem | BookingDetail | null;
  onPaymentSuccess?: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  booking,
  onPaymentSuccess,
  onShowToast
}) => {
  const [platformFee, setPlatformFee] = useState<number>(2500);
  const [selectedMethod, setSelectedMethod] = useState<'CARD' | 'BANK_TRANSFER' | 'USSD'>('CARD');
  const [selectedProvider, setSelectedProvider] = useState<'TEST_GATEWAY' | 'PAYSTACK' | 'FLUTTERWAVE'>('TEST_GATEWAY');
  
  const [loading, setLoading] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [verifiedReceipt, setVerifiedReceipt] = useState<IPaymentReceipt | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [activePaymentRef, setActivePaymentRef] = useState<string>('');

  // Fetch platform fee config on mount
  useEffect(() => {
    if (isOpen) {
      api.payments.getPlatformFee()
        .then(res => setPlatformFee(res.feeAmount || 2500))
        .catch(() => setPlatformFee(2500));
      
      setPaymentSuccess(false);
      setVerifiedReceipt(null);
      setActivePaymentRef('');
    }
  }, [isOpen]);

  if (!isOpen || !booking) return null;

  const bookingTotal = 'totalCost' in booking ? booking.totalCost : ('pricing' in booking ? (booking as any).pricing.totalCost : 0);
  const rentAmount = 'rentAmount' in booking ? booking.rentAmount : ('pricing' in booking ? (booking as any).pricing.rentAmount : 0);
  const serviceCharge = 'serviceCharge' in booking ? booking.serviceCharge : ('pricing' in booking ? (booking as any).pricing.serviceCharge : 0);
  const agencyFee = 'agencyFee' in booking ? booking.agencyFee : ('pricing' in booking ? (booking as any).pricing.agencyFee : 0);
  const cautionDeposit = 'cautionDeposit' in booking ? booking.cautionDeposit : ('pricing' in booking ? (booking as any).pricing.cautionDeposit : 0);
  const otherCharges = 'otherCharges' in booking ? booking.otherCharges : ('pricing' in booking ? (booking as any).pricing.otherCharges : 0);
  
  const totalWithPlatformFee = bookingTotal + platformFee;

  const propertyTitle = 'propertyTitle' in booking ? booking.propertyTitle : ('property' in booking ? (booking as any).property.title : 'Hostel');
  const propertyAddress = 'propertyAddress' in booking ? booking.propertyAddress : ('property' in booking ? (booking as any).property.address : '');
  const roomName = 'roomName' in booking ? booking.roomName : ('room' in booking ? (booking as any).room.name : 'Room');
  const bedspaceNumber = 'bedspaceNumber' in booking ? booking.bedspaceNumber : ('bedspace' in booking ? (booking as any).bedspace?.number : null);

  const handleInitiatePayment = async () => {
    setLoading(true);
    try {
      // 1. Initialize Payment on Backend
      const initRes = await api.payments.initialize({
        bookingId: booking.id,
        paymentProvider: selectedProvider,
        paymentMethod: selectedMethod
      });

      setActivePaymentRef(initRes.paymentReference);

      // 2. Perform Verification (Simulated Gateway Sandbox Flow or External Redirect)
      setVerifying(true);
      
      // Simulate gateway authorization time (1.5s for seamless interactive experience)
      setTimeout(async () => {
        try {
          const verifyRes = await api.payments.verify(initRes.paymentReference);
          if (verifyRes.success) {
            setPaymentSuccess(true);
            setVerifying(false);
            setLoading(false);
            onShowToast('Payment completed and verified successfully! 🎉', 'success');
            
            // Fetch official receipt
            api.payments.getReceipt(initRes.paymentReference)
              .then(rRes => setVerifiedReceipt(rRes.receipt))
              .catch(err => console.error('Failed to load receipt:', err));

            if (onPaymentSuccess) {
              onPaymentSuccess();
            }
          } else {
            setVerifying(false);
            setLoading(false);
            onShowToast('Payment verification failed. Please try again.', 'error');
          }
        } catch (vErr: any) {
          setVerifying(false);
          setLoading(false);
          onShowToast(vErr.message || 'Payment verification encountered an issue', 'error');
        }
      }, 1600);

    } catch (err: any) {
      console.error('Payment initialization error:', err);
      setLoading(false);
      setVerifying(false);
      onShowToast(err.message || 'Failed to initialize payment checkout', 'error');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 p-6 text-white relative">
            <button
              onClick={onClose}
              disabled={loading || verifying}
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Hostel Ease Secure Escrow & Checkout</span>
            </div>
            <h2 className="text-xl font-bold text-white">
              {paymentSuccess ? 'Payment Confirmed! 🎉' : 'Complete Space Reservation'}
            </h2>
            <p className="text-emerald-100 text-xs mt-1">
              {paymentSuccess 
                ? 'Your accommodation reservation is 100% paid and confirmed.' 
                : 'Zero hidden fees. Bank-grade 256-bit encryption for LAUTECH students.'}
            </p>
          </div>

          {/* Modal Content */}
          <div className="p-6 space-y-6">

            {paymentSuccess ? (
              // Success Screen
              <div className="text-center py-4 space-y-5">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner ring-8 ring-emerald-50">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">₦{Number(totalWithPlatformFee).toLocaleString()} Paid Successfully</h3>
                  <p className="text-slate-500 text-sm mt-1">
                    Booking Reference: <span className="font-mono font-semibold text-slate-700">{booking.bookingReference}</span>
                  </p>
                  <p className="text-slate-500 text-sm">
                    Payment Reference: <span className="font-mono font-semibold text-emerald-700">{activePaymentRef}</span>
                  </p>
                </div>

                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 text-left text-xs text-emerald-800 space-y-2">
                  <div className="flex items-center space-x-2 font-semibold">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Your Bedspace is Officially Secured</span>
                  </div>
                  <p>
                    The landlord has been notified of your payment. You can now download your official digital receipt voucher and present it on move-in day.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => setShowReceiptModal(true)}
                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View Digital Receipt</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
                  >
                    Done / Back to Bookings
                  </button>
                </div>
              </div>
            ) : (
              // Checkout & Breakdown Screen
              <>
                {/* Accommodation Summary Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-bold text-slate-800 text-sm">{propertyTitle}</h4>
                    </div>
                    <p className="text-xs text-slate-500">{propertyAddress}</p>
                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium">
                        {roomName}
                      </span>
                      {bedspaceNumber && (
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">
                          Space: {bedspaceNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Ref Code</span>
                    <p className="font-mono text-xs font-bold text-slate-700">{booking.bookingReference}</p>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100/70 px-4 py-2.5 border-b border-slate-200 text-xs font-semibold text-slate-700 flex justify-between items-center">
                    <span>100% Disclosed Fee Breakdown</span>
                    <span className="text-emerald-700 font-bold">Annual Total</span>
                  </div>
                  <div className="p-4 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Annual Accommodation Rent</span>
                      <span className="font-semibold text-slate-800">{formatNaira(rentAmount)}</span>
                    </div>
                    {serviceCharge > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Estate / Utility Service Charge</span>
                        <span className="font-semibold text-slate-800">{formatNaira(serviceCharge)}</span>
                      </div>
                    )}
                    {agencyFee > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Legal & Tenancy Agreement</span>
                        <span className="font-semibold text-slate-800">{formatNaira(agencyFee)}</span>
                      </div>
                    )}
                    {cautionDeposit > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Refundable Caution Deposit</span>
                        <span className="font-semibold text-emerald-700">{formatNaira(cautionDeposit)}</span>
                      </div>
                    )}
                    {otherCharges > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Other Disclosed Mandatory Fees</span>
                        <span className="font-semibold text-slate-800">{formatNaira(otherCharges)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600 pt-1 border-t border-dashed border-slate-200">
                      <span className="flex items-center gap-1">
                        <span>Platform Escrow & Security Fee</span>
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-1 rounded">Protection</span>
                      </span>
                      <span className="font-semibold text-slate-800">{formatNaira(platformFee)}</span>
                    </div>

                    <div className="flex justify-between items-center text-base font-bold text-slate-900 pt-3 border-t border-slate-200">
                      <span>Total Amount Payable</span>
                      <span className="text-emerald-700 text-lg">{formatNaira(totalWithPlatformFee)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Gateway & Method Selection */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('CARD')}
                      className={`p-3 border rounded-xl flex flex-col items-center justify-center space-y-1.5 transition-all text-xs font-medium ${
                        selectedMethod === 'CARD'
                          ? 'border-emerald-600 bg-emerald-50/50 text-emerald-800 ring-2 ring-emerald-600/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-emerald-600" />
                      <span>ATM Card</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedMethod('BANK_TRANSFER')}
                      className={`p-3 border rounded-xl flex flex-col items-center justify-center space-y-1.5 transition-all text-xs font-medium ${
                        selectedMethod === 'BANK_TRANSFER'
                          ? 'border-emerald-600 bg-emerald-50/50 text-emerald-800 ring-2 ring-emerald-600/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Building2 className="w-5 h-5 text-emerald-600" />
                      <span>Bank Transfer</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedMethod('USSD')}
                      className={`p-3 border rounded-xl flex flex-col items-center justify-center space-y-1.5 transition-all text-xs font-medium ${
                        selectedMethod === 'USSD'
                          ? 'border-emerald-600 bg-emerald-50/50 text-emerald-800 ring-2 ring-emerald-600/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <QrCode className="w-5 h-5 text-emerald-600" />
                      <span>USSD Code</span>
                    </button>
                  </div>

                  {/* Payment Gateway Selector */}
                  <div className="flex items-center justify-between text-xs pt-1 px-1 text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Processor:</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedProvider('TEST_GATEWAY')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${
                          selectedProvider === 'TEST_GATEWAY' 
                            ? 'bg-emerald-600 text-white border-emerald-600' 
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        ⚡ Instant Sandbox
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedProvider('PAYSTACK')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${
                          selectedProvider === 'PAYSTACK' 
                            ? 'bg-emerald-600 text-white border-emerald-600' 
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        Paystack
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedProvider('FLUTTERWAVE')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${
                          selectedProvider === 'FLUTTERWAVE' 
                            ? 'bg-emerald-600 text-white border-emerald-600' 
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        Flutterwave
                      </button>
                    </div>
                  </div>
                </div>

                {/* Submit Payment CTA */}
                <div className="pt-2">
                  <button
                    onClick={handleInitiatePayment}
                    disabled={loading || verifying}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
                  >
                    {verifying ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Verifying with Payment Gateway...</span>
                      </>
                    ) : loading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Initializing Secure Payment...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Pay {formatNaira(totalWithPlatformFee)} Now</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </button>
                  <p className="text-center text-[11px] text-slate-400 mt-2 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Protected by Hostel Ease Student Escrow. Instant receipt issued upon confirmation.</span>
                  </p>
                </div>
              </>
            )}

          </div>

        </div>
      </div>

      {/* Digital Receipt Modal */}
      {showReceiptModal && (
        <PaymentReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          receipt={verifiedReceipt}
          paymentReference={activePaymentRef}
        />
      )}
    </>
  );
};
