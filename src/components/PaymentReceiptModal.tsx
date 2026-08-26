import React, { useEffect, useState } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  ShieldCheck, 
  Building2, 
  CheckCircle2, 
  Calendar, 
  User, 
  Mail, 
  Phone, 
  QrCode,
  Sparkles,
  Receipt,
  Lock
} from 'lucide-react';
import { PaymentReceipt } from '../types/hostelEase';
import { api } from '../services/api';
import { formatNaira, formatDate } from '../utils/formatters';

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt?: PaymentReceipt | null;
  paymentReference?: string;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt: initialReceipt,
  paymentReference
}) => {
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(initialReceipt || null);
  const [loading, setLoading] = useState<boolean>(!initialReceipt && Boolean(paymentReference));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialReceipt) {
        setReceipt(initialReceipt);
        setLoading(false);
      } else if (paymentReference) {
        setLoading(true);
        api.payments.getReceipt(paymentReference)
          .then(res => {
            setReceipt(res.receipt);
            setLoading(false);
          })
          .catch(err => {
            setError(err.message || 'Failed to load digital receipt');
            setLoading(false);
          });
      }
    }
  }, [isOpen, initialReceipt, paymentReference]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150 print:shadow-none print:border-none">
        
        {/* Header Controls (Hidden on Print) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Official Digital Payment Receipt</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-8 space-y-6 text-slate-800" id="printable-receipt">
          
          {loading ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-500">Generating verified receipt...</p>
            </div>
          ) : error || !receipt ? (
            <div className="text-center py-12 text-rose-600 space-y-2">
              <p className="font-semibold">{error || 'Receipt details could not be retrieved'}</p>
              <button onClick={onClose} className="text-xs text-slate-600 underline">Close</button>
            </div>
          ) : (
            <>
              {/* Brand & Receipt Top */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <div className="flex items-center space-x-2">
                    <div className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-600/20">
                      HE
                    </div>
                    <div>
                      <h1 className="text-xl font-black text-slate-900 tracking-tight">HOSTEL EASE</h1>
                      <p className="text-[10px] text-slate-500 font-medium tracking-wide">LAUTECH OFFICIAL ACCOMMODATION VERIFICATION</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Ogbomoso, Oyo State, Nigeria • support@hostelease.ng
                  </p>
                </div>

                <div className="text-right">
                  <div className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>PAID & VERIFIED</span>
                  </div>
                  <p className="font-mono text-xs font-bold text-slate-700">{receipt.receiptNumber}</p>
                  <p className="text-[11px] text-slate-400">Date: {formatDate(receipt.issuedAt)}</p>
                </div>
              </div>

              {/* Student & Landlord Details */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 rounded-xl p-4 border border-slate-200/80 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Tenant (Student)</span>
                  <p className="font-bold text-slate-900">{receipt.student.name}</p>
                  <p className="text-slate-600">{receipt.student.email}</p>
                  {receipt.student.phone && <p className="text-slate-600">{receipt.student.phone}</p>}
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Accommodation Provider</span>
                  <p className="font-bold text-slate-900">{receipt.provider.name}</p>
                  <p className="text-slate-600">{receipt.provider.email}</p>
                  {receipt.provider.phone && <p className="text-slate-600">{receipt.provider.phone}</p>}
                </div>
              </div>

              {/* Reserved Accommodation Information */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400">Reserved Property & Space</span>
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{receipt.accommodation.title}</h4>
                    <p className="text-slate-500">{receipt.accommodation.address} ({receipt.accommodation.area})</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-800">{receipt.accommodation.roomName} ({receipt.accommodation.roomType})</p>
                    {receipt.accommodation.bedspaceNumber && (
                      <p className="text-emerald-700 font-bold">Space / Bed: {receipt.accommodation.bedspaceNumber}</p>
                    )}
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between text-slate-600 text-[11px]">
                  <span>Move-in Date: <strong>{formatDate(receipt.accommodation.moveInDate)}</strong></span>
                  <span>Session: <strong>{receipt.accommodation.academicSession || '2026/2027'}</strong></span>
                  <span>Booking Ref: <strong className="font-mono">{receipt.bookingReference}</strong></span>
                </div>
              </div>

              {/* Itemized Fee Breakdown Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-4">Item Description</th>
                      <th className="py-2 px-4">Classification</th>
                      <th className="py-2 px-4 text-right">Amount (NGN)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receipt.breakdown ? (
                      <>
                        <tr>
                          <td className="py-2.5 px-4 font-medium text-slate-800">Annual Accommodation Rent</td>
                          <td className="py-2.5 px-4 text-slate-500">Mandatory</td>
                          <td className="py-2.5 px-4 text-right font-semibold">{formatNaira(receipt.breakdown.rentAmount)}</td>
                        </tr>
                        {receipt.breakdown.serviceCharge > 0 && (
                          <tr>
                            <td className="py-2.5 px-4 font-medium text-slate-800">Estate / Utility Service Charge</td>
                            <td className="py-2.5 px-4 text-slate-500">Mandatory</td>
                            <td className="py-2.5 px-4 text-right font-semibold">{formatNaira(receipt.breakdown.serviceCharge)}</td>
                          </tr>
                        )}
                        {receipt.breakdown.agencyFee > 0 && (
                          <tr>
                            <td className="py-2.5 px-4 font-medium text-slate-800">Legal & Tenancy Agreement Fee</td>
                            <td className="py-2.5 px-4 text-slate-500">Mandatory</td>
                            <td className="py-2.5 px-4 text-right font-semibold">{formatNaira(receipt.breakdown.agencyFee)}</td>
                          </tr>
                        )}
                        {receipt.breakdown.cautionDeposit > 0 && (
                          <tr>
                            <td className="py-2.5 px-4 font-medium text-slate-800">Refundable Caution Deposit</td>
                            <td className="py-2.5 px-4 text-emerald-600 font-semibold">Refundable</td>
                            <td className="py-2.5 px-4 text-right font-semibold text-emerald-700">{formatNaira(receipt.breakdown.cautionDeposit)}</td>
                          </tr>
                        )}
                        {receipt.breakdown.otherCharges > 0 && (
                          <tr>
                            <td className="py-2.5 px-4 font-medium text-slate-800">Other Disclosed Mandatory Fees</td>
                            <td className="py-2.5 px-4 text-slate-500">Mandatory</td>
                            <td className="py-2.5 px-4 text-right font-semibold">{formatNaira(receipt.breakdown.otherCharges)}</td>
                          </tr>
                        )}
                        <tr>
                          <td className="py-2.5 px-4 font-medium text-slate-800">Platform Escrow & Security Fee</td>
                          <td className="py-2.5 px-4 text-slate-500">Platform</td>
                          <td className="py-2.5 px-4 text-right font-semibold">{formatNaira(receipt.platformFee)}</td>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <td className="py-2.5 px-4 font-medium text-slate-800">Total Accommodation Fees</td>
                        <td className="py-2.5 px-4 text-slate-500">Full Reservation</td>
                        <td className="py-2.5 px-4 text-right font-semibold">{formatNaira(receipt.totalPaid)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan={2} className="py-3 px-4 font-bold text-slate-900 text-sm">TOTAL AMOUNT PAID</td>
                      <td className="py-3 px-4 text-right font-black text-emerald-700 text-base">{formatNaira(receipt.totalPaid)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Payment Method & Verification Hash */}
              <div className="flex justify-between items-center border-t border-slate-200 pt-4 text-xs text-slate-500">
                <div>
                  <p>Payment Channel: <strong className="text-slate-700">{receipt.paymentMethod}</strong> via <strong className="text-slate-700">{receipt.paymentProvider}</strong></p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Tx Ref: {receipt.paymentReference}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Security Hash</p>
                  <p className="font-mono font-bold text-slate-800">{receipt.verificationHash}</p>
                </div>
              </div>

              {/* Watermark / Legal Notice */}
              <div className="text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
                This document serves as official proof of payment and space allocation on Hostel Ease LAUTECH.
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
};
