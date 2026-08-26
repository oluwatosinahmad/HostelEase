import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Video, 
  Footprints, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  MessageSquare, 
  ExternalLink, 
  Edit3, 
  Star, 
  ChevronRight, 
  Search, 
  HelpCircle,
  FileText,
  Lock,
  Receipt
} from 'lucide-react';
import { InspectionRequest, InspectionStatus } from '../types/hostelEase';
import { api } from '../services/api';
import { formatNaira, formatDistance } from '../utils/formatters';

interface StudentInspectionCenterProps {
  onOpenConversation: (propertyId: string) => void;
  onNavigateToSearch: () => void;
  onReserveHostel?: (propertyId: string) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const StudentInspectionCenter: React.FC<StudentInspectionCenterProps> = ({
  onOpenConversation,
  onNavigateToSearch,
  onReserveHostel,
  onShowToast
}) => {
  const [inspections, setInspections] = useState<InspectionRequest[]>([]);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);

  // Modals & Active Action States
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState<string>('');
  const [savingNotes, setSavingNotes] = useState<boolean>(false);

  const [feedbackInspectionId, setFeedbackInspectionId] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);

  const [cancelModalId, setCancelModalId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  const [virtualLinkModal, setVirtualLinkModal] = useState<{ isOpen: boolean; url: string; title: string } | null>(null);

  const fetchInspections = () => {
    setLoading(true);
    api.inspections.getAll({ status: activeTab === 'ALL' ? undefined : activeTab })
      .then(res => {
        setInspections(res.inspections || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load inspections:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchInspections();
  }, [activeTab]);

  const handleConfirmReschedule = async (id: string) => {
    try {
      await api.inspections.confirmReschedule(id);
      onShowToast('Reschedule confirmed! Your inspection slot is updated.', 'success');
      fetchInspections();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to confirm reschedule', 'error');
    }
  };

  const handleCancelInspection = async () => {
    if (!cancelModalId) return;
    try {
      await api.inspections.cancel(cancelModalId, cancelReason);
      onShowToast('Inspection cancelled', 'info');
      setCancelModalId(null);
      setCancelReason('');
      fetchInspections();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to cancel inspection', 'error');
    }
  };

  const handleSaveNotes = async (id: string) => {
    setSavingNotes(true);
    try {
      await api.inspections.savePrivateNotes(id, notesText);
      onShowToast('Private inspection notes saved', 'success');
      setEditingNotesId(null);
      fetchInspections();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to save notes', 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackInspectionId) return;
    setSubmittingFeedback(true);
    try {
      await api.inspections.submitFeedback(feedbackInspectionId, feedbackRating, feedbackComment);
      onShowToast('Thank you for rating your inspection experience!', 'success');
      setFeedbackInspectionId(null);
      setFeedbackComment('');
      fetchInspections();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to submit feedback', 'error');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleJoinVirtual = async (inspection: InspectionRequest) => {
    try {
      const res = await api.inspections.getVirtualLink(inspection.id);
      if (res.virtualMeetingUrl) {
        setVirtualLinkModal({
          isOpen: true,
          url: res.virtualMeetingUrl,
          title: inspection.propertyTitle
        });
      } else {
        onShowToast('Virtual meeting room will be ready shortly before your scheduled slot', 'info');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Could not access virtual meeting link', 'error');
    }
  };

  const tabs = [
    { key: 'ALL', label: 'All' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'CONFIRMED', label: 'Confirmed' },
    { key: 'RESCHEDULE_REQUESTED', label: 'Rescheduled' },
    { key: 'COMPLETED', label: 'Completed' },
    { key: 'CANCELLED', label: 'Cancelled' }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider">
              Student Hub
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Calendar className="w-7 h-7 text-emerald-600" />
            My Hostel Inspections
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Track scheduled physical and virtual hostel visits, manage reschedules, and record private notes.
          </p>
        </div>

        <button
          onClick={onNavigateToSearch}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5"
        >
          <Search className="w-3.5 h-3.5" /> Book New Inspection
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Loading your inspections...</p>
        </div>
      ) : inspections.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-base text-slate-800">No {activeTab !== 'ALL' ? activeTab.toLowerCase().replace(/_/g, ' ') : ''} inspections found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            When you find hostels you like, book an inspection to inspect the water, power, and room condition before paying.
          </p>
          <button
            onClick={onNavigateToSearch}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow"
          >
            Explore Verified Hostels
          </button>
        </div>
      ) : (
        /* Inspections List */
        <div className="space-y-4">
          {inspections.map(insp => {
            const isConfirmed = insp.status === 'CONFIRMED';
            const isPending = insp.status === 'PENDING';
            const isReschedule = insp.status === 'RESCHEDULE_REQUESTED';
            const isCompleted = insp.status === 'COMPLETED';
            const isCancelled = insp.status === 'CANCELLED' || insp.status === 'NO_SHOW';

            return (
              <div
                key={insp.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-4 sm:p-6 space-y-4"
              >
                {/* Top Row: Cover, Title & Status Pill */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={insp.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'}
                      alt={insp.propertyTitle}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-slate-100 flex-shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                          insp.inspectionType === 'VIRTUAL' ? 'bg-purple-100 text-purple-900' : 'bg-blue-100 text-blue-900'
                        }`}>
                          {insp.inspectionType === 'VIRTUAL' ? '📹 Virtual Video Tour' : '🚶 Physical Visit'}
                        </span>
                        {insp.roomName && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                            {insp.roomName}
                          </span>
                        )}
                      </div>

                      <h3 className="font-black text-sm sm:text-base text-slate-900">
                        {insp.propertyTitle}
                      </h3>
                      <p className="text-xs text-slate-500">
                        📍 {insp.areaName} {insp.nearbyLandmark ? `(Near ${insp.nearbyLandmark})` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                      isConfirmed ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                      isPending ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      isReschedule ? 'bg-purple-100 text-purple-900 border border-purple-300' :
                      isCompleted ? 'bg-slate-100 text-slate-800' :
                      'bg-rose-100 text-rose-900'
                    }`}>
                      {insp.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Reschedule Proposal Alert Banner */}
                {isReschedule && (
                  <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-950 space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2 font-bold text-purple-900">
                      <AlertCircle className="w-4 h-4 text-purple-700" />
                      <span>The landlord proposed a new time slot:</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-purple-200 font-black text-sm text-purple-950">
                      📅 {insp.proposedAlternativeDate} at {insp.proposedAlternativeTime}
                    </div>
                    {insp.rescheduleReason && (
                      <p className="text-slate-600 text-[11px]">Note from provider: "{insp.rescheduleReason}"</p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleConfirmReschedule(insp.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
                      >
                        Accept New Time
                      </button>
                      <button
                        onClick={() => setCancelModalId(insp.id)}
                        className="px-3 py-2 bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 font-bold text-xs rounded-xl transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {/* Schedule Details Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Date & Time</span>
                    <p className="font-black text-slate-900 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      {insp.preferredDate} at {insp.preferredTime}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Hostel Provider</span>
                    <p className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      {insp.providerName || 'Verified Landlord'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Meeting Protocol</span>
                    <p className="font-medium text-slate-700 mt-0.5">
                      {insp.inspectionType === 'VIRTUAL' ? 'Private Virtual Link' : 'Physical Landmark Meetup'}
                    </p>
                  </div>
                </div>

                {/* Private Notes Section (Completed or Confirmed) */}
                {(isCompleted || isConfirmed) && (
                  <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>My Private Inspection Notes</span>
                        <span className="text-[10px] text-slate-400 font-normal">(Only visible to you)</span>
                      </div>
                      {editingNotesId !== insp.id && (
                        <button
                          onClick={() => {
                            setEditingNotesId(insp.id);
                            setNotesText(insp.privateStudentNotes || '');
                          }}
                          className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          {insp.privateStudentNotes ? 'Edit Notes' : 'Add Notes'}
                        </button>
                      )}
                    </div>

                    {editingNotesId === insp.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          placeholder="e.g. Room was spacious, water pressure was good, landlord seems friendly..."
                          rows={2}
                          className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingNotesId(null)}
                            className="px-3 py-1 text-xs text-slate-500 hover:text-slate-800"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveNotes(insp.id)}
                            disabled={savingNotes}
                            className="px-4 py-1.5 bg-slate-900 text-white font-bold text-xs rounded-xl"
                          >
                            {savingNotes ? 'Saving...' : 'Save Notes'}
                          </button>
                        </div>
                      </div>
                    ) : insp.privateStudentNotes ? (
                      <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
                        "{insp.privateStudentNotes}"
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No private notes added yet.</p>
                    )}
                  </div>
                )}

                {/* Experience Feedback CTA (For Completed inspections) */}
                {isCompleted && !insp.feedbackRating && (
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <p className="font-bold text-emerald-950">How was your inspection experience?</p>
                      <p className="text-[11px] text-emerald-800">Help Hostel Ease measure accommodation provider quality.</p>
                    </div>
                    <button
                      onClick={() => setFeedbackInspectionId(insp.id)}
                      className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs"
                    >
                      Rate Visit
                    </button>
                  </div>
                )}

                {/* Action Buttons Row */}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    {/* Message Provider Button */}
                    <button
                      onClick={() => onOpenConversation(insp.propertyId)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      Chat with Provider
                    </button>

                    {/* Reserve Space CTA (for completed or confirmed inspections) */}
                    {onReserveHostel && (isCompleted || isConfirmed) && (
                      <button
                        onClick={() => onReserveHostel(insp.propertyId)}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Reserve This Hostel
                      </button>
                    )}

                    {/* Join Virtual Inspection Button */}
                    {insp.inspectionType === 'VIRTUAL' && isConfirmed && (
                      <button
                        onClick={() => handleJoinVirtual(insp)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md shadow-purple-600/30 transition-all flex items-center gap-1.5 animate-pulse"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Join Virtual Tour
                      </button>
                    )}
                  </div>

                  {/* Cancel Button */}
                  {(isPending || isConfirmed) && (
                    <button
                      onClick={() => setCancelModalId(insp.id)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline"
                    >
                      Cancel Inspection
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Reason Modal */}
      {cancelModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-black text-base text-slate-900">Cancel Inspection</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to cancel this scheduled inspection? The provider will be notified.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Reason for cancelling (optional)</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Schedule conflict, found another lodge, etc."
                rows={3}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setCancelModalId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Keep Inspection
              </button>
              <button
                onClick={handleCancelInspection}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Virtual Link Meeting Modal */}
      {virtualLinkModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mx-auto">
              <Video className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-base text-slate-900">Join Virtual Inspection Tour</h3>
              <p className="text-xs text-slate-500">
                You are about to enter the live video inspection room for <strong>{virtualLinkModal.title}</strong>.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-mono text-slate-700 break-all">
              {virtualLinkModal.url}
            </div>

            <p className="text-[11px] text-slate-400">
              💡 <strong>Tip:</strong> Ensure your camera and microphone are permitted in your browser.
            </p>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setVirtualLinkModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
              <a
                href={virtualLinkModal.url}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2 text-xs font-black bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-600/30 flex items-center gap-1.5"
              >
                <span>Launch Meeting Room</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Experience Modal */}
      {feedbackInspectionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-black text-base text-slate-900">Rate Inspection Experience</h3>
            <p className="text-xs text-slate-500">
              How smooth and truthful was your inspection visit with the accommodation provider?
            </p>

            {/* Star Rating */}
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFeedbackRating(star)}
                  className="p-1 hover:scale-125 transition-transform"
                >
                  <Star className={`w-7 h-7 ${star <= feedbackRating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Feedback or comments (optional)</label>
              <textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="e.g. Landlord was on time, property matched description..."
                rows={3}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setFeedbackInspectionId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Skip
              </button>
              <button
                onClick={handleSubmitFeedback}
                disabled={submittingFeedback}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow"
              >
                {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
