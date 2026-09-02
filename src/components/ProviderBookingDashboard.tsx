import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  MessageSquare, 
  MapPin, 
  Receipt, 
  Search, 
  Filter, 
  Sparkles,
  Phone,
  Eye,
  Check,
  X,
  User,
  Users,
  GraduationCap
} from 'lucide-react';
import { BookingItem, BookingStatus } from '../types/hostelEase';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatNaira, formatDistance } from '../utils/formatters';
import { BookingDetailModal } from './BookingDetailModal';

interface ProviderBookingDashboardProps {
  onOpenConversation?: (propertyId: string) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const ProviderBookingDashboard: React.FC<ProviderBookingDashboardProps> = ({
  onOpenConversation,
  onShowToast
}) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Booking Voucher Modal
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  // Decline Modal State
  const [decliningBookingId, setDecliningBookingId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fetchBookings = () => {
    setLoading(true);
    api.bookings.getAll()
      .then(res => {
        setBookings(res.bookings || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load provider bookings:', err);
        onShowToast(err.message || 'Failed to load bookings', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBookings();
    const handleUpdate = () => fetchBookings();
    window.addEventListener('hostel_ease_bookings_updated', handleUpdate);
    return () => window.removeEventListener('hostel_ease_bookings_updated', handleUpdate);
  }, []);

  const handleConfirm = async (bookingId: string) => {
    setIsProcessing(true);
    try {
      await api.bookings.confirm(bookingId);
      onShowToast('Reservation confirmed successfully! Student notified.', 'success');
      fetchBookings();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to confirm reservation', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decliningBookingId) return;

    setIsProcessing(true);
    try {
      await api.bookings.decline(decliningBookingId, declineReason.trim() || undefined);
      onShowToast('Reservation declined and space capacity restored.', 'info');
      setDecliningBookingId(null);
      setDeclineReason('');
      fetchBookings();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to decline reservation', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingCount = bookings.filter(b => b.status === 'PENDING').length;
  const confirmedCount = bookings.filter(b => b.status === 'CONFIRMED').length;
  const totalRevenue = bookings
    .filter(b => ['CONFIRMED', 'COMPLETED'].includes(b.status))
    .reduce((sum, b) => sum + (b.totalCost || 0), 0);

  const filteredBookings = bookings.filter(b => {
    const matchesTab = 
      activeTab === 'ALL' ? true :
      activeTab === 'PENDING' ? b.status === 'PENDING' :
      activeTab === 'CONFIRMED' ? b.status === 'CONFIRMED' :
      ['DECLINED', 'CANCELLED_BY_STUDENT', 'CANCELLED_BY_PROVIDER', 'EXPIRED'].includes(b.status);

    const matchesSearch = 
      b.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.bookingReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.roomName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> CONFIRMED
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" /> PENDING ACTION
          </span>
        );
      case 'DECLINED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-600" /> DECLINED
          </span>
        );
      case 'CANCELLED_BY_STUDENT':
      case 'CANCELLED_BY_PROVIDER':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-slate-500" /> CANCELLED
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 flex items-center gap-1">
            <Clock className="w-3 h-3 text-purple-600" /> EXPIRED
          </span>
        );
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pending Requests</span>
            <h3 className="text-2xl font-black text-slate-900">{pendingCount}</h3>
            <p className="text-[10px] text-amber-700 font-semibold">Requires your review (48h)</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Confirmed Bookings</span>
            <h3 className="text-2xl font-black text-slate-900">{confirmedCount}</h3>
            <p className="text-[10px] text-emerald-700 font-semibold">Active reserved spaces</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-black text-lg">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pipeline Value</span>
            <h3 className="text-xl font-black text-emerald-700">{formatNaira(totalRevenue)}</h3>
            <p className="text-[10px] text-slate-500 font-semibold">Total reserved contracts</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'All Bookings' },
            { id: 'PENDING', label: `Pending (${pendingCount})` },
            { id: 'CONFIRMED', label: `Confirmed (${confirmedCount})` },
            { id: 'OTHER', label: 'Declined / Cancelled' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student, ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="py-24 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-bold">Loading reservations...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-3 shadow-sm">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-black text-slate-700">No Reservations In This View</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            When students reserve spaces in your hostels, their requests will appear here with 1-click confirmation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map(b => (
            <div
              key={b.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              {/* Left Details */}
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className="relative flex-shrink-0">
                  <img
                    src={b.studentAvatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.studentName)}&background=059669&color=fff&bold=true`}
                    alt={b.studentName}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm bg-slate-100"
                    onError={(e: any) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(b.studentName)}&background=059669&color=fff&bold=true`;
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 shadow-xs" title="Verified LAUTECH Student">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {b.bookingReference}
                    </span>
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-emerald-600" />
                      <span>Matric: {b.studentMatricNumber || b.studentMatricNo || '2024/04812'}</span>
                    </span>
                    {getStatusBadge(b.status)}
                  </div>

                  <h3 className="font-black text-sm text-slate-900 truncate">
                    {b.propertyTitle} — <span className="text-emerald-800">{b.roomName}</span> {b.bedspaceNumber ? `(Bed ${b.bedspaceNumber})` : ''}
                  </h3>

                  <p className="text-xs text-slate-600">
                    🎓 Student: <strong>{b.studentName}</strong> ({b.studentDepartment || 'Computer Science'}{b.studentLevel ? ` • ${b.studentLevel}` : ''}) • 📅 Move-in: <strong>{b.moveInDate}</strong>
                  </p>

                  <div className="pt-1.5 flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-extrabold text-slate-800">
                      Disclosed Rent: {formatNaira(b.rentAmount || b.totalCost)}
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                      5% Platform Fee: -{formatNaira((b.rentAmount || b.totalCost) * 0.05)}
                    </span>
                    <span className="text-[10px] font-black text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-300 shadow-xs">
                      Net Payout to You: {formatNaira((b.rentAmount || b.totalCost) * 0.95)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Right */}
              <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                {onOpenConversation && (
                  <button
                    onClick={() => onOpenConversation(b.propertyId)}
                    className="p-2 text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-xl transition-colors"
                    title="Message Student"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => setSelectedBookingId(b.id)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Receipt
                </button>

                {b.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleConfirm(b.id)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Confirm Space
                    </button>

                    <button
                      onClick={() => setDecliningBookingId(b.id)}
                      disabled={isProcessing}
                      className="px-3 py-2 text-rose-600 hover:bg-rose-50 font-bold text-xs rounded-xl border border-rose-200 transition-colors"
                    >
                      Decline
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Detail Voucher Modal */}
      <BookingDetailModal
        bookingId={selectedBookingId}
        isOpen={Boolean(selectedBookingId)}
        onClose={() => setSelectedBookingId(null)}
        onOpenConversation={onOpenConversation}
        onShowToast={onShowToast}
      />

      {/* Decline Reservation Modal */}
      {decliningBookingId && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5 text-rose-600">
                <XCircle className="w-4 h-4" />
                Decline Reservation Request
              </h3>
              <button
                onClick={() => setDecliningBookingId(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Provide a reason to the student for declining this reservation. The held capacity will be restored to your room catalog immediately.
            </p>

            <form onSubmit={handleDecline} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Reason for Declining <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="e.g. Room booked by returning student, maintenance scheduled, or timing conflict."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDecliningBookingId(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || !declineReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow"
                >
                  {isProcessing ? 'Declining...' : 'Decline Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
