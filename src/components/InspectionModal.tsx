import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Video, 
  Footprints, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  BedDouble,
  ShieldCheck,
  MessageSquare,
  User,
  Sparkles,
  HelpCircle,
  Check
} from 'lucide-react';
import { Property, InspectionType } from '../types/hostelEase';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface InspectionModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onOpenConversation?: (propertyId: string) => void;
  initialType?: InspectionType;
  selectedRoomId?: string;
}

const DEFAULT_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM'
];

const SUGGESTED_QUESTIONS = [
  'Show me the bathroom',
  'Show me the kitchen',
  'Show me the room entrance',
  'Check the water supply',
  'Show me the surroundings',
  'Show me the exact room/bedspace',
  'Show me the electricity meter'
];

export const InspectionModal: React.FC<InspectionModalProps> = ({
  property,
  isOpen,
  onClose,
  onSuccess,
  onOpenConversation,
  initialType = 'PHYSICAL',
  selectedRoomId: initialRoomId
}) => {
  const { user, isAuthenticated } = useAuth();

  const [inspectionType, setInspectionType] = useState<InspectionType>(initialType);
  const [preferredDate, setPreferredDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [preferredTime, setPreferredTime] = useState<string>('10:00 AM');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(() => {
    if (initialRoomId) return initialRoomId;
    return property.rooms?.[0]?.id || '';
  });
  const [studentPhone, setStudentPhone] = useState<string>(user?.phone || '');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [confirmedDetails, setConfirmedDetails] = useState<{
    id: string;
    message: string;
    roomName: string;
    date: string;
    time: string;
    mode: InspectionType;
  } | null>(null);

  // Live Slot Availability State
  const [availableSlots, setAvailableSlots] = useState<string[]>(DEFAULT_SLOTS);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);

  // Synchronize initialType when opened
  useEffect(() => {
    if (initialType) {
      setInspectionType(initialType);
    }
    if (initialRoomId) {
      setSelectedRoomId(initialRoomId);
    }
  }, [initialType, initialRoomId, isOpen]);

  // Keep phone prefilled from logged-in user
  useEffect(() => {
    if (user?.phone && !studentPhone) {
      setStudentPhone(user.phone);
    }
  }, [user?.phone]);

  // Fetch real-time time slots for this Property and Agent on the selected date
  useEffect(() => {
    if (!isOpen || !property?.id || !preferredDate) return;

    let isMounted = true;
    setLoadingSlots(true);

    api.inspections.getAvailableSlots(property.id, preferredDate)
      .then(res => {
        if (!isMounted) return;
        const available = res.availableSlots && res.availableSlots.length > 0 ? res.availableSlots : [];
        const booked = res.bookedSlots || [];
        setAvailableSlots(available);
        setBookedSlots(booked);

        // Auto-select first available slot if currently chosen slot is booked
        if (booked.includes(preferredTime) && available.length > 0) {
          setPreferredTime(available[0]);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setAvailableSlots(DEFAULT_SLOTS);
        setBookedSlots([]);
      })
      .finally(() => {
        if (isMounted) setLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, property?.id, preferredDate]);

  if (!isOpen) return null;

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <User className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">Account Required to Inspect</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Please sign in or create an account to schedule a {initialType === 'VIRTUAL' ? 'live virtual tour' : 'physical inspection'} with the verified agent.
            </p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-[11px] text-amber-800 dark:text-amber-300 font-medium text-left space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Why an account is needed:</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
              <li>Secures your dedicated video walkthrough room</li>
              <li>Allows the agent to verify your student status</li>
              <li>Saves your inspection record in your Student Hub</li>
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

  // Determine available rooms
  const availableRooms = (property.rooms && property.rooms.length > 0)
    ? property.rooms.filter(r => (r.quantityAvailable === undefined || r.quantityAvailable > 0))
    : [];

  const selectedRoomObj = availableRooms.find(r => r.id === selectedRoomId) || availableRooms[0];
  const roomDisplayName = selectedRoomObj 
    ? (selectedRoomObj.name || selectedRoomObj.type.replace(/_/g, ' '))
    : 'Standard Living Space';

  const handleAddQuestionChip = (qText: string) => {
    setNotes(prev => {
      const cleanPrev = prev.trim();
      if (!cleanPrev) return qText;
      if (cleanPrev.toLowerCase().includes(qText.toLowerCase())) return prev;
      return `${cleanPrev} • ${qText}`;
    });
  };

  const validatePhone = (p: string): boolean => {
    const digits = p.replace(/[^0-9]/g, '');
    return digits.length >= 10 && digits.length <= 15;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!preferredDate || !preferredTime) {
      setError('Please select your preferred date and time.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (preferredDate < todayStr) {
      setError('Inspection date cannot be in the past.');
      return;
    }

    const phoneToValidate = (studentPhone || user?.phone || '').trim();
    if (!phoneToValidate || !validatePhone(phoneToValidate)) {
      setError('Please enter a valid phone number (e.g. 0803 123 4567 or +234...)');
      return;
    }

    if (bookedSlots.includes(preferredTime)) {
      setError('This time slot is already booked for this Agent. Please select an available slot.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.inspections.request(property.id, {
        inspectionType,
        preferredDate,
        preferredTime,
        roomId: selectedRoomId || (selectedRoomObj ? selectedRoomObj.id : undefined),
        studentPhone: phoneToValidate,
        notes: notes.trim() || undefined
      });

      const successMsg = res.message || `Virtual inspection request submitted for ${property.title}.`;
      setConfirmedDetails({
        id: res.inspectionId || `insp-${Date.now()}`,
        message: successMsg,
        roomName: roomDisplayName,
        date: preferredDate,
        time: preferredTime,
        mode: inspectionType
      });
      setConfirmed(true);
      onSuccess(successMsg);
    } catch (err: any) {
      setError(err.message || 'Failed to submit inspection request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenInAppChat = () => {
    onClose();
    if (onOpenConversation) {
      onOpenConversation(property.id);
    } else {
      window.dispatchEvent(new CustomEvent('hostel_ease_open_conversation', { 
        detail: { propertyId: property.id } 
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150 my-6 relative">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-2xl ${inspectionType === 'VIRTUAL' ? 'bg-purple-600/30 text-purple-400' : 'bg-emerald-600/30 text-emerald-400'}`}>
              {inspectionType === 'VIRTUAL' ? <Video className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-black text-base">
                {inspectionType === 'VIRTUAL' ? 'Request Live Virtual Tour' : 'Schedule Hostel Inspection'}
              </h3>
              <p className="text-xs text-slate-300 line-clamp-1">{property.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Confirmed Screen */}
        {confirmed ? (
          <div className="p-6 text-center space-y-5">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-lg ${
              confirmedDetails?.mode === 'VIRTUAL' 
                ? 'bg-purple-100 text-purple-600 shadow-purple-600/20 dark:bg-purple-950/60 dark:text-purple-400' 
                : 'bg-emerald-100 text-emerald-600 shadow-emerald-600/20 dark:bg-emerald-950/60 dark:text-emerald-400'
            }`}>
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                Pending Agent Confirmation
              </span>
              <h4 className="font-black text-xl text-slate-900 dark:text-white pt-1">
                Inspection Scheduled!
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                Inspection request submitted successfully! Agent has been notified to confirm your slot.
              </p>
            </div>

            {/* Appointment Card */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 text-left space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/60">
                <span className="text-slate-500 font-medium">Hostel:</span>
                <span className="font-bold text-slate-900 dark:text-white line-clamp-1">{property.title}</span>
              </div>
              {confirmedDetails?.roomName && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-500 font-medium">Room / Space:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{confirmedDetails?.roomName}</span>
                </div>
              )}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/60">
                <span className="text-slate-500 font-medium">Mode:</span>
                <span className={`font-black uppercase ${confirmedDetails?.mode === 'VIRTUAL' ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {confirmedDetails?.mode === 'VIRTUAL' ? 'VIRTUAL Inspection' : 'PHYSICAL Inspection'}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/60">
                <span className="text-slate-500 font-medium">Date & Time:</span>
                <span className="font-bold text-slate-900 dark:text-white">📅 {confirmedDetails?.date} • {confirmedDetails?.time}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Hostel Agent:</span>
                <span className="font-bold text-slate-900 dark:text-white">{property.provider?.name || (property as any).providerName || 'Verified Agent'}</span>
              </div>
            </div>

            {/* In-App Direct Chat & Close Actions */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleOpenInAppChat}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Message Agent</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Done / Close
              </button>
            </div>
          </div>
        ) : (
          /* Inspection Form */
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Selected Property Display */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60">
              <img
                src={property.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=400&q=80'}
                alt={property.title}
                className="w-14 h-14 rounded-xl object-cover flex-shrink-0 shadow-xs"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                  <MapPin className="w-3 h-3" />
                  <span>{property.area?.name || (property as any).areaName || 'Ogbomoso'}</span>
                </div>
                <h4 className="font-black text-xs text-slate-900 dark:text-white truncate">
                  {property.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Agent: {property.provider?.name || (property as any).providerName || 'Verified Agent'}
                </p>
              </div>
            </div>

            {/* 2. Inspection Mode Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Choose Inspection Mode
              </label>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setInspectionType('PHYSICAL')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                    inspectionType === 'PHYSICAL'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <Footprints className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-black">Physical Visit</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      Walkthrough in person at the property.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectionType('VIRTUAL')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                    inspectionType === 'VIRTUAL'
                      ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-950 dark:text-purple-200 ring-2 ring-purple-500/20 shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <Video className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-black">Virtual Tour</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      Live video walkthrough with the Agent.
                    </p>
                  </div>
                </button>
              </div>

              {/* Dynamic Remote Notice */}
              {inspectionType === 'VIRTUAL' && (
                <div className="mt-2.5 p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex items-start gap-2 text-xs text-purple-900 dark:text-purple-200 animate-in fade-in duration-200">
                  <Video className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Remote Live Video Call:</strong> The inspection will happen remotely through a live video call with the Agent. You can inspect all rooms and test utilities without travelling to the hostel.
                  </p>
                </div>
              )}
            </div>

            {/* 3. Room / Space Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Select Room / Space to Inspect</span>
                {availableRooms.length > 0 && (
                  <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">
                    {availableRooms.length} room type{availableRooms.length > 1 ? 's' : ''} available
                  </span>
                )}
              </label>

              {availableRooms.length > 0 ? (
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  {availableRooms.map(room => (
                    <option key={room.id} value={room.id}>
                      {room.name || room.type.replace(/_/g, ' ')} ({room.quantityAvailable ?? 1} available)
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BedDouble className="w-4 h-4 text-slate-500" />
                    <span>Entire Property / Standard Ensuite Unit</span>
                  </span>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                    Available
                  </span>
                </div>
              )}
            </div>

            {/* 4. Preferred Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {inspectionType === 'VIRTUAL' ? 'Preferred Date & Time for Virtual Tour' : 'Preferred Date for Physical Visit'}
              </label>
              <input
                type="date"
                value={preferredDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            {/* 5. Virtual Inspection Time Slots (Backend Powered) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Available Time Slots
                </label>
                {loadingSlots && (
                  <span className="text-[10px] text-slate-400 animate-pulse flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Checking Agent schedule...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {DEFAULT_SLOTS.map(slot => {
                  const isBooked = bookedSlots.includes(slot);
                  const isSelected = preferredTime === slot;

                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isBooked}
                      onClick={() => setPreferredTime(slot)}
                      className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                        isBooked
                          ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 line-through cursor-not-allowed opacity-60'
                          : isSelected
                          ? inspectionType === 'VIRTUAL'
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-2 ring-purple-400'
                            : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span>{slot}</span>
                      <span className="text-[9px] font-medium tracking-tight">
                        {isBooked ? 'Booked' : isSelected ? 'Selected' : 'Open'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. Student Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Your Contact Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  placeholder="e.g. 0803 123 4567"
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  className="w-full text-xs font-bold pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                The Agent will use this contact number regarding your inspection schedule.
              </p>
            </div>

            {/* 7. Specific Questions / Inquiries */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Specific Inquiries or Checks (Optional)
                </label>
                <span className="text-[10px] text-slate-400">Click chips to add</span>
              </div>

              {/* Clickable Suggestion Chips */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {SUGGESTED_QUESTIONS.map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleAddQuestionChip(q)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>+ {q}</span>
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                placeholder="Tell the Agent what you would like to see or verify during the virtual tour."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium resize-none"
              />
            </div>

            {/* 8. Virtual Tour Confirmation Summary */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
              <div className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider pb-1 border-b border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Inspection Request Summary</span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700/60">
                <span className="text-slate-500 font-medium">Property:</span>
                <span className="font-bold text-slate-900 dark:text-white line-clamp-1">{property.title}</span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700/60">
                <span className="text-slate-500 font-medium">Room / Space:</span>
                <span className="font-bold text-slate-900 dark:text-white">{roomDisplayName}</span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700/60">
                <span className="text-slate-500 font-medium">Date & Time:</span>
                <span className="font-bold text-slate-900 dark:text-white">📅 {preferredDate} at {preferredTime}</span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700/60">
                <span className="text-slate-500 font-medium">Mode:</span>
                <span className={`font-black uppercase ${inspectionType === 'VIRTUAL' ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {inspectionType === 'VIRTUAL' ? 'Virtual Tour' : 'Physical Visit'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Contact:</span>
                <span className="font-bold text-slate-900 dark:text-white">{studentPhone || user?.phone || 'Provided upon confirm'}</span>
              </div>
            </div>

            {/* Anti-Scam Security Notice */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-950 dark:text-emerald-200 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] leading-relaxed">
                <strong>Anti-Scam Protection:</strong> Never pay caution deposit or rent upfront before inspecting the room with the verified agent.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || (inspectionType === 'VIRTUAL' && bookedSlots.includes(preferredTime))}
                className={`px-6 py-2.5 text-white text-xs font-black rounded-2xl shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                  inspectionType === 'VIRTUAL'
                    ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                }`}
              >
                {submitting 
                  ? 'Submitting...' 
                  : inspectionType === 'VIRTUAL' 
                  ? 'Request Virtual Tour' 
                  : 'Schedule In-Person Inspection'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
