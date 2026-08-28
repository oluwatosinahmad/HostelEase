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
  ArrowRight, 
  Sparkles,
  Phone,
  Eye,
  ShieldCheck,
  X,
  CreditCard,
  KeyRound
} from 'lucide-react';
import { BookingItem, BookingStatus } from '../types/hostelEase';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatNaira, formatDistance } from '../utils/formatters';
import { BookingDetailModal } from './BookingDetailModal';
import { PaymentModal } from './PaymentModal';

interface StudentBookingDashboardProps {
  onSelectProperty?: (propertyId: string) => void;
  onOpenConversation?: (propertyId: string) => void;
  onBrowseHostels?: () => void;
  onNavigateToMoveIn?: () => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const StudentBookingDashboard: React.FC<StudentBookingDashboardProps> = ({
  onSelectProperty,
  onOpenConversation,
  onBrowseHostels,
  onNavigateToMoveIn,
  onShowToast
}) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Booking for Modal
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  // Cancel Reason Modal
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [payingBooking, setPayingBooking] = useState<BookingItem | null>(null);

  const fetchBookings = () => {
    setLoading(true);
    api.bookings.getAll()
      .then(res => {
        setBookings(res.bookings || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load bookings:', err);
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

  const handleCancelBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingBookingId) return;

    setIsCancelling(true);
    try {
      await api.bookings.cancel(cancellingBookingId, cancelReason.trim() || undefined);
      onShowToast('Reservation cancelled successfully', 'info');
      setCancellingBookingId(null);
      setCancelReason('');
      fetchBookings();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to cancel reservation', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesTab = 
      activeTab === 'ALL' ? true :
      activeTab === 'PENDING' ? b.status === 'PENDING' :
      activeTab === 'CONFIRMED' ? b.status === 'CONFIRMED' :
      activeTab === 'COMPLETED' ? b.status === 'COMPLETED' :
      ['DECLINED', 'CANCELLED_BY_STUDENT', 'CANCELLED_BY_PROVIDER', 'EXPIRED'].includes(b.status);

    const matchesSearch = 
      b.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.bookingReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.areaName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.providerName.toLowerCase().includes(searchQuery.toLowerCase());

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
            <Clock className="w-3 h-3 text-amber-600" /> PENDING
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
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-blue-600" /> COMPLETED
          </span>
        );
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 uppercase tracking-wider border border-emerald-500/30">
              Hostel Ease Phase 5
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-400" />
            My Hostel Reservations
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Track your reserved rooms, check confirmation status from landlords, and manage move-in dates around LAUTECH.
          </p>
        </div>

        {onBrowseHostels && (
          <button
            onClick={onBrowseHostels}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 self-start sm:self-center"
          >
            <Building2 className="w-4 h-4" />
            Find New Hostel
          </button>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'CONFIRMED', label: 'Confirmed' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'CANCELLED', label: 'Cancelled / Other' }
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
            placeholder="Search reference, hostel..."
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
          <p className="text-xs text-slate-400 font-bold">Loading your reservations...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <Receipt className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900">No Reservations Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven't requested any accommodation reservations in this section yet.
            </p>
          </div>
          {onBrowseHostels && (
            <button
              onClick={onBrowseHostels}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-colors"
            >
              Browse Verified LAUTECH Hostels
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredBookings.map(b => (
            <div
              key={b.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between gap-4"
            >
              {/* Header Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {b.bookingReference}
                  </span>
                  {getStatusBadge(b.status)}
                </div>

                <div className="flex gap-3">
                  <img
                    src={b.propertyCoverImage}
                    alt={b.propertyTitle}
                    className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 bg-slate-100 shadow-2xs"
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <h3 className="font-black text-sm text-slate-900 truncate">
                      {b.propertyTitle}
                    </h3>
                    <p className="text-xs text-slate-500 truncate">
                      📍 {b.areaName} ({formatDistance(b.distanceFromCampusKm)} to Gate)
                    </p>
                    <p className="text-xs font-bold text-emerald-800 truncate">
                      🛏️ {b.roomName} {b.bedspaceNumber ? `• Bedspace ${b.bedspaceNumber}` : ''}
                    </p>
                  </div>
                </div>

                {/* Pricing & Dates Bar */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Move-in Date</span>
                    <p className="font-black text-slate-900">{b.moveInDate}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Total 1st Year Cost</span>
                    <p className="font-black text-emerald-700">{formatNaira(b.totalCost)}</p>
                  </div>
                </div>
              </div>

              {/* Landlord Contact & Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="min-w-0 text-xs">
                  <span className="text-[10px] text-slate-400 font-bold">Landlord</span>
                  <p className="font-bold text-slate-800 truncate">🏡 {b.providerName}</p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {onOpenConversation && (
                    <button
                      onClick={() => onOpenConversation(b.propertyId)}
                      className="p-2 text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-xl transition-colors"
                      title="Chat with Landlord"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  )}

                  {b.status === 'CONFIRMED' && b.paymentStatus !== 'PAID' && (
                    <button
                      onClick={() => setPayingBooking(b)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/25 transition-all flex items-center gap-1.5 animate-pulse"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Pay Now</span>
                    </button>
                  )}

                  {['CONFIRMED', 'COMPLETED'].includes(b.status) && onNavigateToMoveIn && (
                    <button
                      onClick={onNavigateToMoveIn}
                      className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                      <span>Move-In Hub</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedBookingId(b.id)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Booking</span>
                  </button>

                  {['PENDING', 'CONFIRMED'].includes(b.status) && (
                    <button
                      onClick={() => setCancellingBookingId(b.id)}
                      className="px-2.5 py-2 text-rose-600 hover:bg-rose-50 font-bold text-xs rounded-xl border border-rose-200 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {payingBooking && (
        <PaymentModal
          isOpen={Boolean(payingBooking)}
          onClose={() => setPayingBooking(null)}
          booking={payingBooking}
          onPaymentSuccess={() => {
            fetchBookings();
            onShowToast('Payment received and space confirmed! 🎉', 'success');
          }}
          onShowToast={onShowToast}
        />
      )}

      {/* Booking Detail Modal */}
      <BookingDetailModal
        bookingId={selectedBookingId}
        isOpen={Boolean(selectedBookingId)}
        onClose={() => setSelectedBookingId(null)}
        onOpenConversation={onOpenConversation}
        onCancelBooking={(id) => {
          setSelectedBookingId(null);
          setCancellingBookingId(id);
        }}
        onShowToast={onShowToast}
      />

      {/* Cancel Reservation Modal */}
      {cancellingBookingId && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
                Cancel Reservation Request
              </h3>
              <button
                onClick={() => setCancellingBookingId(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to cancel this reservation? The space hold will be released immediately and made available to other students.
            </p>

            <form onSubmit={handleCancelBooking} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Reason for Cancellation (Optional)
                </label>
                <textarea
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Found another accommodation, budget change, or schedule conflict."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingBookingId(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Keep Reservation
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow"
                >
                  {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
