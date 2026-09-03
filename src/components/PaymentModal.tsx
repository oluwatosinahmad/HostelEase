import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  X, 
  AlertCircle, 
  Building2, 
  Sparkles, 
  FileText, 
  ArrowRight,
  RefreshCw,
  QrCode,
  ExternalLink
} from 'lucide-react';
import { BookingItem, BookingDetail, PaymentReceipt as IPaymentReceipt } from '../types/hostelEase';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatNaira } from '../utils/formatters';
import { PaymentReceiptModal } from './PaymentReceiptModal';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingItem | BookingDetail | null;
  onPaymentSuccess?: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

// Dynamically load the official Paystack Inline script
function loadPaystackScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).PaystackPop) {
      resolve(true);
      return;
    }
    const existing = document.getElementById('paystack-inline-js');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.id = 'paystack-inline-js';
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  booking,
  onPaymentSuccess,
  onShowToast
}) => {
  const { user } = useAuth();

  const [selectedMethod, setSelectedMethod] = useState<'CARD' | 'BANK_TRANSFER' | 'USSD'>('CARD');
  
  const [loading, setLoading] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [verifiedReceipt, setVerifiedReceipt] = useState<IPaymentReceipt | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [activePaymentRef, setActivePaymentRef] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPaymentSuccess(false);
      setVerifiedReceipt(null);
      setActivePaymentRef('');
      setPaymentError(null);
      setCheckoutUrl(null);
      setLoading(false);
      setVerifying(false);
      // Pre-fetch Paystack SDK
      loadPaystackScript().catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen || !booking) return null;

  // Accommodation Pricing Source of Truth
  const bookingTotal = 'totalCost' in booking ? Number(booking.totalCost) : ('pricing' in booking ? Number((booking as any).pricing.totalCost) : 0);
  const rentAmount = 'rentAmount' in booking ? Number(booking.rentAmount) : ('pricing' in booking ? Number((booking as any).pricing.rentAmount) : 0);
  const serviceCharge = 'serviceCharge' in booking ? Number(booking.serviceCharge) : ('pricing' in booking ? Number((booking as any).pricing.serviceCharge) : 0);
  const agencyFee = 'agencyFee' in booking ? Number(booking.agencyFee) : ('pricing' in booking ? Number((booking as any).pricing.agencyFee) : 0);
  const cautionDeposit = 'cautionDeposit' in booking ? Number(booking.cautionDeposit) : ('pricing' in booking ? Number((booking as any).pricing.cautionDeposit) : 0);
  const otherCharges = 'otherCharges' in booking ? Number(booking.otherCharges) : ('pricing' in booking ? Number((booking as any).pricing.otherCharges) : 0);
  
  // Single payment: Student pays the accommodation total. 5% commission is handled by the platform.
  const totalAmountToPay = bookingTotal;
  const platformCommissionEstimate = Math.round(bookingTotal * 0.05);

  const propertyTitle = 'propertyTitle' in booking ? booking.propertyTitle : ('property' in booking ? (booking as any).property.title : 'Hostel');
  const propertyAddress = 'propertyAddress' in booking ? booking.propertyAddress : ('property' in booking ? (booking as any).property.address : '');
  const roomName = 'roomName' in booking ? booking.roomName : ('room' in booking ? (booking as any).room.name : 'Room');
  const bedspaceNumber = 'bedspaceNumber' in booking ? booking.bedspaceNumber : ('bedspace' in booking ? (booking as any).bedspace?.number : null);
  const studentEmail = (booking as any).studentEmail || user?.email || 'student@lautech.edu.ng';

  // Perform Authoritative Server-Side Verification
  const verifyWithBackend = async (reference: string) => {
    setVerifying(true);
    setPaymentError(null);
    try {
      const verifyRes = await api.payments.verify(reference);
      if (verifyRes.success && verifyRes.status === 'SUCCESS') {
        setPaymentSuccess(true);
        setVerifying(false);
        setLoading(false);
        onShowToast('Payment verified successfully with Paystack! 🎉', 'success');
        
        // Fetch official verifiable receipt
        api.payments.getReceipt(reference)
          .then(rRes => setVerifiedReceipt(rRes.receipt))
          .catch(err => console.error('Failed to load receipt:', err));

        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
      } else {
        setVerifying(false);
        setLoading(false);
        const errMsg = verifyRes.message || 'Payment was not confirmed. Please check your transaction.';
        setPaymentError(errMsg);
        onShowToast(errMsg, 'error');
      }
    } catch (vErr: any) {
      setVerifying(false);
      setLoading(false);
      const errMsg = vErr.message || 'Payment verification failed.';
      setPaymentError(errMsg);
      onShowToast(errMsg, 'error');
    }
  };

  const handleInitiatePayment = async () => {
    setLoading(true);
    setPaymentError(null);
    setCheckoutUrl(null);

    try {
      // 1. Initialize Payment on Backend with strict price integrity
      const initRes = await api.payments.initialize({
        bookingId: booking.id,
        paymentProvider: 'PAYSTACK',
        paymentMethod: selectedMethod
      });

      const reference = initRes.paymentReference;
      setActivePaymentRef(reference);

      // 2. Ensure Paystack inline script is ready
      await loadPaystackScript();

      const paystackPublicKey = initRes.publicKey || 
        (import.meta as any).env?.VITE_PAYSTACK_PUBLIC_KEY || 
        (import.meta as any).env?.PAYSTACK_PUBLIC_KEY;

      const hasValidPublicKey = Boolean(
        paystackPublicKey && 
        !paystackPublicKey.includes('placeholder') &&
        paystackPublicKey.startsWith('pk_')
      );

      // 3. Official Paystack Inline Checkout Flow
      if (typeof (window as any).PaystackPop !== 'undefined' && hasValidPublicKey) {
        const channels = selectedMethod === 'BANK_TRANSFER' 
          ? ['bank_transfer', 'bank'] 
          : selectedMethod === 'USSD' 
          ? ['ussd'] 
          : ['card', 'bank_transfer', 'ussd'];

        const handler = (window as any).PaystackPop.setup({
          key: paystackPublicKey,
          email: studentEmail,
          amount: Math.round(initRes.amount * 100), // in kobo
          ref: reference,
          currency: 'NGN',
          channels,
          callback: async (response: any) => {
            // STEP 1G: Never mark as paid merely on frontend callback. Verify with backend!
            await verifyWithBackend(reference);
          },
          onClose: () => {
            setLoading(false);
            setVerifying(false);
            onShowToast('Payment was not completed. You can retry whenever you are ready.', 'info');
          }
        });

        handler.openIframe();
        return;
      }

      // 4. Fallback: Paystack Hosted Checkout URL (if available)
      if (initRes.authorizationUrl && initRes.authorizationUrl.startsWith('https://')) {
        setCheckoutUrl(initRes.authorizationUrl);
        window.open(initRes.authorizationUrl, '_blank', 'noopener,noreferrer');
        setLoading(false);
        return;
      }

      // 5. If Paystack test keys are not yet configured in environment variables
      setLoading(false);
      setPaymentError(
        'Paystack Test Mode Configuration Required: Please configure your Paystack Test Secret Key (starts with sk_test_) and Public Key (starts with pk_test_) in the .env file to process live test payments.'
      );
    } catch (err: any) {
      console.error('Payment initialization error:', err);
      setLoading(false);
      setVerifying(false);
      const msg = err.message || 'Failed to initialize Paystack checkout';
      setPaymentError(msg);
      onShowToast(msg, 'error');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 p-6 text-white relative">
            <button
              onClick={onClose}
              disabled={loading || verifying}
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Hostel Ease Secure Payment Checkout</span>
            </div>
            <h2 className="text-xl font-black text-white">
              {paymentSuccess ? 'Payment Confirmed! 🎉' : 'Accommodation Checkout'}
            </h2>
            <p className="text-emerald-100 text-xs mt-1">
              {paymentSuccess 
                ? 'Your accommodation reservation is verified and 100% secured.' 
                : 'Official Paystack Test Integration • 256-Bit Bank Grade Encryption'}
            </p>
          </div>

          {/* Modal Content */}
          <div className="p-6 space-y-5">

            {paymentSuccess ? (
              // Step 1T: Payment Success Screen
              <div className="text-center py-4 space-y-5">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner ring-8 ring-emerald-50">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black uppercase tracking-wider mb-2">
                    Payment Verified & Confirmed
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">{formatNaira(totalAmountToPay)} Paid</h3>
                  <div className="mt-2 text-xs space-y-1 text-slate-600 font-mono">
                    <p>Booking Reference: <span className="font-bold text-slate-900">{booking.bookingReference}</span></p>
                    <p>Accommodation: <span className="font-bold text-slate-900">{propertyTitle}</span></p>
                    <p>Payment Reference: <span className="font-bold text-emerald-700">{activePaymentRef}</span></p>
                    <p>Status: <span className="font-black text-emerald-600">CONFIRMED</span></p>
                  </div>
                </div>

                <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 text-left text-xs text-emerald-900 space-y-1.5">
                  <div className="flex items-center space-x-2 font-bold">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Your Bedspace is Officially Secured!</span>
                  </div>
                  <p className="text-emerald-800 text-[11px]">
                    The landlord has been notified of your payment. You can now view and download your official move-in gate pass and verified payment voucher.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => setShowReceiptModal(true)}
                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer hover:scale-[1.02]"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View Receipt</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Done / Back to Bookings
                  </button>
                </div>
              </div>
            ) : (
              // Step 1L: Checkout & Price Summary Screen
              <>
                {/* Accommodation Summary */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start justify-between">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <h4 className="font-black text-slate-900 text-sm truncate">{propertyTitle}</h4>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{propertyAddress}</p>
                    <div className="flex items-center gap-2 pt-1 text-xs flex-wrap">
                      <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg text-slate-700 font-bold">
                        {roomName}
                      </span>
                      {bedspaceNumber && (
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-lg font-bold">
                          Space: {bedspaceNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Booking Ref</span>
                    <p className="font-mono text-xs font-extrabold text-slate-800">{booking.bookingReference}</p>
                  </div>
                </div>

                {/* Step 1L: Accommodation Total & Disclosed Breakdown */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  <div className="bg-slate-100/70 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-700 flex justify-between items-center">
                    <span>Accommodation Breakdown</span>
                    <span className="text-emerald-700 font-extrabold">Single Payment</span>
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
                        <span>Other Disclosed Charges</span>
                        <span className="font-semibold text-slate-800">{formatNaira(otherCharges)}</span>
                      </div>
                    )}

                    {/* Step 1L: Display Total Due Cleanly */}
                    <div className="pt-3 border-t border-slate-200 space-y-1">
                      <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                        <span>Accommodation Total</span>
                        <span className="font-mono font-bold text-slate-700">{formatNaira(bookingTotal)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-black text-slate-900">
                        <span>Amount to Pay</span>
                        <span className="text-emerald-700 text-xl font-extrabold">{formatNaira(totalAmountToPay)}</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 space-y-0.5">
                      <p className="font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Zero Extra Student Charges</span>
                      </p>
                      <p className="text-[10px] text-emerald-700">
                        The 5% platform commission (approx. {formatNaira(platformCommissionEstimate)}) is deducted from the landlord's agreed payout. You make only 1 single payment.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 1M: Supported Payment Channels (Behind-the-scenes Paystack) */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('CARD')}
                      className={`p-3 border rounded-2xl flex flex-col items-center justify-center space-y-1.5 transition-all text-xs font-bold cursor-pointer ${
                        selectedMethod === 'CARD'
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-600/20 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-emerald-600" />
                      <span>Card</span>
                      <span className="text-[10px] text-slate-400 font-normal">ATM / Debit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedMethod('BANK_TRANSFER')}
                      className={`p-3 border rounded-2xl flex flex-col items-center justify-center space-y-1.5 transition-all text-xs font-bold cursor-pointer ${
                        selectedMethod === 'BANK_TRANSFER'
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-600/20 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Building2 className="w-5 h-5 text-emerald-600" />
                      <span>Bank Transfer</span>
                      <span className="text-[10px] text-slate-400 font-normal">Paystack Account</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedMethod('USSD')}
                      className={`p-3 border rounded-2xl flex flex-col items-center justify-center space-y-1.5 transition-all text-xs font-bold cursor-pointer ${
                        selectedMethod === 'USSD'
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-600/20 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <QrCode className="w-5 h-5 text-emerald-600" />
                      <span>USSD</span>
                      <span className="text-[10px] text-slate-400 font-normal">Bank String</span>
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {paymentError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">Payment Error</p>
                      <p className="text-[11px] leading-relaxed">{paymentError}</p>
                    </div>
                  </div>
                )}

                {/* Redirect Notice if Popup was blocked or External window requested */}
                {checkoutUrl && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Paystack Checkout Opened in Tab</span>
                      <a
                        href={checkoutUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 underline font-bold flex items-center gap-1"
                      >
                        Re-open <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Once you complete payment on Paystack, click below to verify your transaction and issue your official receipt.
                    </p>
                    <button
                      type="button"
                      onClick={() => activePaymentRef && verifyWithBackend(activePaymentRef)}
                      disabled={verifying}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {verifying ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying with Paystack...</span>
                        </>
                      ) : (
                        <span>Verify My Payment Now</span>
                      )}
                    </button>
                  </div>
                )}

                {/* Step 1B: Submit Payment CTA */}
                <div className="pt-2">
                  <button
                    onClick={handleInitiatePayment}
                    disabled={loading || verifying}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.01]"
                  >
                    {verifying ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Verifying with Paystack Server...</span>
                      </>
                    ) : loading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Connecting to Paystack Test Checkout...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Pay {formatNaira(totalAmountToPay)} Now</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </button>
                  <p className="text-center text-[11px] text-slate-400 mt-2.5 flex items-center justify-center gap-1">
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
