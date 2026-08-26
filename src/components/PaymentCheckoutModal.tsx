import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  CreditCard, 
  Building2, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  Info,
  Calendar,
  User,
  Zap,
  RotateCcw
} from 'lucide-react';
import { Booking, PlatformFeeConfig, PaymentTransaction } from '../types';
import { formatNaira } from '../utils/formatters';
import { 
  calculatePaymentBreakdown, 
  verifyPaymentTransaction, 
  PAYMENT_GATEWAY_CONFIG,
  PaymentBreakdownResult 
} from '../services/paymentService';

interface PaymentCheckoutModalProps {
  booking: Booking;
  platformFeeConfig: PlatformFeeConfig;
  existingTransactions: PaymentTransaction[];
  onClose: () => void;
  onPaymentSuccess: (transaction: PaymentTransaction) => void;
}

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({
  booking,
  platformFeeConfig,
  existingTransactions,
  onClose,
  onPaymentSuccess,
}) => {
  const breakdown: PaymentBreakdownResult = calculatePaymentBreakdown(booking, platformFeeConfig);

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank_transfer' | 'ussd'>('card');
  const [testScenario, setTestScenario] = useState<'success' | 'failed' | 'underpaid' | 'network_error'>('success');
  const [customCardNumber, setCustomCardNumber] = useState('4084 0840 8408 4084');
  const [customExpiry, setCustomExpiry] = useState('09/28');
  const [customCvv, setCustomCvv] = useState('408');
  const [transferConfirmed, setTransferConfirmed] = useState(false);

  // Verification & State machine
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [flaggedNotice, setFlaggedNotice] = useState<string | null>(null);

  const handleExecutePayment = async () => {
    setIsProcessing(true);
    setPaymentError(null);
    setFlaggedNotice(null);

    const ref = `PAY-${booking.referenceNumber}`;

    try {
      // Stage 1: Handshake with Gateway
      setProcessingStage('Connecting to Paystack Secure Checkout Gateway...');
      await new Promise((r) => setTimeout(r, 900));

      if (testScenario === 'network_error') {
        throw new Error('Payment gateway timed out. Your card was not charged. Please try again.');
      }

      if (testScenario === 'failed') {
        throw new Error('Transaction declined: Insufficient funds or invalid card PIN. Please try again.');
      }

      // Stage 2: Processing Payment Authorization
      setProcessingStage('Authorizing transaction & processing 3D-Secure authentication...');
      await new Promise((r) => setTimeout(r, 1100));

      // Stage 3: Server-side Verification
      setProcessingStage('Server-side verification: validating transaction reference, amount & idempotency...');
      await new Promise((r) => setTimeout(r, 900));

      const paidAmount = testScenario === 'underpaid' ? breakdown.grossAmount - 50000 : breakdown.grossAmount;

      const verification = await verifyPaymentTransaction({
        booking,
        paymentReference: ref,
        expectedAmount: breakdown.grossAmount,
        paidAmount,
        channel: paymentMethod,
        existingTransactions,
        breakdown,
      });

      if (!verification.success) {
        if (verification.isFlagged) {
          setFlaggedNotice(verification.errorMessage || 'Transaction flagged for manual review.');
        } else {
          setPaymentError(verification.errorMessage || 'Payment could not be verified by server.');
        }
        setIsProcessing(false);
        return;
      }

      if (verification.transaction) {
        setProcessingStage('Payment verified! Finalizing booking confirmation...');
        await new Promise((r) => setTimeout(r, 600));
        setIsProcessing(false);
        onPaymentSuccess(verification.transaction);
      }
    } catch (err: any) {
      setIsProcessing(false);
      setPaymentError(err.message || 'Payment processing failed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 my-8">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200 font-mono">
                  {PAYMENT_GATEWAY_CONFIG.activeProvider} SECURE CHECKOUT
                </span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Test Sandbox
                </span>
              </div>
              <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 mt-0.5">
                Complete Accommodation Payment
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Accommodation Summary */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
              Booking Ref: {booking.referenceNumber}
            </span>
            <h4 className="font-extrabold text-sm text-slate-900 truncate">
              {booking.propertyTitle}
            </h4>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {booking.zoneName}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Host: {booking.landlordName}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Move-in: {booking.moveInDate}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Due</span>
            <span className="text-xl font-black text-brand-600">
              {formatNaira(breakdown.grossAmount)}
            </span>
          </div>
        </div>

        {/* Transparent Itemized Breakdown */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-700">
            <span className="font-medium">Annual Rent ({booking.durationLabel || '1 Year'})</span>
            <span className="font-mono font-bold">{formatNaira(breakdown.rentAmount)}</span>
          </div>
          {breakdown.agencyFee > 0 && (
            <div className="flex items-center justify-between text-slate-600">
              <span>Agency Fee</span>
              <span className="font-mono font-bold">{formatNaira(breakdown.agencyFee)}</span>
            </div>
          )}
          {breakdown.agreementFee > 0 && (
            <div className="flex items-center justify-between text-slate-600">
              <span>Legal / Agreement Fee</span>
              <span className="font-mono font-bold">{formatNaira(breakdown.agreementFee)}</span>
            </div>
          )}
          {breakdown.cautionFee > 0 && (
            <div className="flex items-center justify-between text-slate-600">
              <span>Refundable Caution Deposit</span>
              <span className="font-mono font-bold">{formatNaira(breakdown.cautionFee)}</span>
            </div>
          )}
          {breakdown.serviceCharge > 0 && (
            <div className="flex items-center justify-between text-slate-600">
              <span>Annual Service Charge</span>
              <span className="font-mono font-bold">{formatNaira(breakdown.serviceCharge)}</span>
            </div>
          )}
          
          {/* CampusNest Platform Commission Item */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-emerald-950 font-bold bg-emerald-50/60 -mx-4 -mb-2 px-4 py-2 rounded-b-2xl">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>CampusNest Platform & Escrow Protection Fee:</span>
              <span className="text-[10px] text-emerald-700 font-normal">
                ({breakdown.feePercentageDisplay} • {breakdown.payer === 'STUDENT' ? 'Student Covered' : 'Host Deducted'})
              </span>
            </div>
            <span className="font-mono font-black text-emerald-700">
              {breakdown.platformFee > 0 ? formatNaira(breakdown.platformFee) : '₦0 (Promo Zero Fee)'}
            </span>
          </div>
        </div>

        {/* Payment Channels */}
        <div className="space-y-3">
          <label className="block text-xs font-extrabold text-slate-900 uppercase tracking-wider">
            Select Payment Method
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                paymentMethod === 'card'
                  ? 'border-brand-600 bg-brand-50/50 text-brand-900 ring-2 ring-brand-500/20'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <CreditCard className="w-5 h-5 text-brand-600" />
              <span className="text-xs font-bold">Debit Card</span>
              <span className="text-[10px] text-slate-400">Mastercard / Verve / Visa</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('bank_transfer')}
              className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                paymentMethod === 'bank_transfer'
                  ? 'border-brand-600 bg-brand-50/50 text-brand-900 ring-2 ring-brand-500/20'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <Building2 className="w-5 h-5 text-brand-600" />
              <span className="text-xs font-bold">Bank Transfer</span>
              <span className="text-[10px] text-slate-400">Instant Dynamic Account</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('ussd')}
              className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                paymentMethod === 'ussd'
                  ? 'border-brand-600 bg-brand-50/50 text-brand-900 ring-2 ring-brand-500/20'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <Zap className="w-5 h-5 text-brand-600" />
              <span className="text-xs font-bold">USSD String</span>
              <span className="text-[10px] text-slate-400">*737#, *966#, *894#</span>
            </button>
          </div>
        </div>

        {/* Method-Specific Inputs */}
        {paymentMethod === 'card' && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                256-Bit Encrypted Card Details
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Sandbox Test Mode</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Card Number</label>
              <input
                type="text"
                value={customCardNumber}
                onChange={(e) => setCustomCardNumber(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800"
                placeholder="4084 0840 8408 4084"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Expiry (MM/YY)</label>
                <input
                  type="text"
                  value={customExpiry}
                  onChange={(e) => setCustomExpiry(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800"
                  placeholder="09/28"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">CVV Security Code</label>
                <input
                  type="password"
                  maxLength={3}
                  value={customCvv}
                  onChange={(e) => setCustomCvv(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800"
                  placeholder="408"
                />
              </div>
            </div>
          </div>
        )}

        {paymentMethod === 'bank_transfer' && (
          <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <Building2 className="w-4 h-4 text-amber-700" />
              <span>CampusNest Dynamic Paystack Virtual Account:</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-amber-200/80 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Bank Name:</span>
                <span className="font-bold text-slate-900">Wema Bank / Paystack Titan</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Account Number:</span>
                <span className="font-mono font-extrabold text-brand-600 text-sm">9920148812</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Account Name:</span>
                <span className="font-bold text-slate-900">CampusNest - {booking.studentName}</span>
              </div>
            </div>
            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={transferConfirmed}
                onChange={(e) => setTransferConfirmed(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded"
              />
              <span className="text-[11px] text-amber-900 font-medium">I have completed the bank mobile transfer</span>
            </label>
          </div>
        )}

        {paymentMethod === 'ussd' && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <span className="font-bold text-slate-800 block">Dial USSD Code on your registered mobile number:</span>
            <div className="p-3 bg-white rounded-xl border border-slate-300 font-mono font-bold text-center text-sm text-brand-700">
              *737*50*{breakdown.grossAmount}*992014#
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              Available for GTBank, Zenith, Access, UBA, and FirstBank USSD banking.
            </p>
          </div>
        )}

        {/* Sandbox Test Scenario Controls */}
        <div className="p-3.5 bg-slate-100/80 rounded-2xl border border-slate-200 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              Gateway Test Simulator Controls (Phase 7 Sandbox):
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTestScenario('success')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                testScenario === 'success'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              ✅ Successful Payment
            </button>
            <button
              type="button"
              onClick={() => setTestScenario('failed')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                testScenario === 'failed'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              ❌ Declined / Insufficient Funds
            </button>
            <button
              type="button"
              onClick={() => setTestScenario('underpaid')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                testScenario === 'underpaid'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              ⚠️ Amount Mismatch (Flag for Review)
            </button>
            <button
              type="button"
              onClick={() => setTestScenario('network_error')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                testScenario === 'network_error'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              🔌 Gateway Timeout / Network Error
            </button>
          </div>
        </div>

        {/* Live Processing Stage Feedback */}
        {isProcessing && (
          <div className="p-4 bg-brand-50 border border-brand-200 rounded-2xl text-xs text-brand-950 space-y-2 animate-pulse">
            <div className="flex items-center gap-2 font-bold">
              <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
              <span>{processingStage}</span>
            </div>
            <p className="text-[11px] text-brand-700">
              Please do not refresh or navigate away while the payment is verified with the gateway server.
            </p>
          </div>
        )}

        {/* Error Feedback */}
        {paymentError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-1.5 animate-fadeIn">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Payment was not completed</span>
            </div>
            <p className="text-rose-700">{paymentError}</p>
          </div>
        )}

        {/* Flagged Review Notice */}
        {flaggedNotice && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 space-y-1.5 animate-fadeIn">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Transaction Flagged for Admin Audit</span>
            </div>
            <p className="text-amber-800">{flaggedNotice}</p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Escrow Protected: Host payout held until move-in check.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="w-1/2 sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecutePayment}
              disabled={isProcessing}
              className="w-1/2 sm:w-auto px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-extrabold shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Pay {formatNaira(breakdown.grossAmount)}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
