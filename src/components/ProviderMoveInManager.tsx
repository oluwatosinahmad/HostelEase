import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Phone, 
  Mail, 
  MapPin, 
  KeyRound, 
  FileText, 
  Send, 
  Search, 
  Filter, 
  ShieldCheck, 
  AlertCircle,
  Camera,
  Layers,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { formatNaira } from '../utils/formatters';

interface ProviderMoveInManagerProps {
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onOpenConversation?: (propertyId: string, studentId?: string) => void;
}

export const ProviderMoveInManager: React.FC<ProviderMoveInManagerProps> = ({
  onShowToast,
  onOpenConversation
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'today' | 'upcoming' | 'issues' | 'completed'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Issue Response Modal
  const [respondingIssue, setRespondingIssue] = useState<any | null>(null);
  const [issueResponseText, setIssueResponseText] = useState('');
  const [issueActionStatus, setIssueActionStatus] = useState<string>('IN_PROGRESS');
  const [submittingIssueAction, setSubmittingIssueAction] = useState(false);

  // Instructions Edit Modal
  const [editingInstructionsBooking, setEditingInstructionsBooking] = useState<any | null>(null);
  const [instInstructions, setInstInstructions] = useState('');
  const [instKeyPoint, setInstKeyPoint] = useState('');
  const [instEmergencyPhone, setInstEmergencyPhone] = useState('');
  const [instArrivalTime, setInstArrivalTime] = useState('');
  const [submittingInst, setSubmittingInst] = useState(false);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await api.moveIn.getProviderOverview();
      setData(res);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to load move-in management data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const handleUpdate = () => fetchOverview();
    window.addEventListener('hostel_ease_bookings_updated', handleUpdate);
    return () => window.removeEventListener('hostel_ease_bookings_updated', handleUpdate);
  }, []);

  const handleIssueActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondingIssue) return;

    setSubmittingIssueAction(true);
    try {
      await api.moveIn.providerActionIssue(respondingIssue.id, {
        actionStatus: issueActionStatus,
        responseText: issueResponseText
      });
      onShowToast('Issue updated successfully and student notified', 'success');
      setRespondingIssue(null);
      setIssueResponseText('');
      fetchOverview();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update issue', 'error');
    } finally {
      setSubmittingIssueAction(false);
    }
  };

  const handleSaveInstructions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInstructionsBooking) return;

    setSubmittingInst(true);
    try {
      await api.moveIn.updateProviderInstructions(editingInstructionsBooking.booking_id, {
        moveInInstructions: instInstructions,
        keyCollectionPoint: instKeyPoint,
        emergencyPhone: instEmergencyPhone,
        scheduledArrivalTime: instArrivalTime
      });
      onShowToast('Move-in instructions updated for student', 'success');
      setEditingInstructionsBooking(null);
      fetchOverview();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update instructions', 'error');
    } finally {
      setSubmittingInst(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm font-bold text-gray-600">Loading Move-In Management...</p>
      </div>
    );
  }

  const todayList = data?.todayMoveIns || [];
  const upcomingList = data?.upcomingMoveIns || [];
  const issuesList = data?.openIssues || [];
  const completedList = data?.completedMoveIns || [];

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400 text-amber-950 uppercase tracking-wider">
              Phase 12
            </span>
            <span className="text-emerald-200 text-xs font-semibold">Tenant Onboarding & Care</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Move-In & Post-Booking Manager</h2>
          <p className="text-xs text-emerald-100 mt-1 max-w-xl">
            Coordinate student arrivals, key handoffs, room inspections, and resolve move-in maintenance issues in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-3 text-center min-w-[90px]">
            <p className="text-2xl font-black text-white">{todayList.length}</p>
            <p className="text-[10px] font-bold text-emerald-200 uppercase">Today's Move-Ins</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-3 text-center min-w-[90px]">
            <p className="text-2xl font-black text-amber-300">{issuesList.length}</p>
            <p className="text-[10px] font-bold text-emerald-200 uppercase">Open Issues</p>
          </div>
        </div>
      </div>

      {/* Subtabs Filter */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('today')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'today'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Move-Ins Today</span>
          {todayList.length > 0 && (
            <span className="px-1.5 py-0.2 bg-emerald-500 text-white rounded-full text-[10px] font-extrabold">
              {todayList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('upcoming')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'upcoming'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Upcoming Move-Ins</span>
          {upcomingList.length > 0 && (
            <span className="px-1.5 py-0.2 bg-gray-200 text-gray-800 rounded-full text-[10px] font-extrabold">
              {upcomingList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('issues')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'issues'
              ? 'bg-rose-800 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Move-In Issues</span>
          {issuesList.length > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-extrabold animate-pulse">
              {issuesList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('completed')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'completed'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Completed Stays</span>
          <span className="px-1.5 py-0.2 bg-gray-200 text-gray-800 rounded-full text-[10px] font-extrabold">
            {completedList.length}
          </span>
        </button>
      </div>

      {/* 1. TODAY'S MOVE-INS */}
      {activeSubTab === 'today' && (
        <div className="space-y-4">
          {todayList.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-xs">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-800">No Move-Ins Scheduled For Today</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                You do not have any students arriving today. Check upcoming move-ins to prepare room keys and gate access in advance.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todayList.map((item: any) => (
                <div key={item.id} className="bg-white rounded-3xl p-5 border border-emerald-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                    {item.status}
                  </div>

                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-lg">
                      {item.student_name?.[0] || 'S'}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-900">{item.student_name}</h4>
                      <p className="text-xs text-gray-500">Ref: #{item.booking_reference}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {item.property_title} • Room {item.room_name}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-3 space-y-1.5 text-xs text-gray-600 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Scheduled Arrival:</span>
                      <span className="font-bold text-gray-900">{item.scheduled_arrival_time || '10:00 AM - 4:00 PM'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Student Phone:</span>
                      <a href={`tel:${item.student_phone}`} className="font-bold text-emerald-700 hover:underline flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {item.student_phone || 'N/A'}
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Arrival Status:</span>
                      <span className={`font-bold ${item.arrival_confirmed_at ? 'text-emerald-700' : 'text-amber-600'}`}>
                        {item.arrival_confirmed_at ? '✅ Arrived on Premises' : '⏳ En Route'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingInstructionsBooking(item);
                        setInstInstructions(item.move_in_instructions || '');
                        setInstKeyPoint(item.key_collection_point || '');
                        setInstEmergencyPhone(item.emergency_contact_phone || '');
                        setInstArrivalTime(item.scheduled_arrival_time || '10:00 AM - 4:00 PM');
                      }}
                      className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition-colors text-center"
                    >
                      Update Instructions
                    </button>
                    {onOpenConversation && (
                      <button
                        onClick={() => onOpenConversation(item.property_id, item.student_id)}
                        className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
                        title="Message Student"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. UPCOMING MOVE-INS */}
      {activeSubTab === 'upcoming' && (
        <div className="space-y-4">
          {upcomingList.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-xs">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-800">No Upcoming Move-Ins Scheduled</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                New tenant move-in dates will appear here once bookings are confirmed.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingList.map((item: any) => (
                <div key={item.id} className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                        📅 {item.move_in_date}
                      </span>
                      <h4 className="font-extrabold text-sm text-gray-900 mt-2">{item.student_name}</h4>
                      <p className="text-xs text-gray-500">{item.property_title} • Room {item.room_name}</p>
                    </div>
                    <span className="text-xs font-bold text-gray-400">Ref: #{item.booking_reference}</span>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-3 text-xs text-gray-600 space-y-1 mb-4">
                    <p><span className="text-gray-400">Key Collection:</span> <strong className="text-gray-800">{item.key_collection_point || 'Main Gate'}</strong></p>
                    <p><span className="text-gray-400">Contact:</span> <strong className="text-gray-800">{item.student_phone || 'N/A'}</strong></p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingInstructionsBooking(item);
                      setInstInstructions(item.move_in_instructions || '');
                      setInstKeyPoint(item.key_collection_point || '');
                      setInstEmergencyPhone(item.emergency_contact_phone || '');
                      setInstArrivalTime(item.scheduled_arrival_time || '10:00 AM - 4:00 PM');
                    }}
                    className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition-colors"
                  >
                    Set Arrival Window & Instructions
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. MOVE-IN ISSUES TAB */}
      {activeSubTab === 'issues' && (
        <div className="space-y-4">
          {issuesList.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-xs">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-800">No Open Move-In Issues</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                Great job! All tenants have verified their rooms without any reported maintenance issues.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {issuesList.map((issue: any) => (
                <div key={issue.id} className="bg-white rounded-3xl p-5 border border-rose-200 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        issue.severity === 'URGENT' ? 'bg-red-600 text-white animate-pulse' :
                        issue.severity === 'HIGH' ? 'bg-orange-500 text-white' :
                        issue.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-900' :
                        'bg-blue-100 text-blue-900'
                      }`}>
                        {issue.severity} Priority
                      </span>
                      <span className="text-xs font-bold text-gray-500">#{issue.issue_code}</span>
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {issue.category}
                      </span>
                    </div>

                    <span className="text-[11px] font-bold text-gray-400">
                      Reported by {issue.student_name}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-sm text-gray-900 mb-1">{issue.title}</h4>
                  <p className="text-xs text-gray-600 mb-4">{issue.description}</p>

                  {issue.provider_response && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-900 mb-4">
                      <p className="font-bold mb-0.5">Your Response ({issue.status}):</p>
                      <p>{issue.provider_response}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <span className="text-[11px] text-gray-400">
                      Status: <strong className="text-gray-700">{issue.status}</strong>
                    </span>
                    <button
                      onClick={() => {
                        setRespondingIssue(issue);
                        setIssueResponseText(issue.provider_response || '');
                        setIssueActionStatus(issue.status === 'OPEN' ? 'IN_PROGRESS' : issue.status);
                      }}
                      className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Respond / Resolve Issue
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. COMPLETED STAYS */}
      {activeSubTab === 'completed' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedList.map((item: any) => (
              <div key={item.id} className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900">{item.student_name}</h4>
                    <p className="text-xs text-gray-500">{item.property_title} • Room {item.room_name}</p>
                  </div>
                  <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                    ✅ {item.status}
                  </span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <p>Move-In Date: <strong>{item.move_in_date}</strong></p>
                  {item.post_move_in_rating && (
                    <p className="mt-1 text-emerald-700 font-semibold">
                      Student Rating: {item.post_move_in_rating === 'GOOD' ? '😊 Good' : item.post_move_in_rating}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RESPOND TO ISSUE MODAL */}
      {respondingIssue && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in">
            <h3 className="text-lg font-black text-gray-900 mb-1">
              Respond to Move-In Issue
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Issue #{respondingIssue.issue_code}: {respondingIssue.title}
            </p>

            <form onSubmit={handleIssueActionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Action Status</label>
                <select
                  value={issueActionStatus}
                  onChange={e => setIssueActionStatus(e.target.value)}
                  className="w-full text-xs font-bold text-gray-800 bg-gray-50 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ACKNOWLEDGED">Acknowledged (Reviewing request)</option>
                  <option value="IN_PROGRESS">In Progress (Electrician/Plumber dispatched)</option>
                  <option value="WAITING_FOR_STUDENT">Waiting for Student Access</option>
                  <option value="RESOLVED">Resolved (Work completed)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Response / Fix Details for Student</label>
                <textarea
                  required
                  rows={4}
                  value={issueResponseText}
                  onChange={e => setIssueResponseText(e.target.value)}
                  placeholder="e.g. Caretaker Mr. Bello has brought a replacement socket and will visit today by 2:00 PM."
                  className="w-full text-xs text-gray-800 bg-gray-50 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRespondingIssue(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIssueAction}
                  className="px-5 py-2 text-xs font-black text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-sm transition-all"
                >
                  {submittingIssueAction ? 'Updating...' : 'Send Update to Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT INSTRUCTIONS MODAL */}
      {editingInstructionsBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in">
            <h3 className="text-lg font-black text-gray-900 mb-1">
              Move-In Instructions for Student
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Tenant: {editingInstructionsBooking.student_name} • {editingInstructionsBooking.property_title}
            </p>

            <form onSubmit={handleSaveInstructions} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Arrival Window</label>
                <input
                  type="text"
                  value={instArrivalTime}
                  onChange={e => setInstArrivalTime(e.target.value)}
                  placeholder="e.g. 10:00 AM - 4:00 PM"
                  className="w-full text-xs text-gray-800 bg-gray-50 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Key Collection Point</label>
                <input
                  type="text"
                  value={instKeyPoint}
                  onChange={e => setInstKeyPoint(e.target.value)}
                  placeholder="e.g. Caretaker Office / Main Gate House"
                  className="w-full text-xs text-gray-800 bg-gray-50 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Emergency / Gate Contact Phone</label>
                <input
                  type="tel"
                  value={instEmergencyPhone}
                  onChange={e => setInstEmergencyPhone(e.target.value)}
                  placeholder="e.g. 08012345678"
                  className="w-full text-xs text-gray-800 bg-gray-50 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Special Gate & Arrival Instructions</label>
                <textarea
                  rows={3}
                  value={instInstructions}
                  onChange={e => setInstInstructions(e.target.value)}
                  placeholder="e.g. Please bring original payment receipt on your phone. Vehicles can park inside the compound while offloading."
                  className="w-full text-xs text-gray-800 bg-gray-50 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingInstructionsBooking(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInst}
                  className="px-5 py-2 text-xs font-black text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-sm transition-all"
                >
                  {submittingInst ? 'Saving...' : 'Save Instructions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
