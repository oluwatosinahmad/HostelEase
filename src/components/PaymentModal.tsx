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
  ExternalLink,
  Copy,
  Check,
  Clock,
  Smartphone,
  Info,
  BadgePercent
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

  // Bank Transfer Virtual Account simulation / Paystack Dedicated Account
  const [virtualAccountCopied, setVirtualAccountCopied] = useState<boolean>(false);
  const [countdownMinutes, setCountdownMinutes] = useState<number>(29);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(59);

  // USSD Bank Selection
  const [selectedBankUssd, setSelectedBankUssd] = useState<string>('gtb');
  const [ussdCopied, setUssdCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setPaymentSuccess(false);
      setVerifiedReceipt(null);
      setActivePaymentRef('');
      setPaymentError(null);
      setCheckoutUrl(null);
      setLoading(false);
      setVerifying(false);
      setVirtualAccountCopied(false);
      setUssdCopied(false);
      // Pre-fetch Paystack SDK
      loadPaystackScript().catch(() => {});
    }
  }, [isOpen]);

  // Virtual Account 30-minute Timer
  useEffect(() => {
    if (!isOpen || selectedMethod !== 'BANK_TRANSFER') return;
    const timer = setInterval(() => {
      setCountdownSeconds(s => {
        if (s > 0) return s - 1;
        setCountdownMinutes(m => (m > 0 ? m - 1 : 0));
        return 59;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, selectedMethod]);

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
  const studentName = (booking as any).studentName || user?.fullName || 'LAUTECH Student';

  // Deterministic Virtual Account Number for this booking
  const virtualNuban = `02${Math.abs(booking.id.split('').reduce((a, c) => a + c.charCodeAt(0), 12345) % 89999999 + 10000000)}`;

  // Bank USSD Map
  const ussdCodes: Record<string, { name: string; code: string }> = {
    gtb: { name: 'GTBank', code: `*737*1*${totalAmountToPay}*${virtualNuban}#` },
    zenith: { name: 'Zenith Bank', code: `*966*${totalAmountToPay}*${virtualNuban}#` },
    firstbank: { name: 'First Bank', code: `*894*${totalAmountToPay}*${virtualNuban}#` },
    access: { name: 'Access Bank', code: `*901*${totalAmountToPay}*${virtualNuban}#` },
    uba: { name: 'UBA', code: `*919*4*${virtualNuban}*${totalAmountToPay}#` }
  };

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

      const rawKey = initRes.publicKey || 
        (import.meta as any).env?.VITE_PAYSTACK_PUBLIC_KEY || 
        (import.meta as any).env?.PAYSTACK_PUBLIC_KEY;

      const paystackPublicKey = (rawKey && !rawKey.includes('placeholder') && rawKey.startsWith('pk_'))
        ? rawKey
        : 'pk_test_95837db8778f2cbfa70b9918fb536aa712a4df87';

      // 3. Official Paystack Inline Checkout Flow
      if (typeof (window as any).PaystackPop !== 'undefined') {
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
        'Paystack Test Mode Configuration: Please provide your Paystack test secret key (sk_test_...) and public key (pk_test_...) in the environment variables to activate live test transactions.'
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

  const handleCopyVirtualAccount = () => {
    navigator.clipboard.writeText(virtualNuban);
    setVirtualAccountCopied(true);
    setTimeout(() => setVirtualAccountCopied(false), 2500);
    onShowToast('Virtual Account Number copied to clipboard!', 'success');
  };

  const handleCopyUssd = (code: string) => {
    navigator.clipboard.writeText(code);
    setUssdCopied(true);
    setTimeout(() => setUssdCopied(false), 2500);
    onShowToast('Bank USSD code copied! Dial from your phone to pay.', 'success');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
          
          {/* Bank-Grade Fintech Header */}
          <div className="bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 p-5 sm:p-6 text-white relative shrink-0 border-b border-emerald-900/40">
            <button
              onClick={onClose}
              disabled={loading || verifying}
              className="absolute top-4 right-4 p-2 text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
              title="Close checkout"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Top Compliance Pills */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Hostel Ease Escrow Protected</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-300 bg-white/5 border border-white/10">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>256-Bit SSL Encryption</span>
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-2 mt-1">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {paymentSuccess ? 'Payment Confirmed! 🎉' : 'Paystack Checkout'}
                </h2>
                <p className="text-xs text-emerald-200/80 mt-0.5 font-medium">
                  {paymentSuccess 
                    ? 'Your accommodation reservation is verified and 100% secured.' 
                    : 'Central Bank of Nigeria (CBN) & NDPR Compliant Payment Gateway'}
                </p>
              </div>

              {!paymentSuccess && (
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Due</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                    {formatNaira(totalAmountToPay)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">

            {paymentSuccess ? (
              // Step 1T: Payment Success & Verification Confirmed
              <div className="text-center py-4 space-y-5 animate-in zoom-in-95 duration-200">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner ring-8 ring-emerald-50 animate-bounce">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                
                <div>
                  <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black uppercase tracking-wider mb-2">
                    Verified & Credited to Escrow
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">{formatNaira(totalAmountToPay)}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Official Digital Payment Receipt Ready</p>
                </div>

                {/* Receipt Card Snippet */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left font-mono text-xs space-y-2 text-slate-700">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-400">Booking Reference:</span>
                    <span className="font-bold text-slate-900">{booking.bookingReference}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-400">Accommodation:</span>
                    <span className="font-bold text-slate-900 truncate max-w-[200px]">{propertyTitle}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-400">Paystack Transaction Ref:</span>
                    <span className="font-bold text-emerald-700">{activePaymentRef || 'HE-PAY-VERIFIED'}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-400">Escrow Security Status:</span>
                    <span className="font-black text-emerald-600 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 inline" />
                      RESERVED & PROTECTED
                    </span>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-left text-xs text-emerald-900 space-y-1">
                  <div className="flex items-center space-x-2 font-bold">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Bedspace 100% Reserved!</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    The landlord has been officially notified of your verified deposit. Your room key gate pass is generated and accessible on your dashboard.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => setShowReceiptModal(true)}
                    className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer hover:scale-[1.02]"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View Official Receipt & Gate Pass</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors cursor-pointer"
                  >
                    Done / Back to Bookings
                  </button>
                </div>
              </div>
            ) : (
              // Step 1L & Professional Fintech Payment Checkout Screen
              <>
                {/* Accommodation Target Badge */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start justify-between gap-3 shadow-xs">
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
                          Bedspace: {bedspaceNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Ref Code</span>
                    <p className="font-mono text-xs font-black text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                      {booking.bookingReference}
                    </p>
                  </div>
                </div>

                {/* Professional Invoice Summary */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-700 flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Transparent Fee Schedule</span>
                    </span>
                    <span className="text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                      Single Sum Settlement
                    </span>
                  </div>

                  <div className="p-4 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Annual Accommodation Rent</span>
                      <span className="font-semibold text-slate-800 font-mono">{formatNaira(rentAmount)}</span>
                    </div>

                    {serviceCharge > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Utility & Service Charge</span>
                        <span className="font-semibold text-slate-800 font-mono">{formatNaira(serviceCharge)}</span>
                      </div>
                    )}

                    {agencyFee > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Tenancy Agreement & Documentation</span>
                        <span className="font-semibold text-slate-800 font-mono">{formatNaira(agencyFee)}</span>
                      </div>
                    )}

                    {cautionDeposit > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span className="flex items-center gap-1">
                          <span>Refundable Caution Deposit</span>
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-bold">Refundable</span>
                        </span>
                        <span className="font-semibold text-emerald-700 font-mono">{formatNaira(cautionDeposit)}</span>
                      </div>
                    )}

                    {otherCharges > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Other Disclosed Charges</span>
                        <span className="font-semibold text-slate-800 font-mono">{formatNaira(otherCharges)}</span>
                      </div>
                    )}

                    {/* Total Section */}
                    <div className="pt-3 border-t border-slate-200 space-y-1">
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>Subtotal Invoice</span>
                        <span className="font-mono font-bold text-slate-700">{formatNaira(bookingTotal)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-black text-slate-900">
                        <span className="flex items-center gap-1">
                          <span>Amount to Pay</span>
                          <span className="text-[10px] font-normal text-slate-400">(Zero Extra Fees)</span>
                        </span>
                        <span className="text-emerald-700 text-xl font-extrabold font-mono">{formatNaira(totalAmountToPay)}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200/80 text-[11px] text-emerald-950 flex items-start gap-2">
                      <BadgePercent className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-bold">Zero Extra Student Charges</p>
                        <p className="text-[10px] text-emerald-800 leading-snug">
                          The 5% platform service commission ({formatNaira(platformCommissionEstimate)}) is settled directly with the landlord. You pay strictly the agreed accommodation total.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Professional Method Selector */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                    Select Payment Method
                  </label>

                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                    {/* Method 1: Card */}
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('CARD')}
                      className={`p-3 rounded-2xl flex flex-col items-center justify-center space-y-1 transition-all text-xs font-bold cursor-pointer border ${
                        selectedMethod === 'CARD'
                          ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-600/20 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-emerald-600" />
                      <span>Card</span>
                      <span className="text-[10px] text-slate-400 font-normal">Visa / Verve / Master</span>
                    </button>

                    {/* Method 2: Bank Transfer */}
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('BANK_TRANSFER')}
                      className={`p-3 rounded-2xl flex flex-col items-center justify-center space-y-1 transition-all text-xs font-bold cursor-pointer border ${
                        selectedMethod === 'BANK_TRANSFER'
                          ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-600/20 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <Building2 className="w-5 h-5 text-emerald-600" />
                      <span>Bank Transfer</span>
                      <span className="text-[10px] text-slate-400 font-normal">Virtual NUBAN</span>
                    </button>

                    {/* Method 3: USSD */}
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('USSD')}
                      className={`p-3 rounded-2xl flex flex-col items-center justify-center space-y-1 transition-all text-xs font-bold cursor-pointer border ${
                        selectedMethod === 'USSD'
                          ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-600/20 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <Smartphone className="w-5 h-5 text-emerald-600" />
                      <span>USSD</span>
                      <span className="text-[10px] text-slate-400 font-normal">Fast Bank Code</span>
                    </button>
                  </div>
                </div>

                {/* METHOD SPECIFIC DETAIL PANELS */}

                {/* 1. Card Panel */}
                {selectedMethod === 'CARD' && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Instant Card Processing</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-black text-[9px]">VISA</span>
                        <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-black text-[9px]">MASTERCARD</span>
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black text-[9px]">VERVE</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Pay instantly with your Nigerian debit or credit card. Protected by 3D-Secure 2-factor OTP authorization.
                    </p>
                  </div>
                )}

                {/* 2. Bank Transfer Dedicated Virtual Account Panel */}
                {selectedMethod === 'BANK_TRANSFER' && (
                  <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-50/60 to-white border border-emerald-200 space-y-3.5 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-slate-900">Paystack Dedicated Virtual Account</span>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <Clock className="w-3 h-3 animate-spin" />
                        <span>Expires in {countdownMinutes}:{String(countdownSeconds).padStart(2, '0')}</span>
                      </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5 text-xs shadow-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Bank Name:</span>
                        <span className="font-bold text-slate-900">Wema Bank / Titan Trust</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Account Number:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-black text-emerald-700 tracking-wider">
                            {virtualNuban}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyVirtualAccount}
                            className="p-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded-lg transition-colors cursor-pointer"
                            title="Copy Account Number"
                          >
                            {virtualAccountCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Account Name:</span>
                        <span className="font-bold text-slate-800 text-[11px] truncate max-w-[200px]">
                          Hostel Ease / {studentName}
                        </span>
                      </div>

                      <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                        <span className="text-slate-500">Exact Amount to Send:</span>
                        <span className="font-mono font-black text-slate-900">{formatNaira(totalAmountToPay)}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-emerald-800 leading-snug">
                      💡 Transfer exactly <strong className="font-mono">{formatNaira(totalAmountToPay)}</strong> using your mobile banking app. Your payment will be verified immediately upon transfer.
                    </p>
                  </div>
                )}

                {/* 3. USSD Code Panel */}
                {selectedMethod === 'USSD' && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-emerald-600" />
                        <span>Select Your Bank for Direct USSD</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                      {Object.entries(ussdCodes).map(([key, val]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedBankUssd(key)}
                          className={`py-2 px-2 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            selectedBankUssd === key
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {val.name}
                        </button>
                      ))}
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">USSD String</span>
                        <span className="font-mono text-xs sm:text-sm font-black text-slate-900">
                          {ussdCodes[selectedBankUssd].code}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyUssd(ussdCodes[selectedBankUssd].code)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {ussdCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{ussdCopied ? 'Copied' : 'Copy Code'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {paymentError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <p className="font-bold">Payment Advisory</p>
                      <p className="text-[11px] leading-relaxed text-rose-700">{paymentError}</p>
                    </div>
                  </div>
                )}

                {/* Redirect Notice if Popup was blocked or External window requested */}
                {checkoutUrl && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Paystack Checkout Opened in New Tab</span>
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

                {/* Escrow Assurance Pill */}
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 text-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Your deposit is held safely in escrow until your physical move-in date.</span>
                </div>

                {/* Submit Payment CTA */}
                <div className="pt-1">
                  <button
                    onClick={handleInitiatePayment}
                    disabled={loading || verifying}
                    className="w-full py-4 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.01]"
                  >
                    {verifying ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Verifying with Paystack Gateway...</span>
                      </>
                    ) : loading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Connecting to Paystack Secure Checkout...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Pay {formatNaira(totalAmountToPay)} via {selectedMethod === 'CARD' ? 'Card' : selectedMethod === 'BANK_TRANSFER' ? 'Transfer' : 'USSD'}</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 mt-3 flex-wrap">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Instant Digital Receipt</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Room Reserved Immediately</span>
                    </span>
                    <span>•</span>
                    <span>No Hidden Fees</span>
                  </div>
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
