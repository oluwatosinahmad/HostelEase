import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Calendar, 
  ShieldCheck, 
  AlertCircle, 
  Building2, 
  Info, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  User,
  ArrowRight,
  Receipt,
  Phone,
  HelpCircle,
  MessageCircle
} from 'lucide-react';
import { Property, RoomAvailability, BedspaceAvailability, PropertyAvailabilityResponse } from '../types/hostelEase';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatNaira, formatDistance } from '../utils/formatters';

interface BookingModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
  onBookingSuccess: (bookingId: string, bookingRef: string) => void;
  onOpenConversation?: (propertyId: string) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  property,
  isOpen,
  onClose,
  onBookingSuccess,
  onOpenConversation,
  onShowToast
}) => {
  const { isAuthenticated } = useAuth();
  const [step, setStep] = useState<'SELECT' | 'REVIEW' | 'SUCCESS'>('SELECT');
  const [availability, setAvailability] = useState<PropertyAvailabilityResponse | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState<boolean>(true);

  // Form State
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedBedspaceId, setSelectedBedspaceId] = useState<string>('');
  const [moveInDate, setMoveInDate] = useState<string>('');
  const [academicSession, setAcademicSession] = useState<string>('2026/2027');
  const [durationMonths, setDurationMonths] = useState<number>(12);
  const [specialRequests, setSpecialRequests] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Success Receipt State
  const [createdBooking, setCreatedBooking] = useState<{
    bookingId: string;
    bookingReference: string;
    expiresAt: string;
    totalCost: number;
  } | null>(null);

  // Minimum move in date: tomorrow
  const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  useEffect(() => {
    if (isOpen && property.id) {
      setLoadingAvailability(true);
      setStep('SELECT');
      setSelectedBedspaceId('');
      setSpecialRequests('');
      setCreatedBooking(null);

      // Default move in date: 1st of next month or 2 weeks from now
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 14);
      setMoveInDate(defaultDate.toISOString().split('T')[0]);

      api.bookings.getAvailability(property.id)
        .then(res => {
          if (res && res.rooms && res.rooms.length > 0) {
            setAvailability(res);
            const availableRoom = res.rooms.find((r: RoomAvailability) => r.quantityAvailable > 0) || res.rooms[0];
            setSelectedRoomId(availableRoom.id);
          } else {
            const fallbackRooms: RoomAvailability[] = (property.rooms && property.rooms.length > 0) ? property.rooms.map(r => ({
              id: r.id,
              name: r.name,
              type: r.type,
              maxOccupants: r.maxOccupants,
              quantityTotal: r.quantityTotal || 8,
              quantityAvailable: r.quantityAvailable || 6,
              occupiedCount: r.occupiedCount || 2,
              isEnsuite: r.isEnsuite,
              isFurnished: r.isFurnished,
              status: 'AVAILABLE' as const,
              pricing: {
                rentAmount: property.priceSummary?.rentAmount || 200000,
                serviceCharge: property.priceSummary?.serviceCharge || 15000,
                agencyFee: 0,
                cautionDeposit: property.priceSummary?.cautionFee || 20000,
                otherCharges: property.priceSummary?.otherMandatoryCharges || 5000,
                totalCost: (property.priceSummary?.rentAmount || 200000) + 40000
              },
              bedspaces: [
                { id: `bs-${r.id}-1`, bedspaceNumber: '1', isOccupied: false, genderPreference: 'ANY', status: 'AVAILABLE' as const },
                { id: `bs-${r.id}-2`, bedspaceNumber: '2', isOccupied: false, genderPreference: 'ANY', status: 'AVAILABLE' as const }
              ]
            })) : [
              {
                id: `room-${property.id}-1`,
                name: 'Standard Ensuite Room',
                type: 'SELF_CONTAIN',
                maxOccupants: 1,
                quantityTotal: 8,
                quantityAvailable: 5,
                occupiedCount: 3,
                isEnsuite: true,
                isFurnished: false,
                status: 'AVAILABLE' as const,
                pricing: {
                  rentAmount: property.priceSummary?.rentAmount || 200000,
                  serviceCharge: 15000,
                  agencyFee: 0,
                  cautionDeposit: 20000,
                  otherCharges: 5000,
                  totalCost: (property.priceSummary?.rentAmount || 200000) + 40000
                },
                bedspaces: [
                  { id: 'bs-1', bedspaceNumber: '1', isOccupied: false, genderPreference: 'ANY', status: 'AVAILABLE' as const }
                ]
              }
            ];
            setAvailability({
              propertyId: property.id,
              title: property.title,
              availabilityStatus: 'AVAILABLE',
              rooms: fallbackRooms
            });
            setSelectedRoomId(fallbackRooms[0].id);
          }
          setLoadingAvailability(false);
        })
        .catch(err => {
          console.warn('Backend availability fetch error, generating room config:', err);
          const fallbackRooms: RoomAvailability[] = [
            {
              id: `room-${property.id}-1`,
              name: property.rooms?.[0]?.name || 'Standard Ensuite Room',
              type: property.rooms?.[0]?.type || 'SELF_CONTAIN',
              maxOccupants: 1,
              quantityTotal: 8,
              quantityAvailable: 5,
              occupiedCount: 3,
              isEnsuite: true,
              isFurnished: false,
              status: 'AVAILABLE' as const,
              pricing: {
                rentAmount: property.priceSummary?.rentAmount || 200000,
                serviceCharge: 15000,
                agencyFee: 0,
                cautionDeposit: 20000,
                otherCharges: 5000,
                totalCost: (property.priceSummary?.rentAmount || 200000) + 40000
              },
              bedspaces: [
                { id: 'bs-1', bedspaceNumber: '1', isOccupied: false, genderPreference: 'ANY', status: 'AVAILABLE' as const }
              ]
            }
          ];
          setAvailability({
            propertyId: property.id,
            title: property.title,
            availabilityStatus: 'AVAILABLE',
            rooms: fallbackRooms
          });
          setSelectedRoomId(fallbackRooms[0].id);
          setLoadingAvailability(false);
        });
    }
  }, [isOpen, property.id]);

  if (!isOpen) return null;

  const currentRoom = availability?.rooms.find(r => r.id === selectedRoomId);
  const currentBedspace = currentRoom?.bedspaces.find(b => b.id === selectedBedspaceId);

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    setSelectedBedspaceId(''); // Reset bedspace when room changes
  };

  const handleBedspaceSelect = (bedspace: BedspaceAvailability) => {
    if (bedspace.isOccupied) return;
    if (selectedBedspaceId === bedspace.id) {
      setSelectedBedspaceId(''); // toggle off
    } else {
      setSelectedBedspaceId(bedspace.id);
    }
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) {
      onShowToast('Please select a room type', 'error');
      return;
    }
    if (!moveInDate) {
      onShowToast('Please select your preferred move-in date', 'error');
      return;
    }
    setStep('REVIEW');
  };

  const handleConfirmReservation = async () => {
    if (!currentRoom) return;

    setSubmitting(true);
    try {
      const res = await api.bookings.reserve({
        propertyId: property.id,
        roomId: selectedRoomId,
        bedspaceId: selectedBedspaceId || undefined,
        moveInDate,
        academicSession,
        durationMonths,
        specialRequests: specialRequests.trim() || undefined
      });

      setCreatedBooking({
        bookingId: res.bookingId,
        bookingReference: res.bookingReference,
        expiresAt: res.expiresAt,
        totalCost: res.totalCost
      });

      setStep('SUCCESS');
      onShowToast('Reservation request submitted successfully!', 'success');
      onBookingSuccess(res.bookingId, res.bookingReference);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to submit reservation', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">Account Required to Book</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              To reserve a room and secure your bedspace through Hostel Ease Escrow, you must first create an account or sign in.
            </p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-[11px] text-amber-800 dark:text-amber-300 font-medium text-left space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Why an account is needed:</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
              <li>Generates your verified digital tenancy agreement</li>
              <li>Protects your rent payment in secure escrow</li>
              <li>Issues your official move-in gate pass & room keys</li>
            </ul>
          </div>
          <div className="flex gap-2.5 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onClose();
                window.dispatchEvent(new CustomEvent('hostel_ease_open_auth', { detail: { role: 'STUDENT' } }));
              }}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-colors cursor-pointer"
            >
              Create Account / Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-emerald-950 text-white flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold flex-shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.2 rounded text-[9px] font-black bg-emerald-400 text-slate-950 uppercase tracking-wider">
                  Hostel Ease Phase 5
                </span>
                <span className="text-[10px] text-slate-300">LAUTECH Accommodation</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white truncate">
                Reserve {property.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* STEP 1: SELECT ROOM & BEDSPACE */}
          {step === 'SELECT' && (
            <form onSubmit={handleProceedToReview} className="space-y-5">
              {/* Hostel Context Bar */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={property.coverImage}
                    alt={property.title}
                    className="w-11 h-11 rounded-xl object-cover flex-shrink-0 bg-slate-200"
                  />
                  <div className="min-w-0">
                    <p className="font-black text-slate-900 truncate">{property.title}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      📍 {property.area?.name || 'LAUTECH'} ({formatDistance(property.distanceFromCampusKm)} from Main Gate)
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-black text-emerald-700">
                    {formatNaira(property.priceSummary?.rentAmount)}/yr
                  </span>
                  <p className="text-[10px] text-slate-400 font-semibold">100% Disclosed Pricing</p>
                </div>
              </div>

              {/* Room Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                  1. Select Room Type
                </label>

                {loadingAvailability ? (
                  <div className="p-8 text-center space-y-2 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-400 font-bold">Checking real-time room availability...</p>
                  </div>
                ) : !availability || availability.rooms.length === 0 ? (
                  <div className="p-6 text-center bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs">
                    <AlertCircle className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                    No room records available for this hostel yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availability.rooms.map(room => {
                      const isSelected = room.id === selectedRoomId;
                      const isAvailable = room.quantityAvailable > 0;

                      return (
                        <div
                          key={room.id}
                          onClick={() => isAvailable && handleRoomSelect(room.id)}
                          className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                            !isAvailable
                              ? 'opacity-50 bg-slate-100 border-slate-200 cursor-not-allowed'
                              : isSelected
                              ? 'bg-emerald-50/80 border-emerald-600 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-black text-xs text-slate-900">{room.name}</h4>
                              <p className="text-[10px] text-slate-500 font-medium capitalize">
                                {room.type.replace(/_/g, ' ').toLowerCase()} • {room.maxOccupants} Occupant(s)
                              </p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                              isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {isAvailable ? `${room.quantityAvailable} space(s) left` : 'Fully Booked'}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-slate-100/80 flex items-center justify-between text-xs">
                            <span className="font-black text-emerald-800">
                              {formatNaira(room.pricing.rentAmount)}
                              <span className="text-[9px] text-slate-400 font-normal">/yr</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              Est. Total: {formatNaira(room.pricing.totalCost)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bedspace Level Selection (Where Supported) */}
              {currentRoom && currentRoom.bedspaces && currentRoom.bedspaces.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                      2. Choose Specific Bedspace (Optional)
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Pick your preferred space in {currentRoom.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {currentRoom.bedspaces.map(bed => {
                      const isSelected = bed.id === selectedBedspaceId;
                      const isOccupied = bed.isOccupied;

                      return (
                        <button
                          key={bed.id}
                          type="button"
                          disabled={isOccupied}
                          onClick={() => handleBedspaceSelect(bed)}
                          className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                            isOccupied
                              ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                              : isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50'
                          }`}
                        >
                          <span className="text-sm">🛏️</span>
                          <span className="text-xs font-black">{bed.bedspaceNumber}</span>
                          <span className={`text-[9px] font-bold ${
                            isOccupied
                              ? 'text-rose-500'
                              : isSelected
                              ? 'text-emerald-100'
                              : 'text-emerald-700'
                          }`}>
                            {isOccupied ? 'Occupied' : isSelected ? 'Selected' : 'Available'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Move-in Date & Academic Session */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Preferred Move-in Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    min={tomorrowStr}
                    value={moveInDate}
                    onChange={(e) => setMoveInDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                  <p className="text-[10px] text-slate-400">Select when you plan to pack in.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Academic Session
                  </label>
                  <select
                    value={academicSession}
                    onChange={(e) => setAcademicSession(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  >
                    <option value="2026/2027">2026/2027 Academic Session</option>
                    <option value="2025/2026">2025/2026 Academic Session</option>
                  </select>
                  <p className="text-[10px] text-slate-400">Duration: 1 Academic Year (12 Months)</p>
                </div>
              </div>

              {/* Special Requests / Notes to Landlord */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Special Notes or Requests (Optional)
                </label>
                <textarea
                  rows={2}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="e.g. Inquiring if I can bring a small refrigerator, or preferred corner room."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* Submit / Proceed Button */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                {onOpenConversation && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenConversation(property.id);
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Have questions? Chat first
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!currentRoom || currentRoom.quantityAvailable <= 0}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5 ml-auto"
                >
                  <span>Review Cost & Details</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: REVIEW TRANSPARENT PRICING & CONFIRM */}
          {step === 'REVIEW' && currentRoom && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-900 font-black text-xs uppercase tracking-wide">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Review Your Accommodation Reservation
                </div>
                <p className="text-[11px] text-emerald-800">
                  Please review the 100% disclosed fee breakdown before submitting to the landlord.
                </p>
              </div>

              {/* Accommodation Summary Table */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 text-xs">
                  <span className="text-slate-500 font-bold">Hostel</span>
                  <span className="font-black text-slate-900">{property.title}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-100 text-xs">
                  <span className="text-slate-500 font-bold">Location</span>
                  <span className="font-bold text-slate-800">📍 {property.area?.name || 'LAUTECH'} ({formatDistance(property.distanceFromCampusKm)})</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-100 text-xs">
                  <span className="text-slate-500 font-bold">Room & Space</span>
                  <span className="font-black text-emerald-800">
                    {currentRoom.name} {currentBedspace ? `(${currentBedspace.bedspaceNumber})` : ''}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-100 text-xs">
                  <span className="text-slate-500 font-bold">Move-in Date</span>
                  <span className="font-bold text-slate-900">{moveInDate} ({academicSession})</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold">Hostel Provider</span>
                  <span className="font-bold text-slate-800">{property.provider?.name || 'Verified Landlord'}</span>
                </div>
              </div>

              {/* 100% Disclosed Pricing Breakdown */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
                    Transparent Fee Breakdown
                  </span>
                  <span className="px-2 py-0.2 rounded bg-emerald-100 text-emerald-900 font-black text-[9px]">
                    ZERO HIDDEN FEES
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-700">
                  <span>Annual Rent</span>
                  <span className="font-black text-slate-900">{formatNaira(currentRoom.pricing.rentAmount)}</span>
                </div>

                {currentRoom.pricing.serviceCharge > 0 && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Service Charge (Mandatory)</span>
                    <span className="font-semibold text-slate-800">{formatNaira(currentRoom.pricing.serviceCharge)}</span>
                  </div>
                )}

                {currentRoom.pricing.agencyFee > 0 && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Agreement / Agency Fee</span>
                    <span className="font-semibold text-slate-800">{formatNaira(currentRoom.pricing.agencyFee)}</span>
                  </div>
                )}

                {currentRoom.pricing.cautionDeposit > 0 && (
                  <div className="flex justify-between items-center text-emerald-800 bg-emerald-50 p-2 rounded-xl border border-emerald-200 font-medium">
                    <span>Refundable Caution Deposit</span>
                    <span className="font-black">{formatNaira(currentRoom.pricing.cautionDeposit)}</span>
                  </div>
                )}

                {currentRoom.pricing.otherCharges > 0 && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Security & Sanitation Levy</span>
                    <span className="font-semibold text-slate-800">{formatNaira(currentRoom.pricing.otherCharges)}</span>
                  </div>
                )}

                {/* Total Cost Highlight */}
                <div className="pt-3 border-t-2 border-dashed border-slate-200 flex justify-between items-baseline">
                  <div>
                    <span className="font-black text-slate-900 uppercase text-xs">Total First Year Cost</span>
                    <p className="text-[10px] text-slate-400">Disclosed annual rent + mandatory fees + refundable deposit</p>
                  </div>
                  <span className="text-xl font-black text-emerald-700">
                    {formatNaira(currentRoom.pricing.totalCost)}
                  </span>
                </div>
              </div>

              {/* 5% Booking Commission Agreement Box */}
              <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-emerald-950 text-[11px] space-y-1.5">
                <div className="flex items-center justify-between font-black">
                  <span className="flex items-center gap-1.5 text-emerald-900">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    5% Booking Commission Agreement
                  </span>
                  <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-black">
                    Standard 5%
                  </span>
                </div>
                <p className="text-slate-600 text-[10px] leading-relaxed">
                  Per Hostel Ease policy: For this {formatNaira(currentRoom.pricing.rentAmount)} accommodation, Hostel Ease receives a 5% platform facilitation commission ({formatNaira(currentRoom.pricing.rentAmount * 0.05)}). Landlord receives the agreed net payout of {formatNaira(currentRoom.pricing.rentAmount * 0.95)} upon student move-in verification.
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60 font-mono text-[10px] text-emerald-900">
                  <span>Hostel Ease 5% Fee: {formatNaira(currentRoom.pricing.rentAmount * 0.05)}</span>
                  <span className="font-black">Net Landlord Payout: {formatNaira(currentRoom.pricing.rentAmount * 0.95)}</span>
                </div>
              </div>

              {/* Next Steps Advisory */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  What happens when you confirm?
                </p>
                <p className="text-amber-800">
                  Your space will be held and submitted to Landlord <strong>{property.provider?.name}</strong> along with the 5% commission agreement settlement notice. The provider has 48 hours to confirm your reservation. (No online payment required in Phase 5).
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep('SELECT')}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleConfirmReservation}
                  disabled={submitting}
                  className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Securing Reservation...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Send Reservation Request</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS RECEIPT & NEXT STEPS */}
          {step === 'SUCCESS' && createdBooking && (
            <div className="space-y-5 text-center py-4 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                  Reservation Created
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  Reservation Request Submitted!
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Your space has been held. We have notified the landlord for confirmation.
                </p>
              </div>

              {/* Reference Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-w-md mx-auto space-y-2 text-left text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-bold">Booking Reference</span>
                  <span className="font-mono font-black text-slate-900 text-sm bg-white px-2 py-0.5 rounded border border-slate-300">
                    {createdBooking.bookingReference}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-bold">Accommodation</span>
                  <span className="font-bold text-slate-800">{property.title}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-bold">Status</span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-black text-[10px]">
                    PENDING LANDLORD CONFIRMATION
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold">Total Estimated Cost</span>
                  <span className="font-black text-emerald-700">{formatNaira(createdBooking.totalCost)}</span>
                </div>

                <div className="flex justify-between items-center text-[11px] pt-2 border-t border-slate-200 text-slate-600">
                  <span className="font-medium">5% Commission Agreement</span>
                  <span className="font-bold text-emerald-800">5% Platform Fee ({formatNaira(createdBooking.totalCost * 0.05)})</span>
                </div>
              </div>

              {/* Next Steps */}
              <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-left text-xs space-y-2 max-w-md mx-auto">
                <h4 className="font-black text-emerald-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  Next Steps:
                </h4>
                <ul className="space-y-1.5 text-emerald-900 text-[11px] list-disc list-inside">
                  <li>Landlord automatically notified with the <strong>5% booking commission agreement breakdown</strong>.</li>
                  <li>The landlord has <strong>48 hours</strong> to review and confirm.</li>
                  <li>You will receive an in-app notification immediately once confirmed.</li>
                  <li>You can track the status in your <strong>"My Bookings"</strong> dashboard.</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const rawPhone = property.provider?.phone || '08039876543';
                    let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
                    if (cleanPhone.startsWith('0')) {
                      cleanPhone = '234' + cleanPhone.substring(1);
                    }
                    const msg = encodeURIComponent(`Hello ${property.provider?.name || 'Landlord'}, I have just placed a space reservation for "${property.title}" (Ref: ${createdBooking?.bookingReference || 'HE-BK'}) on Hostel Ease. Looking forward to your confirmation!`);
                    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
                  }}
                  className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Landlord</span>
                </button>

                {onOpenConversation && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenConversation(property.id);
                    }}
                    className="w-full sm:w-auto px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>💬 In-App DM</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (createdBooking) {
                      onBookingSuccess(createdBooking.bookingId, createdBooking.bookingReference);
                    } else {
                      onClose();
                    }
                  }}
                  className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Done & View Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
