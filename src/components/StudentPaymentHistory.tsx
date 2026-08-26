import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Receipt, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Building2, 
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  FileText
} from 'lucide-react';
import { PaymentItem, PaymentStatus } from '../types/hostelEase';
import { api } from '../services/api';
import { formatNaira, formatDate } from '../utils/formatters';
import { PaymentReceiptModal } from './PaymentReceiptModal';

interface StudentPaymentHistoryProps {
  onNavigateToBookings?: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const StudentPaymentHistory: React.FC<StudentPaymentHistoryProps> = ({
  onNavigateToBookings,
  onShowToast
}) => {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedReceiptRef, setSelectedReceiptRef] = useState<string | null>(null);

  const fetchPayments = (status?: string) => {
    setLoading(true);
    api.payments.getStudentPayments(status === 'ALL' ? undefined : status)
      .then(res => {
        setPayments(res.payments || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load student payments:', err);
        setError(err.message || 'Could not fetch payments');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPayments(activeFilter);
  }, [activeFilter]);

  const filteredPayments = payments.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.paymentReference.toLowerCase().includes(q) ||
      p.bookingReference.toLowerCase().includes(q) ||
      p.property.title.toLowerCase().includes(q) ||
      p.property.areaName.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Paid & Verified</span>
          </span>
        );
      case 'PENDING':
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending Verification</span>
          </span>
        );
      case 'REFUNDED':
      case 'PARTIALLY_REFUNDED':
        return (
          <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 text-xs px-2.5 py-1 rounded-full font-bold">
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
            <span>Refunded</span>
          </span>
        );
      case 'FAILED':
      case 'CANCELLED':
      case 'EXPIRED':
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-xs px-2.5 py-1 rounded-full font-bold">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Failed / Cancelled</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>LAUTECH Student Financial Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">My Payments & Receipts</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Track all accommodation transactions, download verified receipts, and view payment security status.
          </p>
        </div>

        {onNavigateToBookings && (
          <button
            onClick={onNavigateToBookings}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-600/30"
          >
            <span>View My Bookings</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {[
            { label: 'All Payments', value: 'ALL' },
            { label: 'Successful', value: 'SUCCESS' },
            { label: 'Pending', value: 'PENDING' },
            { label: 'Refunded', value: 'REFUNDED' },
            { label: 'Failed', value: 'FAILED' }
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeFilter === tab.value
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reference, hostel..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Payments List */}
      {loading ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading transaction records...</p>
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Payment Records Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery 
              ? 'No transactions matched your search query.' 
              : 'You have not made any payments yet. When a landlord confirms your booking, you can pay and view receipts here.'}
          </p>
          {onNavigateToBookings && (
            <button
              onClick={onNavigateToBookings}
              className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl inline-flex items-center gap-1.5"
            >
              <span>Go to My Bookings</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPayments.map(payment => (
            <div
              key={payment.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Payment Ref</span>
                    <p className="font-mono text-xs font-bold text-slate-800">{payment.paymentReference}</p>
                  </div>
                  {getStatusBadge(payment.status)}
                </div>

                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>{payment.property.title}</span>
                  </div>
                  <p className="text-xs text-slate-500">{payment.property.address} ({payment.property.areaName})</p>
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-600">
                    <span>{payment.room.name}</span>
                    {payment.room.bedspaceNumber && (
                      <span className="text-emerald-700 font-semibold">• Space {payment.room.bedspaceNumber}</span>
                    )}
                    <span>• Booking: <strong className="font-mono">{payment.bookingReference}</strong></span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Total Paid</span>
                  <span className="text-base font-black text-slate-900">{formatNaira(payment.amount)}</span>
                  <span className="text-[10px] text-slate-400 block">{formatDate(payment.paidAt || payment.createdAt)}</span>
                </div>

                {payment.status === 'SUCCESS' && (
                  <button
                    onClick={() => setSelectedReceiptRef(payment.paymentReference)}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>View Receipt</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Digital Receipt Modal */}
      {selectedReceiptRef && (
        <PaymentReceiptModal
          isOpen={Boolean(selectedReceiptRef)}
          onClose={() => setSelectedReceiptRef(null)}
          paymentReference={selectedReceiptRef}
        />
      )}

    </div>
  );
};
