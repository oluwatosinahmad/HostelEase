import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  KeyRound, 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Receipt, 
  Navigation, 
  Camera, 
  ShieldCheck, 
  Send, 
  CheckSquare, 
  Square, 
  Sparkles, 
  Info, 
  ArrowRight, 
  X, 
  AlertCircle,
  ThumbsUp,
  Smile,
  Meh,
  Frown,
  LogOut,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatNaira, formatDistance } from '../utils/formatters';
import { MoveInDashboardData, MoveInChecklistItem, MoveInIssue } from '../types/hostelEase';

interface MoveInCenterProps {
  onNavigate: (view: any) => void;
  onOpenConversation?: (propertyId: string, studentId?: string) => void;
  onOpenDispute?: (bookingId: string) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onOpenAI?: () => void;
}

export const MoveInCenter: React.FC<MoveInCenterProps> = ({
  onNavigate,
  onOpenConversation,
  onOpenDispute,
  onShowToast,
  onOpenAI
}) => {
  const { user } = useAuth();
  const [data, setData] = useState<MoveInDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'checklist' | 'directions' | 'documents' | 'issues' | 'moveout'>('checklist');

  // Interactive Checklist State
  const [checklistItems, setChecklistItems] = useState<MoveInChecklistItem[]>([]);
  const [savingChecklist, setSavingChecklist] = useState<boolean>(false);

  // Condition Report Modal
  const [conditionModalOpen, setConditionModalOpen] = useState<boolean>(false);
  const [conditionRating, setConditionRating] = useState<'GOOD' | 'MINOR_ISSUES' | 'MAJOR_ISSUES' | 'NOT_AS_DESCRIBED'>('GOOD');
  const [conditionChecks, setConditionChecks] = useState<Record<string, boolean>>({
    walls: true,
    floor: true,
    ceiling: true,
    windows: true,
    doors: true,
    locks: true,
    electricity: true,
    water: true,
    furniture: true,
    bathroom: true
  });
  const [conditionComments, setConditionComments] = useState<string>('');
  const [submittingCondition, setSubmittingCondition] = useState<boolean>(false);

  // Photo Upload Modal
  const [photoModalOpen, setPhotoModalOpen] = useState<boolean>(false);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [photoCategory, setPhotoCategory] = useState<string>('GENERAL');
  const [photoCaption, setPhotoCaption] = useState<string>('');
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);

  // Report Issue Modal
  const [issueModalOpen, setIssueModalOpen] = useState<boolean>(false);
  const [issueCategory, setIssueCategory] = useState<string>('ELECTRICITY');
  const [issueSeverity, setIssueSeverity] = useState<string>('MEDIUM');
  const [issueTitle, setIssueTitle] = useState<string>('');
  const [issueDescription, setIssueDescription] = useState<string>('');
  const [submittingIssue, setSubmittingIssue] = useState<boolean>(false);

  // Rules Modal
  const [rulesModalOpen, setRulesModalOpen] = useState<boolean>(false);
  const [rulesAcknowledged, setRulesAcknowledged] = useState<boolean>(false);

  // Move-Out Modal
  const [moveOutModalOpen, setMoveOutModalOpen] = useState<boolean>(false);
  const [moveOutDate, setMoveOutDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [submittingMoveOut, setSubmittingMoveOut] = useState<boolean>(false);

  // Post Move-in Check-in Feedback
  const [checkInFeedback, setCheckInFeedback] = useState<string | null>(null);

  const fetchMoveInData = async () => {
    setLoading(true);
    try {
      const res = await api.moveIn.getCurrentStudentMoveIn();
      if (res.hasActiveMoveIn && res.moveIn) {
        setData(res.moveIn);
        setChecklistItems(res.moveIn.checklist?.items || []);
        if (res.moveIn.postMoveInRating) {
          setCheckInFeedback(res.moveIn.postMoveInRating);
        }
      } else {
        setData(null);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Failed to load move-in center', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoveInData();
  }, []);

  // Sync Checklist with localStorage fallback & backend
  const handleToggleChecklistItem = async (itemId: string) => {
    if (!data) return;

    const updated = checklistItems.map(item => 
      item.id === itemId ? { ...item, isCompleted: !item.isCompleted, completedAt: !item.isCompleted ? new Date().toISOString() : undefined } : item
    );
    setChecklistItems(updated);

    // Save locally for instant responsiveness & offline resilience
    localStorage.setItem(`hostelease_movein_chk_${data.bookingId}`, JSON.stringify(updated));

    setSavingChecklist(true);
    try {
      await api.moveIn.updateChecklist(data.bookingId, updated);
      // If payment item or rules item was checked
      const item = updated.find(i => i.id === itemId);
      if (item?.id === 'chk_rules' && item.isCompleted && !rulesAcknowledged) {
        await api.moveIn.acknowledgeRules(data.bookingId, 1);
        setRulesAcknowledged(true);
      }
    } catch (err) {
      console.warn('Checklist sync queued locally due to network');
    } finally {
      setSavingChecklist(false);
    }
  };

  // Confirm Arrival
  const handleConfirmArrival = async () => {
    if (!data) return;
    try {
      await api.moveIn.confirmArrival(data.bookingId);
      onShowToast('Arrival confirmed! Landlord has been notified.', 'success');
      fetchMoveInData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to confirm arrival', 'error');
    }
  };

  // Confirm Move-In Acceptance
  const handleAcceptAccommodation = async () => {
    if (!data) return;
    try {
      await api.moveIn.confirmAcceptance(data.bookingId);
      onShowToast('🎉 Move-in officially accepted! Welcome to your new hostel.', 'success');
      fetchMoveInData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to accept accommodation', 'error');
    }
  };

  // Submit Condition Report
  const handleSubmitConditionReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    setSubmittingCondition(true);
    try {
      await api.moveIn.submitConditionReport(data.bookingId, {
        overallCondition: conditionRating,
        roomChecks: conditionChecks,
        comments: conditionComments
      });
      onShowToast('Room condition check saved successfully', 'success');
      setConditionModalOpen(false);
      fetchMoveInData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to save condition report', 'error');
    } finally {
      setSubmittingCondition(false);
    }
  };

  // Submit Room Photo
  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !photoUrl.trim()) return;

    setUploadingPhoto(true);
    try {
      await api.moveIn.uploadPhoto(data.bookingId, {
        photoUrl: photoUrl.trim(),
        category: photoCategory,
        caption: photoCaption
      });
      onShowToast('Move-in photo saved to evidence record', 'success');
      setPhotoModalOpen(false);
      setPhotoUrl('');
      setPhotoCaption('');
      fetchMoveInData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to upload photo', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Submit Move-In Issue
  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !issueTitle.trim() || !issueDescription.trim()) return;

    setSubmittingIssue(true);
    try {
      await api.moveIn.reportIssue(data.bookingId, {
        category: issueCategory,
        severity: issueSeverity,
        title: issueTitle.trim(),
        description: issueDescription.trim()
      });
      onShowToast('Move-in issue reported directly to landlord', 'success');
      setIssueModalOpen(false);
      setIssueTitle('');
      setIssueDescription('');
      fetchMoveInData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to report issue', 'error');
    } finally {
      setSubmittingIssue(false);
    }
  };

  // Student Confirm Issue Resolution
  const handleConfirmIssueResolution = async (issueId: string, isResolved: boolean) => {
    try {
      const res = await api.moveIn.studentConfirmIssue(issueId, { isResolved });
      onShowToast(res.message || 'Issue updated', 'success');
      fetchMoveInData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update issue status', 'error');
    }
  };

  // Post Move-in Check-in Feedback Submit
  const handleCheckInRating = async (rating: string) => {
    if (!data) return;
    setCheckInFeedback(rating);
    try {
      await api.moveIn.submitCheckInFeedback(data.bookingId, { rating });
      onShowToast('Thank you for checking in!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to record check-in rating', 'error');
    }
  };

  // Move-Out Submit
  const handleSubmitMoveOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    setSubmittingMoveOut(true);
    try {
      await api.moveIn.submitMoveOut(data.bookingId, {
        moveOutDate,
        checklist: { keysReturned: true, roomCleaned: true, electricityHandedOver: true }
      });
      onShowToast('Move-out confirmed! Landlord has been notified for key & caution deposit settlement.', 'success');
      setMoveOutModalOpen(false);
      fetchMoveInData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to submit move-out confirmation', 'error');
    } finally {
      setSubmittingMoveOut(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm font-bold text-gray-700">Loading your Move-In Experience...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl p-10 border border-gray-200 shadow-sm max-w-lg mx-auto">
          <KeyRound className="w-14 h-14 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-xl font-black text-gray-900 mb-2">No Active Move-In Found</h2>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            Your Move-In Center will automatically activate once you book and confirm a verified hostel around LAUTECH.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('search')}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black rounded-xl shadow-sm transition-all"
            >
              Browse Verified Hostels
            </button>
            <button
              onClick={() => onNavigate('history')}
              className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all"
            >
              View Stay History
            </button>
          </div>
        </div>
      </div>
    );
  }

  const completedChecklistCount = checklistItems.filter(i => i.isCompleted).length;
  const totalChecklistCount = checklistItems.length || 1;
  const checklistPercent = Math.round((completedChecklistCount / totalChecklistCount) * 100);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* 1. MOVE-IN HERO & COUNTDOWN CARD */}
      <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Background glow & decorative shapes */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-600/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400 text-amber-950 uppercase tracking-wide">
                {data.countdownText}
              </span>
              <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
                Status: {data.status}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Move-In Center: {data.hostel.title}
            </h1>

            <p className="text-xs sm:text-sm text-emerald-100 max-w-xl leading-relaxed">
              Room {data.room.name} ({data.room.bedspaceNumber}) • Move-in Date: <strong>{data.moveInDate}</strong> ({data.scheduledArrivalTime})
            </p>
          </div>

          {/* Quick Action Progression Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {data.status === 'NOT_STARTED' || data.status === 'PREPARING' || data.status === 'MOVE_IN_DAY' ? (
              <button
                onClick={handleConfirmArrival}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 group"
              >
                <MapPin className="w-4 h-4 group-hover:animate-bounce" />
                <span>I've Arrived at Hostel</span>
              </button>
            ) : data.status === 'ARRIVED' ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => setConditionModalOpen(true)}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-black rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Inspect Room First</span>
                </button>
                <button
                  onClick={handleAcceptAccommodation}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Accept & Confirm Move-In</span>
                </button>
              </div>
            ) : (
              <div className="px-4 py-2 bg-white/10 backdrop-blur rounded-2xl border border-white/20 text-center">
                <span className="text-xs font-black text-emerald-300">✅ Move-In Accepted</span>
                <p className="text-[10px] text-emerald-100 mt-0.5">Welcome to your accommodation!</p>
              </div>
            )}

            {onOpenAI && (
              <button
                onClick={onOpenAI}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                title="Ask AI for packing tips"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Packing Guide</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar for Move-in Preparation */}
        <div className="mt-6 pt-6 border-t border-emerald-800/80">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-200 mb-1.5">
            <span>Move-In Preparation Progress</span>
            <span>{checklistPercent}% Complete ({completedChecklistCount}/{totalChecklistCount} Tasks)</span>
          </div>
          <div className="h-2.5 w-full bg-emerald-950/80 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-400 to-amber-300 rounded-full transition-all duration-300"
              style={{ width: `${checklistPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. SUMMARY GRID: HOSTEL DETAILS, PROVIDER & INSTRUCTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Accommodation Summary */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <img 
              src={data.hostel.coverImage} 
              alt={data.hostel.title} 
              className="w-16 h-16 rounded-2xl object-cover border border-gray-100"
            />
            <div>
              <h3 className="font-black text-sm text-gray-900">{data.hostel.title}</h3>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                {data.hostel.areaName} ({formatDistance(data.hostel.distanceFromCampusKm)} from gate)
              </p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block mt-1">
                Room {data.room.name} • {data.room.bedspaceNumber}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-3 text-xs text-gray-600 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-400">Booking Ref:</span>
              <span className="font-bold text-gray-900">#{data.bookingId.slice(0, 10)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Payment Status:</span>
              <span className="font-bold text-emerald-700">✅ {data.payment.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Balance Remaining:</span>
              <span className="font-bold text-gray-900">{formatNaira(data.payment.outstandingAmount)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Landlord & Caretaker Contact */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Landlord / Caretaker</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800">
              Verified Host
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-base">
              {data.provider.name?.[0] || 'L'}
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-gray-900">{data.provider.name}</h4>
              <p className="text-xs text-gray-500">{data.provider.businessName || 'Hostel Management'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <a
              href={`tel:${data.emergencyContactPhone || data.provider.phone}`}
              className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors text-center"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Host</span>
            </a>

            {onOpenConversation && (
              <button
                onClick={() => onOpenConversation(data.hostel.id, data.provider.id)}
                className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors text-center"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Message</span>
              </button>
            )}
          </div>
        </div>

        {/* Card 3: Key Collection & Gate Instructions */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Key Collection & Access</h3>
            <KeyRound className="w-4 h-4 text-emerald-600" />
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-xs text-emerald-950 space-y-1">
            <p className="font-bold">📍 Pickup Point: {data.keyCollectionPoint}</p>
            <p className="text-emerald-800">{data.instructions}</p>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
            <span>Emergency Gate Phone:</span>
            <span className="font-bold text-gray-800">{data.emergencyContactPhone || 'Available on Arrival'}</span>
          </div>
        </div>

      </div>

      {/* 3. NAVIGATION TABS FOR MOVE-IN WORKFLOW */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3 overflow-x-auto">
        {[
          { id: 'checklist', label: 'Interactive Checklist', icon: CheckSquare, badge: `${completedChecklistCount}/${totalChecklistCount}` },
          { id: 'directions', label: 'Directions & Campus Map', icon: Navigation },
          { id: 'documents', label: 'Documents & Receipts', icon: FileText },
          { id: 'issues', label: 'Reported Issues', icon: AlertTriangle, badge: data.issues.length > 0 ? `${data.issues.length}` : undefined, badgeColor: 'bg-rose-500 text-white' },
          { id: 'moveout', label: 'Move-Out & Deposit', icon: LogOut }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-white/20 text-white' : tab.badgeColor || 'bg-gray-100 text-gray-700'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. TAB 1: INTERACTIVE CHECKLIST */}
      {activeTab === 'checklist' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Phase A: Before Move-in */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">1</span>
                <span>Before Move-In Checklist</span>
              </h3>
              <span className="text-[11px] font-bold text-gray-400">Pre-Arrival</span>
            </div>

            <div className="space-y-2.5">
              {checklistItems.filter(i => i.category === 'BEFORE_MOVE_IN').map(item => (
                <div 
                  key={item.id}
                  onClick={() => handleToggleChecklistItem(item.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    item.isCompleted 
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="mt-0.5">
                    {item.isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 text-xs">
                    <p className={`font-bold ${item.isCompleted ? 'line-through text-emerald-900/80' : 'text-gray-900'}`}>
                      {item.title}
                    </p>
                    {item.id === 'chk_rules' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRulesModalOpen(true);
                        }}
                        className="text-[11px] text-emerald-700 font-extrabold hover:underline mt-1 block"
                      >
                        📖 View Hostel House Rules Document
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Phase B: Move-in Day */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center text-[10px] font-bold">2</span>
                <span>Move-In Day Inspection</span>
              </h3>
              <span className="text-[11px] font-bold text-gray-400">On Premises</span>
            </div>

            <div className="space-y-2.5">
              {checklistItems.filter(i => i.category === 'MOVE_IN_DAY').map(item => (
                <div 
                  key={item.id}
                  onClick={() => handleToggleChecklistItem(item.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    item.isCompleted 
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="mt-0.5">
                    {item.isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 text-xs">
                    <p className={`font-bold ${item.isCompleted ? 'line-through text-emerald-900/80' : 'text-gray-900'}`}>
                      {item.title}
                    </p>
                    {item.id === 'chk_photos' && (
                      <div className="mt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoModalOpen(true);
                          }}
                          className="text-[11px] text-emerald-700 font-extrabold hover:underline flex items-center gap-1"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Upload Room Photos ({data.photos.length})</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Inspection Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setConditionModalOpen(true)}
                className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Room Condition Check</span>
              </button>
              <button
                onClick={() => setIssueModalOpen(true)}
                className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Report Issue</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* 5. TAB 2: DIRECTIONS & CAMPUS MAP */}
      {activeTab === 'directions' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-gray-900">GPS Route & Campus Landmarks</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Exact coordinates verified in Ogbomoso, Oyo State for LAUTECH students.
              </p>
            </div>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${data.hostel.latitude},${data.hostel.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Navigation className="w-4 h-4" />
              <span>Open in Google Maps</span>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-3">
              <h4 className="text-xs font-black uppercase text-gray-400">Hostel Address & Proximity</h4>
              <p className="text-sm font-bold text-gray-900">{data.hostel.address}</p>
              <div className="space-y-1 text-xs text-gray-600">
                <p>📍 Area: <strong className="text-gray-800">{data.hostel.areaName}</strong></p>
                <p>🏫 Campus Distance: <strong className="text-emerald-800">{formatDistance(data.hostel.distanceFromCampusKm)}</strong> from LAUTECH Main Gate</p>
                <p>🚩 Key Landmark: <strong className="text-gray-800">{data.hostel.nearbyLandmark}</strong></p>
              </div>
            </div>

            <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200 space-y-2">
              <h4 className="text-xs font-black uppercase text-emerald-800">Arrival Navigation Tips</h4>
              <ul className="text-xs text-emerald-950 space-y-1.5 list-disc list-inside">
                <li>Bike (Okada) / Keke direction: Tell the driver <em>"{data.hostel.nearbyLandmark}, {data.hostel.title}"</em>.</li>
                <li>Vehicles with luggage can drive directly into the hostel compound for offloading.</li>
                <li>Call caretaker at gate upon arrival: <strong>{data.emergencyContactPhone || data.provider.phone}</strong>.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 3: DOCUMENTS & RECEIPTS */}
      {activeTab === 'documents' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Document 1: Digital Booking Confirmation Voucher */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h4 className="font-bold text-sm text-gray-900">Booking Confirmation Voucher</h4>
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                Verified
              </span>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl text-xs space-y-2 border border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-500">Student:</span>
                <span className="font-bold text-gray-900">{user?.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Hostel:</span>
                <span className="font-bold text-gray-900">{data.hostel.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Allocated Space:</span>
                <span className="font-bold text-gray-900">Room {data.room.name} ({data.room.bedspaceNumber})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Check-in Date:</span>
                <span className="font-bold text-gray-900">{data.moveInDate}</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('bookings')}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-colors"
            >
              View Full Booking Voucher
            </button>
          </div>

          {/* Document 2: Hostel Rules & Versioned Acknowledgement */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h4 className="font-bold text-sm text-gray-900">Hostel House Rules</h4>
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                Version 1.0
              </span>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Quiet hours, visitor access policy, waste disposal, security gate closing times, and electricity guidelines.
            </p>

            <button
              onClick={() => setRulesModalOpen(true)}
              className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition-colors"
            >
              Read & Acknowledge House Rules
            </button>
          </div>

        </div>
      )}

      {/* 7. TAB 4: REPORTED ISSUES */}
      {activeTab === 'issues' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-gray-900">Move-In Problem & Maintenance Tracker</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Report defects immediately upon arrival. Landlord must acknowledge and resolve within agreed timeframe.
              </p>
            </div>
            <button
              onClick={() => setIssueModalOpen(true)}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black rounded-xl shadow-sm transition-all"
            >
              + Report New Problem
            </button>
          </div>

          {data.issues.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-200 rounded-2xl">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-800">No issues reported</p>
              <p className="text-xs text-gray-400 mt-0.5">Everything looks clear with your accommodation check.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.issues.map((issue: MoveInIssue) => (
                <div key={issue.id} className="p-4 rounded-2xl border border-gray-200 bg-gray-50 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        issue.severity === 'URGENT' ? 'bg-red-600 text-white' :
                        issue.severity === 'HIGH' ? 'bg-orange-500 text-white' :
                        'bg-blue-100 text-blue-900'
                      }`}>
                        {issue.severity}
                      </span>
                      <h4 className="font-extrabold text-sm text-gray-900">{issue.title}</h4>
                      <span className="text-[11px] text-gray-400">({issue.category})</span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      issue.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                      issue.status === 'ESCALATED' ? 'bg-purple-100 text-purple-800' :
                      'bg-amber-100 text-amber-900'
                    }`}>
                      Status: {issue.status}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600">{issue.description}</p>

                  {issue.providerResponse && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950">
                      <p className="font-bold mb-0.5">Landlord Response:</p>
                      <p>{issue.providerResponse}</p>
                    </div>
                  )}

                  {issue.status !== 'RESOLVED' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                      <button
                        onClick={() => handleConfirmIssueResolution(issue.id, true)}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        ✅ Problem Resolved
                      </button>
                      <button
                        onClick={() => handleConfirmIssueResolution(issue.id, false)}
                        className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold rounded-lg transition-colors"
                      >
                        ⚠️ Still Unresolved (Escalate Dispute)
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 8. TAB 5: MOVE-OUT & DEPOSIT */}
      {activeTab === 'moveout' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-gray-900">Move-Out Preparation & Caution Deposit</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                When your academic session ends, submit your move-out check for key handover and deposit refund.
              </p>
            </div>
            <button
              onClick={() => setMoveOutModalOpen(true)}
              className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-black rounded-xl shadow-sm transition-all"
            >
              Initiate Move-Out
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
              <h4 className="font-bold text-gray-900">Caution Deposit Status</h4>
              <p className="text-gray-500">Paid Amount: <strong className="text-gray-900">{formatNaira(data.payment.cautionDeposit)}</strong></p>
              <p className="text-emerald-700 font-semibold">Status: Eligible for full refund upon return of room keys & undamaged property.</p>
            </div>

            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2 text-xs text-emerald-950">
              <h4 className="font-bold">Move-Out Checklist Items</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Clean and remove personal belongings from room.</li>
                <li>Hand over all room keys and gate cards to caretaker.</li>
                <li>Confirm final meter reading and clear any personal bills.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 9. POST-MOVE-IN CHECK-IN WIDGET */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-black text-gray-900">How is your accommodation so far?</h4>
          <p className="text-xs text-gray-500 mt-0.5">Your honest rating helps ensure quality student living at LAUTECH.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCheckInRating('GOOD')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              checkInFeedback === 'GOOD' ? 'bg-emerald-800 text-white shadow-sm' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <Smile className="w-4 h-4 text-emerald-500" />
            <span>😊 Good</span>
          </button>
          <button
            onClick={() => handleCheckInRating('MINOR_PROBLEMS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              checkInFeedback === 'MINOR_PROBLEMS' ? 'bg-amber-800 text-white shadow-sm' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <Meh className="w-4 h-4 text-amber-500" />
            <span>😐 Some Problems</span>
          </button>
          <button
            onClick={() => {
              handleCheckInRating('SERIOUS_PROBLEM');
              setIssueModalOpen(true);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              checkInFeedback === 'SERIOUS_PROBLEM' ? 'bg-rose-800 text-white shadow-sm' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <Frown className="w-4 h-4 text-rose-500" />
            <span>😞 Serious Problem</span>
          </button>
        </div>
      </div>

      {/* MODAL 1: ROOM CONDITION INSPECTION CHECK */}
      {conditionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-in fade-in max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-gray-900 mb-1">
              Room Condition Inspection
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Check all elements before accepting your key handoff for {data.hostel.title}.
            </p>

            <form onSubmit={handleSubmitConditionReport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Overall Condition</label>
                <select
                  value={conditionRating}
                  onChange={e => setConditionRating(e.target.value as any)}
                  className="w-full text-xs font-bold text-gray-800 bg-gray-50 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="GOOD">Good — Everything as advertised</option>
                  <option value="MINOR_ISSUES">Minor Issues (Lightbulb, tap dripping, etc.)</option>
                  <option value="MAJOR_ISSUES">Major Issues (No water/power, door lock damaged)</option>
                  <option value="NOT_AS_DESCRIBED">Hostel Not As Described in listing</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Itemized Element Checks</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.keys(conditionChecks).map(key => (
                    <label key={key} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer capitalize">
                      <input
                        type="checkbox"
                        checked={conditionChecks[key]}
                        onChange={e => setConditionChecks({ ...conditionChecks, [key]: e.target.checked })}
                        className="rounded text-emerald-600"
                      />
                      <span className="font-semibold">{key}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Inspection Notes & Comments</label>
                <textarea
                  rows={3}
                  value={conditionComments}
                  onChange={e => setConditionComments(e.target.value)}
                  placeholder="e.g. Walls freshly painted, ceiling fan working properly..."
                  className="w-full text-xs text-gray-800 bg-gray-50 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConditionModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCondition}
                  className="px-5 py-2 text-xs font-black text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-sm transition-all"
                >
                  {submittingCondition ? 'Saving...' : 'Save Inspection Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD ROOM PHOTO */}
      {photoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in">
            <h3 className="text-lg font-black text-gray-900 mb-1">
              Add Room Condition Photo
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Upload photos to protect your caution deposit record.
            </p>

            <form onSubmit={handleUploadPhoto} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Photo URL *</label>
                <input
                  type="url"
                  required
                  value={photoUrl}
                  onChange={e => setPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full text-xs text-gray-800 bg-gray-50 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                <select
                  value={photoCategory}
                  onChange={e => setPhotoCategory(e.target.value)}
                  className="w-full text-xs font-bold text-gray-800 bg-gray-50 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="GENERAL">General Room View</option>
                  <option value="WALL">Walls & Paint</option>
                  <option value="LOCK">Door Lock & Security</option>
                  <option value="BATHROOM">Bathroom & Water</option>
                  <option value="ELECTRICITY">Prepaid Meter / Socket</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Caption / Details</label>
                <input
                  type="text"
                  value={photoCaption}
                  onChange={e => setPhotoCaption(e.target.value)}
                  placeholder="e.g. Move-in day initial photo of room door lock"
                  className="w-full text-xs text-gray-800 bg-gray-50 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPhotoModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingPhoto}
                  className="px-5 py-2 text-xs font-black text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-sm transition-all"
                >
                  {uploadingPhoto ? 'Saving...' : 'Save Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REPORT MOVE-IN ISSUE */}
      {issueModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-in fade-in">
            <h3 className="text-lg font-black text-gray-900 mb-1">
              Report Move-In Problem
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Your report will be sent directly to the landlord and recorded in Hostel Ease Trust records.
            </p>

            <form onSubmit={handleSubmitIssue} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={issueCategory}
                    onChange={e => setIssueCategory(e.target.value)}
                    className="w-full text-xs font-bold text-gray-800 bg-gray-50 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ELECTRICITY">Electricity & Power</option>
                    <option value="WATER">Water Flow / Plumbing</option>
                    <option value="ROOM">Room Structure / Window</option>
                    <option value="SECURITY">Door Lock / Gate Security</option>
                    <option value="CLEANLINESS">Cleanliness / Compound</option>
                    <option value="BATHROOM">Bathroom & Toilet</option>
                    <option value="OTHER">Other Issue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Severity</label>
                  <select
                    value={issueSeverity}
                    onChange={e => setIssueSeverity(e.target.value)}
                    className="w-full text-xs font-bold text-gray-800 bg-gray-50 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="LOW">Low (Can wait few days)</option>
                    <option value="MEDIUM">Medium (Fix needed soon)</option>
                    <option value="HIGH">High (Affects daily stay)</option>
                    <option value="URGENT">Urgent (Safety / Security / No Water)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={issueTitle}
                  onChange={e => setIssueTitle(e.target.value)}
                  placeholder="e.g. Socket not providing power in bedroom"
                  className="w-full text-xs text-gray-800 bg-gray-50 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Detailed Description *</label>
                <textarea
                  required
                  rows={4}
                  value={issueDescription}
                  onChange={e => setIssueDescription(e.target.value)}
                  placeholder="Explain what is wrong, when you noticed it, and how it impacts your stay..."
                  className="w-full text-xs text-gray-800 bg-gray-50 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIssueModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIssue}
                  className="px-5 py-2 text-xs font-black text-white bg-rose-700 hover:bg-rose-800 rounded-xl shadow-sm transition-all"
                >
                  {submittingIssue ? 'Submitting...' : 'Send Issue Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: HOUSE RULES DOCUMENT & ACKNOWLEDGEMENT */}
      {rulesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-in fade-in max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-gray-900 mb-1">
              Hostel House Rules & Conduct
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Rules effective for {data.hostel.title} (LAUTECH, Ogbomoso)
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs text-gray-700 space-y-2 mb-6">
              <p><strong>1. Quiet Hours:</strong> 10:00 PM – 6:00 AM daily. Please keep music and noise at minimal volume.</p>
              <p><strong>2. Gate Policy:</strong> Main compound gate locks at 11:00 PM for tenant safety.</p>
              <p><strong>3. Visitors:</strong> Day visitors are permitted. Overnight non-student guests require advance notification.</p>
              <p><strong>4. Waste Disposal:</strong> All garbage must be bagged and deposited in the designated compound bins.</p>
              <p><strong>5. Electricity Usage:</strong> Heavy appliances (hot plates over 1500W) must adhere to power regulations.</p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRulesModalOpen(false)}
                className="px-5 py-2 text-xs font-black text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-sm transition-all"
              >
                I Understand & Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: MOVE-OUT MODAL */}
      {moveOutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in">
            <h3 className="text-lg font-black text-gray-900 mb-1">
              Confirm Move-Out & Key Return
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Declare your departure date to initiate caution deposit reconciliation.
            </p>

            <form onSubmit={handleSubmitMoveOut} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Departure Date</label>
                <input
                  type="date"
                  required
                  value={moveOutDate}
                  onChange={e => setMoveOutDate(e.target.value)}
                  className="w-full text-xs text-gray-800 bg-gray-50 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                <p className="font-bold">Caution Deposit: {formatNaira(data.payment.cautionDeposit)}</p>
                <p className="text-[11px] mt-0.5">The landlord will inspect the room and release the deposit accordingly.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMoveOutModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMoveOut}
                  className="px-5 py-2 text-xs font-black text-white bg-gray-900 hover:bg-black rounded-xl shadow-sm transition-all"
                >
                  {submittingMoveOut ? 'Confirming...' : 'Confirm Move-Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
