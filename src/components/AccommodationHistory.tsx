import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Calendar, 
  Clock, 
  MapPin, 
  KeyRound, 
  Receipt, 
  CheckCircle2, 
  History, 
  ArrowRight, 
  ShieldCheck, 
  Send 
} from 'lucide-react';
import { api } from '../services/api';
import { formatNaira } from '../utils/formatters';
import { AccommodationStay } from '../types/hostelEase';

interface AccommodationHistoryProps {
  onNavigate: (view: any) => void;
  onOpenConversation?: (propertyId: string, studentId?: string) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const AccommodationHistory: React.FC<AccommodationHistoryProps> = ({
  onNavigate,
  onOpenConversation,
  onShowToast
}) => {
  const [stays, setStays] = useState<AccommodationStay[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.moveIn.getStudentHistory();
      setStays(res.stays || []);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to load accommodation history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm font-bold text-gray-700">Loading your stay history...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-black text-gray-900">Accommodation History</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Your verified records of student accommodation, leases, and move-ins at LAUTECH.
          </p>
        </div>

        <button
          onClick={() => onNavigate('move-in')}
          className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 self-start"
        >
          <KeyRound className="w-4 h-4" />
          <span>Active Move-In Hub</span>
        </button>
      </div>

      {stays.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-xs">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800">No Stay History Yet</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-6">
            When you book and move into verified student hostels around LAUTECH, your full timeline will appear here.
          </p>
          <button
            onClick={() => onNavigate('search')}
            className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black rounded-xl shadow-sm transition-all"
          >
            Find Student Hostels
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {stays.map(stay => (
            <div key={stay.bookingId} className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-3">
                  {stay.coverImage ? (
                    <img 
                      src={stay.coverImage} 
                      alt={stay.propertyTitle} 
                      className="w-14 h-14 rounded-2xl object-cover border border-gray-100"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      <Building2 className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900">{stay.propertyTitle}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {stay.propertyAddress} ({stay.areaName})
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                    stay.bookingStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                    stay.bookingStatus === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {stay.moveInStatus || stay.bookingStatus}
                  </span>
                  <p className="text-xs font-bold text-gray-900 mt-1">{formatNaira(stay.rentAmount)} / yr</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 rounded-2xl p-3.5 text-xs text-gray-600">
                <div>
                  <span className="text-gray-400 block text-[11px]">Room Allocated:</span>
                  <span className="font-bold text-gray-800">{stay.roomName} ({stay.roomType})</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Session / Duration:</span>
                  <span className="font-bold text-gray-800">{stay.academicSession} ({stay.durationMonths} mos)</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Move-In Date:</span>
                  <span className="font-bold text-gray-800">{stay.moveInDate}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Host / Landlord:</span>
                  <span className="font-bold text-gray-800">{stay.providerName}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-gray-400">Ref: #{stay.bookingReference}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigate('payments')}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
                  >
                    View Receipt
                  </button>
                  <button
                    onClick={() => onNavigate('move-in')}
                    className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    Open Move-In Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
