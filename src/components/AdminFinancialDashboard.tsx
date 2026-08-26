import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Search,
  ArrowRight,
  Receipt,
  Scale
} from 'lucide-react';
import { AdminFinancialsData } from '../types/hostelEase';
import { api } from '../services/api';
import { formatNaira, formatDate } from '../utils/formatters';

interface AdminFinancialDashboardProps {
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminFinancialDashboard: React.FC<AdminFinancialDashboardProps> = ({
  onShowToast
}) => {
  const [data, setData] = useState<AdminFinancialsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Refund modal state
  const [refundPaymentId, setRefundPaymentId] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('');
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [processingRefund, setProcessingRefund] = useState<boolean>(false);
  const [showRefundModal, setShowRefundModal] = useState<boolean>(false);

  const fetchAdminFinancials = () => {
    setLoading(true);
    api.payments.getAdminFinancials()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load admin financials:', err);
        setError(err.message || 'Could not fetch admin financials');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAdminFinancials();
  }, []);

  const handleExecuteRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundPaymentId.trim()) {
      onShowToast('Please provide a payment ID or reference', 'error');
      return;
    }

    setProcessingRefund(true);
    try {
      const res = await api.payments.processRefund({
        paymentId: refundPaymentId,
        amount: refundAmount ? Number(refundAmount) : undefined,
        reason: refundReason
      });
      onShowToast(`Refund ${res.refundReference} processed successfully! 💸`, 'success');
      setShowRefundModal(false);
      setRefundPaymentId('');
      setRefundReason('');
      setRefundAmount('');
      fetchAdminFinancials();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to process refund', 'error');
    } finally {
      setProcessingRefund(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-md">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Scale className="w-4 h-4" />
            <span>Hostel Ease Financial & Escrow Authority</span>
          </div>
          <h2 className="text-xl font-bold">Platform Financial Overview & Ledger</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable double-entry transaction trail, platform revenue, and authorized dispute handling.
          </p>
        </div>

        <button
          onClick={() => setShowRefundModal(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-rose-600/30"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Authorize Refund</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Gross Volume (GMV)
          </span>
          <p className="text-2xl font-black text-slate-900">
            {loading ? '...' : formatNaira(data?.metrics.totalGmv || 0)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {data?.metrics.successCount || 0} Successful Transactions
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Platform Fees Earned
          </span>
          <p className="text-2xl font-black text-emerald-600">
            {loading ? '...' : formatNaira(data?.metrics.totalPlatformFees || 0)}
          </p>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
            Hostel Ease Revenue
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Provider Payouts Due
          </span>
          <p className="text-2xl font-black text-indigo-600">
            {loading ? '...' : formatNaira(data?.metrics.totalProviderEarnings || 0)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Escrow Net Payable
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total Refunded
          </span>
          <p className="text-2xl font-black text-rose-600">
            {loading ? '...' : formatNaira(data?.metrics.totalRefunded || 0)}
          </p>
          <span className="text-[11px] text-rose-700 font-semibold mt-1 block">
            {data?.metrics.refundedCount || 0} Refund Actions
          </span>
        </div>

      </div>

      {/* Immutable Financial Ledger Stream */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">Double-Entry Financial Ledger Trail</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Immutable Stream</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading ledger records...</div>
        ) : !data?.ledgerStream || data.ledgerStream.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No ledger entries recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Entry Type</th>
                  <th className="py-3 px-4">Debit Account</th>
                  <th className="py-3 px-4">Credit Account</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Amount (NGN)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.ledgerStream.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDate(entry.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        entry.entryType === 'PAYMENT_RECEIVED' ? 'bg-emerald-100 text-emerald-800' :
                        entry.entryType === 'PLATFORM_FEE_DEDUCTED' ? 'bg-indigo-100 text-indigo-800' :
                        entry.entryType === 'REFUND_DEBITED' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {entry.entryType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{entry.debitAccount}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{entry.creditAccount}</td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate">{entry.description}</td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      {formatNaira(entry.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Disputes Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-sm">Payment & Accommodation Disputes</h3>
          </div>
          <span className="text-xs text-slate-400">{data?.disputes?.length || 0} Total</span>
        </div>

        {!data?.disputes || data.disputes.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">No active payment disputes.</div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {data.disputes.map(disp => (
              <div key={disp.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{disp.disputeReference}</span>
                    <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {disp.status}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1 font-medium">{disp.reason}</p>
                  <p className="text-[11px] text-slate-400">
                    Booking: {disp.bookingReference} • Student: {disp.studentName} vs Provider: {disp.providerName}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400">{formatDate(disp.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Refund Authorization Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Authorize Student Refund</h3>
              <button onClick={() => setShowRefundModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleExecuteRefund} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment ID or Reference</label>
                <input
                  type="text"
                  placeholder="HE-PAY-2026-XXXXXX"
                  value={refundPaymentId}
                  onChange={e => setRefundPaymentId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Refund Amount (Optional, leave blank for full)</label>
                <input
                  type="number"
                  placeholder="Full Amount"
                  value={refundAmount}
                  onChange={e => setRefundAmount(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Authorized Reason</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Student cancelled within allowable policy window or room unavailable."
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={processingRefund}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {processingRefund ? 'Processing Refund...' : 'Confirm & Issue Refund'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
