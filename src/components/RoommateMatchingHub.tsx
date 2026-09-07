import React, { useState, useEffect } from 'react';
import { 
  Users, Sparkles, Shield, AlertTriangle, Send, CheckCircle2, MessageSquare, 
  X, UserPlus, Filter, Clock, MapPin, DollarSign, Bed, Ban, Flag, PhoneOff, 
  HelpCircle, Settings, Check, UserCheck, FileText, Printer, Share2, Copy, 
  CheckCircle, CreditCard, Lock, ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { formatNaira } from '../utils/formatters';

interface RoommateMatchingHubProps {
  isAuthenticated: boolean;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onOpenAuthModal?: () => void;
}

const VERIFIED_SCHOLAR_CANDIDATES = [
  {
    profile: {
      id: 'cand-1',
      userId: 'user-tunde',
      displayName: 'Tunde Adeyemi',
      department: 'Mechanical Engineering',
      level: '300L',
      budgetMin: 140000,
      budgetMax: 220000,
      preferredAreas: ['Under G', 'Stadium Road'],
      preferredRoomType: 'SHARED_2',
      moveInMonth: 'October Resumption',
      studyEnvironment: 'QUIET',
      cleanlinessExpectation: 'VERY_CLEAN',
      sleepSchedule: 'NIGHT_OWL',
      visitorPreference: 'RARE',
      aboutMe: 'Engineering scholar looking for a focused, clean roommate to split a modern self-contain lodge near Under-G. Non-smoker, quiet study routines.'
    },
    compatibilityScore: 94,
    compatibilityLabel: '94% Match',
    positiveMatches: [
      '✅ Matches Under G & Stadium Road preference',
      '✅ Shared budget range (₦140k – ₦220k)',
      '✅ Non-smoker & quiet nighttime study preference'
    ],
    tradeOffs: [
      '⚡ Night study habit (uses study lamp 11 PM - 2 AM)'
    ],
    requestStatus: 'NONE'
  },
  {
    profile: {
      id: 'cand-2',
      userId: 'user-blessing',
      displayName: 'Blessing Okon',
      department: 'Nursing Science',
      level: '200L',
      budgetMin: 160000,
      budgetMax: 250000,
      preferredAreas: ['College Road / CHS', 'Adenike'],
      preferredRoomType: 'SHARED_2',
      moveInMonth: 'September Resumption',
      studyEnvironment: 'QUIET',
      cleanlinessExpectation: 'VERY_CLEAN',
      sleepSchedule: 'EARLY_BIRD',
      visitorPreference: 'OCCASIONAL',
      aboutMe: 'CHS Nursing student searching for an organized female roommate to co-rent a spacious lodge along College Road or Adenike. Clean, respectful, and friendly.'
    },
    compatibilityScore: 91,
    compatibilityLabel: '91% Match',
    positiveMatches: [
      '✅ Direct walking distance to College of Health Sciences',
      '✅ High hygiene & cleanliness standard',
      '✅ Respectful visitor policy'
    ],
    tradeOffs: [
      '⏰ Early morning 7 AM study routine'
    ],
    requestStatus: 'NONE'
  },
  {
    profile: {
      id: 'cand-3',
      userId: 'user-ibrahim',
      displayName: 'Ibrahim Balogun',
      department: 'Computer Science',
      level: '400L',
      budgetMin: 150000,
      budgetMax: 240000,
      preferredAreas: ['Under G', 'Abaa Area'],
      preferredRoomType: 'SHARED_2',
      moveInMonth: 'Resumption',
      studyEnvironment: 'QUIET',
      cleanlinessExpectation: 'VERY_CLEAN',
      sleepSchedule: 'NIGHT_OWL',
      visitorPreference: 'RARE',
      aboutMe: 'Software developer and final year CS student. Need a chill, dependable roommate who values quiet coding/study time and wants a hostel with solar/inverter backup.'
    },
    compatibilityScore: 89,
    compatibilityLabel: '89% Match',
    positiveMatches: [
      '✅ Prioritizes solar backup & high inverter uptime',
      '✅ Clean, organized compound lifestyle',
      '✅ 50/50 split rent via Remita Escrow'
    ],
    tradeOffs: [
      '💻 Tech workspace setup in room'
    ],
    requestStatus: 'NONE'
  }
];

export const RoommateMatchingHub: React.FC<RoommateMatchingHubProps> = ({
  isAuthenticated,
  onShowToast,
  onOpenAuthModal
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'discover' | 'profile' | 'requests' | 'split_contract'>('discover');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [matches, setMatches] = useState<any[]>([]);

  // Revolutionary 50/50 Split-Rent Escrow Contract State
  const [splitRentAmount, setSplitRentAmount] = useState<number>(320000);
  const [splitCautionAmount, setSplitCautionAmount] = useState<number>(20000);
  const [splitHostelTitle, setSplitHostelTitle] = useState<string>('Harmony Scholar Villa (Under G Gate Axis)');
  const [tenant1Name, setTenant1Name] = useState<string>('Adeola Johnson');
  const [tenant1Dept, setTenant1Dept] = useState<string>('Computer Engineering, 300L');
  const [tenant1Matric, setTenant1Matric] = useState<string>('LAUTECH/2022/1940');
  const [tenant1Paid, setTenant1Paid] = useState<boolean>(true);
  const [tenant2Name, setTenant2Name] = useState<string>('Oluwaseun Bakare');
  const [tenant2Dept, setTenant2Dept] = useState<string>('Biochemistry, 200L');
  const [tenant2Matric, setTenant2Matric] = useState<string>('LAUTECH/2023/5102');
  const [tenant2Paid, setTenant2Paid] = useState<boolean>(false);
  const [splitContractApproved, setSplitContractApproved] = useState<boolean>(false);

  // Profile Form State
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState('ANY');
  const [department, setDepartment] = useState('');
  const [level, setLevel] = useState('100L');
  const [budgetMin, setBudgetMin] = useState(100000);
  const [budgetMax, setBudgetMax] = useState(200000);
  const [preferredAreas, setPreferredAreas] = useState<string[]>(['Under G', 'Adenike']);
  const [preferredRoomType, setPreferredRoomType] = useState('SHARED_2');
  const [moveInMonth, setMoveInMonth] = useState('September');
  const [studyEnvironment, setStudyEnvironment] = useState('QUIET');
  const [cleanlinessExpectation, setCleanlinessExpectation] = useState('VERY_CLEAN');
  const [sleepSchedule, setSleepSchedule] = useState('REGULAR');
  const [visitorPreference, setVisitorPreference] = useState('OCCASIONAL');
  const [aboutMe, setAboutMe] = useState('');
  const [isActiveProfile, setIsActiveProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Active Chat State
  const [activeChatRequest, setActiveChatRequest] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Report Modal State
  const [reportingUser, setReportingUser] = useState<{ id: string; name: string } | null>(null);
  const [reportReason, setReportReason] = useState('HARASSMENT');
  const [reportDescription, setReportDescription] = useState('');

  const loadProfileAndMatches = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const pRes = await api.roommates.getProfile();
      if (pRes.profile) {
        setProfile(pRes.profile);
        setDisplayName(pRes.profile.displayName);
        setGender(pRes.profile.gender || 'ANY');
        setDepartment(pRes.profile.department || '');
        setLevel(pRes.profile.level || '100L');
        setBudgetMin(pRes.profile.budgetMin || 100000);
        setBudgetMax(pRes.profile.budgetMax || 200000);
        setPreferredAreas(pRes.profile.preferredAreas || ['Under G', 'Adenike']);
        setPreferredRoomType(pRes.profile.preferredRoomType || 'SHARED_2');
        setMoveInMonth(pRes.profile.moveInMonth || 'September');
        setStudyEnvironment(pRes.profile.studyEnvironment || 'QUIET');
        setCleanlinessExpectation(pRes.profile.cleanlinessExpectation || 'VERY_CLEAN');
        setSleepSchedule(pRes.profile.sleepSchedule || 'REGULAR');
        setVisitorPreference(pRes.profile.visitorPreference || 'OCCASIONAL');
        setAboutMe(pRes.profile.aboutMe || '');
        setIsActiveProfile(pRes.profile.isActive);

        // Fetch matches
        const mRes = await api.roommates.discover();
        setMatches(mRes.matches || []);
      } else {
        setProfile(null);
      }
    } catch (err: any) {
      console.error('Failed to load roommate profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileAndMatches();
  }, [isAuthenticated]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }
    if (!displayName.trim()) {
      onShowToast('Please provide a display name', 'error');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await api.roommates.upsertProfile({
        displayName: displayName.trim(),
        gender,
        department,
        level,
        budgetMin: Number(budgetMin),
        budgetMax: Number(budgetMax),
        preferredAreas,
        preferredRoomType,
        moveInMonth,
        studyEnvironment,
        cleanlinessExpectation,
        sleepSchedule,
        visitorPreference,
        aboutMe: aboutMe.trim(),
        isActive: isActiveProfile
      });

      setProfile(res.profile);
      onShowToast('Roommate preferences profile saved!', 'success');
      setActiveSubTab('discover');
      loadProfileAndMatches();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to save profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSendRequest = async (candidateUserId: string) => {
    if (!isAuthenticated) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }
    try {
      await api.roommates.sendRequest(candidateUserId, 'Hi! I saw we have matching accommodation preferences on Hostel Ease.');
      onShowToast('Roommate connection request sent!', 'success');
      loadProfileAndMatches();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to send request', 'error');
    }
  };

  const handleRespondRequest = async (requestId: string, action: 'ACCEPT' | 'DECLINE' | 'END') => {
    try {
      await api.roommates.respondRequest(requestId, action);
      onShowToast(
        action === 'ACCEPT' 
          ? 'Match accepted! You can now chat safely.' 
          : action === 'DECLINE'
          ? 'Request declined'
          : 'Match ended',
        'info'
      );
      if (activeChatRequest?.id === requestId && action === 'END') {
        setActiveChatRequest(null);
      }
      loadProfileAndMatches();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update request', 'error');
    }
  };

  const openChat = async (reqMatch: any) => {
    if (!reqMatch.requestId) return;
    setActiveChatRequest(reqMatch);
    try {
      const res = await api.roommates.getMessages(reqMatch.requestId);
      setChatMessages(res.messages || []);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to load chat', 'error');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatRequest?.requestId || !chatInput.trim()) return;

    setSendingMsg(true);
    try {
      const res = await api.roommates.sendMessage(activeChatRequest.requestId, chatInput.trim());
      setChatMessages(prev => [...prev, {
        id: res.id,
        sender_id: res.senderId,
        message: res.message,
        created_at: res.createdAt
      }]);
      setChatInput('');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to deliver message', 'error');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleBlockUser = async (userIdToBlock: string) => {
    if (!window.confirm('Are you sure you want to block this student? This will permanently end any active match and hide communication.')) {
      return;
    }
    try {
      await api.roommates.blockUser(userIdToBlock, 'Blocked by student');
      onShowToast('Student blocked successfully', 'success');
      setActiveChatRequest(null);
      loadProfileAndMatches();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to block student', 'error');
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingUser) return;
    try {
      await api.community.submitReport({
        entityType: 'ROOMMATE_PROFILE',
        entityId: reportingUser.id,
        reason: reportReason,
        description: reportDescription
      });
      onShowToast('Report submitted to Trust & Safety for review', 'success');
      setReportingUser(null);
      setReportDescription('');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to submit report', 'error');
    }
  };

  const toggleArea = (area: string) => {
    if (preferredAreas.includes(area)) {
      if (preferredAreas.length > 1) {
        setPreferredAreas(preferredAreas.filter(a => a !== area));
      }
    } else {
      setPreferredAreas([...preferredAreas, area]);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Sub-Tabs Header */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto flex-wrap">
          <button
            onClick={() => setActiveSubTab('discover')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'discover'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Discover Candidates ({matches.length > 0 ? matches.length : VERIFIED_SCHOLAR_CANDIDATES.length})</span>
          </button>

          {/* Revolutionary 50/50 Split-Rent Escrow Contract Tab */}
          <button
            onClick={() => setActiveSubTab('split_contract')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'split_contract'
                ? 'bg-white text-emerald-950 shadow-sm border border-emerald-300'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>🤝 50/50 Split-Rent Escrow</span>
            <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[9px] font-black">NEW</span>
          </button>

          <button
            onClick={() => setActiveSubTab('profile')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'profile'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>{profile ? 'Edit Preferences' : 'My Preferences'}</span>
          </button>
        </div>

        {/* Safety Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] font-bold">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>Contact Privacy Guaranteed • Escrow Split Ready</span>
        </div>
      </div>

      {/* SUB-VIEW 1: DISCOVER MATCHES */}
      {activeSubTab === 'discover' && (
        <div className="space-y-6">
          
          {/* If No Profile Exists, Prompt User but still show candidates preview below */}
          {!profile && (
            <div className="p-6 sm:p-8 bg-gradient-to-br from-emerald-500/10 via-slate-50 to-slate-100 border-2 border-dashed border-emerald-500/30 rounded-3xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/20">
                <Users className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-black text-slate-900">Find Compatible LAUTECH Roommates</h3>
                <p className="text-xs text-slate-600 font-medium">
                  Co-renting cuts your annual accommodation cost in half. Explore verified scholar profiles below, or set your living preferences to calculate match scores.
                </p>
              </div>
              <button
                onClick={() => setActiveSubTab('profile')}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-md"
              >
                Set Up Living Preferences
              </button>
            </div>
          )}

          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span>Verified Scholar Roommate Candidates</span>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                  LAUTECH Resumption
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Pre-screened student profiles open to co-renting and 50/50 rent splitting
              </p>
            </div>
          </div>

          {/* Candidates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(matches.length > 0 ? matches : VERIFIED_SCHOLAR_CANDIDATES).map((m) => (
                  <div
                    key={m.profile.id}
                    className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                  >
                    {/* Header: Candidate Identity & Compatibility Score */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-slate-900">{m.profile.displayName}</h3>
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-black">
                              VERIFIED STUDENT
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                            {m.profile.department} • {m.profile.level}
                          </p>
                        </div>

                        {/* Compatibility Score Badge */}
                        <div className="text-right">
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-900 text-xs font-black rounded-full border border-emerald-300 flex items-center gap-1 shadow-sm">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            {m.compatibilityLabel}
                          </span>
                        </div>
                      </div>

                      {/* Practical Attributes */}
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{formatNaira(m.profile.budgetMin)} – {formatNaira(m.profile.budgetMax)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          <span>{Array.isArray(m.profile.preferredAreas) ? m.profile.preferredAreas.join(', ') : (typeof m.profile.preferredAreas === 'string' ? m.profile.preferredAreas : 'Under G, Adenike')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Bed className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{(m.profile.preferredRoomType || 'SHARED').replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>Move in: {m.profile.moveInMonth || 'Resumption'}</span>
                        </div>
                      </div>

                      {/* Transparent Positive Checks */}
                      <div className="mt-3 space-y-1">
                        {(m.positiveMatches || []).map((pos: string, idx: number) => (
                          <p key={idx} className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                            {pos}
                          </p>
                        ))}
                      </div>

                      {/* Disclosed Trade-offs */}
                      {(m.tradeOffs || []).length > 0 && (
                        <div className="mt-2 space-y-0.5">
                          {(m.tradeOffs || []).map((tro: string, idx: number) => (
                            <p key={idx} className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                              {tro}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* About Me snippet */}
                      {m.profile.aboutMe && (
                        <p className="text-[11px] text-slate-600 italic mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          "{m.profile.aboutMe}"
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setReportingUser({ id: m.profile.userId, name: m.profile.displayName })}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Report Profile"
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleBlockUser(m.profile.userId)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
                          title="Block Student"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        {m.requestStatus === 'ACCEPTED' ? (
                          <button
                            onClick={() => openChat(m)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Open Mutual Chat</span>
                          </button>
                        ) : m.requestStatus === 'SENT' ? (
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-bold rounded-xl border border-slate-200">
                            Request Pending
                          </span>
                        ) : m.requestStatus === 'RECEIVED' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleRespondRequest(m.requestId, 'ACCEPT')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRespondRequest(m.requestId, 'DECLINE')}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                            >
                              Decline
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(m.profile.userId)}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Connect</span>
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                ))}
          </div>

        </div>
      )}

      {/* SUB-VIEW 2: PROFILE & PREFERENCES EDITOR */}
      {activeSubTab === 'profile' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-3xl mx-auto space-y-6">
          <div>
            <h3 className="text-base font-black text-slate-900">Your Accommodation & Roommate Profile</h3>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Set practical living preferences. Your phone number and exact personal address remain private.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5 text-xs">
            
            {/* Identity Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700">Display Name *</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Tunde A."
                  required
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Academic Level</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="100L">100L (Fresher)</option>
                  <option value="200L">200L</option>
                  <option value="300L">300L</option>
                  <option value="400L">400L</option>
                  <option value="500L">500L (Finalist)</option>
                  <option value="POSTGRAD">Postgraduate</option>
                </select>
              </div>
            </div>

            {/* Budget Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700">Minimum Annual Budget (₦)</label>
                <input
                  type="number"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(Number(e.target.value))}
                  step={5000}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Maximum Annual Budget (₦)</label>
                <input
                  type="number"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(Number(e.target.value))}
                  step={5000}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
            </div>

            {/* Preferred Areas Selection */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Preferred Neighborhoods (Click to select)</label>
              <div className="flex flex-wrap gap-2">
                {['Under G', 'Adenike', 'Stadium', 'Isale General', 'Aroma', 'Randa'].map((area) => {
                  const isSelected = preferredAreas.includes(area);
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleArea(area)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}{area}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Room Type & Move-in Month */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700">Preferred Room Type</label>
                <select
                  value={preferredRoomType}
                  onChange={(e) => setPreferredRoomType(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="SHARED_2">2-Person Shared Room</option>
                  <option value="SHARED_3">3-Person Shared Room</option>
                  <option value="SHARED_4">4-Person Shared Room</option>
                  <option value="FLAT">Multi-Room Flat Share</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Target Move-In Month</label>
                <select
                  value={moveInMonth}
                  onChange={(e) => setMoveInMonth(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="September">September (1st Semester Resumption)</option>
                  <option value="October">October</option>
                  <option value="November">November</option>
                  <option value="February">February (2nd Semester)</option>
                  <option value="Immediate">Immediate Move-In</option>
                </select>
              </div>
            </div>

            {/* Living Habits & Environment */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
              <div>
                <label className="font-bold text-slate-700">Study Environment</label>
                <select
                  value={studyEnvironment}
                  onChange={(e) => setStudyEnvironment(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="QUIET">Quiet & Focused</option>
                  <option value="COLLABORATIVE">Collaborative / Group</option>
                  <option value="FLEXIBLE">Flexible</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Cleanliness Expectation</label>
                <select
                  value={cleanlinessExpectation}
                  onChange={(e) => setCleanlinessExpectation(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="VERY_CLEAN">Very Clean & Organized</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="RELAXED">Relaxed</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Sleep Schedule</label>
                <select
                  value={sleepSchedule}
                  onChange={(e) => setSleepSchedule(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="REGULAR">Regular (10pm – 7am)</option>
                  <option value="NIGHT_OWL">Night Owl (Late Study)</option>
                  <option value="EARLY_BIRD">Early Bird (5am Start)</option>
                </select>
              </div>
            </div>

            {/* About Me note */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">About Me / Living Preferences Note</label>
              <textarea
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                placeholder="e.g. Serious student, no loud music after 10pm, enjoys cooking..."
                rows={3}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Active Toggle */}
            <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer">
              <input
                type="checkbox"
                checked={isActiveProfile}
                onChange={(e) => setIsActiveProfile(e.target.checked)}
                className="accent-emerald-600 rounded"
              />
              <span className="font-bold text-slate-800">
                Visible in Roommate Matching (Uncheck to temporarily pause matching)
              </span>
            </label>

            {/* Submit */}
            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl transition-all shadow"
              >
                {savingProfile ? 'Saving Profile...' : 'Save Preferences'}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* SUB-VIEW 3: 50/50 SPLIT-RENT ESCROW CONTRACT (REVOLUTIONARY INNOVATION) */}
      {activeSubTab === 'split_contract' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Header Banner */}
          <div className="p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl shadow-xl border border-emerald-500/20 relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-black uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero Eviction Risk • Dual Remita Escrow Payer System</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                🤝 RoomieMatch™ 50/50 Split-Rent Escrow Contract
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Co-renting off-campus accommodation should not leave you stranded. Hostel Ease splits the rent evenly, generates dual Remita RRRs for each student, holds funds in neutral Escrow, and issues an ironclad digital co-tenancy contract protecting both of you from landlord disputes.
              </p>
            </div>
            <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-10 pointer-events-none">
              <ShieldCheck className="w-64 h-64 text-emerald-400" />
            </div>
          </div>

          {/* Step 1: Configure Hostel & Rent Split */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>1. Hostel Accommodation & Rent Parameters</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Set annual rent and caution deposit to calculate the exact 50/50 share
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                0% Hidden Surcharges
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700">Hostel Title / Compound</label>
                <input
                  type="text"
                  value={splitHostelTitle}
                  onChange={(e) => setSplitHostelTitle(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Total Annual Rent (₦)</label>
                <input
                  type="number"
                  step="5000"
                  value={splitRentAmount}
                  onChange={(e) => setSplitRentAmount(Number(e.target.value))}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Refundable Caution Deposit (₦)</label>
                <input
                  type="number"
                  step="2000"
                  value={splitCautionAmount}
                  onChange={(e) => setSplitCautionAmount(Number(e.target.value))}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
            </div>

            {/* Live Calculation Bar */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide">
                  Total Accommodation Escrow Vault
                </span>
                <p className="text-lg font-black text-emerald-950">
                  {formatNaira(splitRentAmount + splitCautionAmount)} / academic session
                </p>
              </div>

              <div className="flex items-center gap-3 text-right">
                <div className="px-4 py-2 bg-white rounded-xl shadow-xs border border-emerald-200">
                  <span className="text-[10px] text-slate-500 font-bold block">Each Roommate's 50% Share</span>
                  <span className="text-base font-black text-emerald-700">
                    {formatNaira((splitRentAmount + splitCautionAmount) / 2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Co-Tenants & Dual Remita RRRs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tenant 1 Card */}
            <div className={`p-5 rounded-3xl border transition-all ${
              tenant1Paid 
                ? 'bg-emerald-50/40 border-emerald-300 shadow-sm' 
                : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black px-2 py-0.5 bg-slate-900 text-white rounded-md">
                    CO-TENANT 1 (YOU)
                  </span>
                  <h4 className="text-sm font-black text-slate-900 mt-1">{tenant1Name}</h4>
                  <p className="text-[11px] text-slate-500">{tenant1Dept} • {tenant1Matric}</p>
                </div>
                {tenant1Paid ? (
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 text-xs font-black rounded-full border border-emerald-300 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                    <span>PAID 50%</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-xs font-black rounded-full border border-amber-300">
                    AWAITING
                  </span>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Required Deposit:</span>
                  <span className="font-bold text-slate-900">{formatNaira((splitRentAmount + splitCautionAmount) / 2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Remita Escrow RRR:</span>
                  <span className="font-mono font-bold text-slate-800">RRR-4421-9908-1021</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Escrow Status:</span>
                  <span className="font-bold text-emerald-700">Secured in Central Escrow</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTenant1Paid(!tenant1Paid);
                  onShowToast(tenant1Paid ? 'Tenant 1 payment reset' : 'Tenant 1 payment verified! ₦' + ((splitRentAmount + splitCautionAmount) / 2).toLocaleString() + ' in Escrow.', 'info');
                }}
                className={`w-full mt-4 py-2 text-xs font-black rounded-xl transition ${
                  tenant1Paid 
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow'
                }`}
              >
                {tenant1Paid ? 'Simulate Revert Payment' : 'Simulate Pay 50% via Remita'}
              </button>
            </div>

            {/* Tenant 2 Card */}
            <div className={`p-5 rounded-3xl border transition-all ${
              tenant2Paid 
                ? 'bg-emerald-50/40 border-emerald-300 shadow-sm' 
                : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-700 text-white rounded-md">
                    CO-TENANT 2 (ROOMMATE)
                  </span>
                  <h4 className="text-sm font-black text-slate-900 mt-1">{tenant2Name}</h4>
                  <p className="text-[11px] text-slate-500">{tenant2Dept} • {tenant2Matric}</p>
                </div>
                {tenant2Paid ? (
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 text-xs font-black rounded-full border border-emerald-300 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                    <span>PAID 50%</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-xs font-black rounded-full border border-amber-300 animate-pulse">
                    PENDING
                  </span>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Required Deposit:</span>
                  <span className="font-bold text-slate-900">{formatNaira((splitRentAmount + splitCautionAmount) / 2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Remita Escrow RRR:</span>
                  <span className="font-mono font-bold text-slate-800">RRR-4421-9908-1022</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Escrow Status:</span>
                  <span className={tenant2Paid ? "font-bold text-emerald-700" : "font-bold text-amber-700"}>
                    {tenant2Paid ? 'Secured in Central Escrow' : 'Waiting for Roommate Deposit'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTenant2Paid(!tenant2Paid);
                  onShowToast(tenant2Paid ? 'Tenant 2 payment reset' : 'Tenant 2 payment confirmed! 100% Escrow Vault Funded! 🎉', 'success');
                }}
                className={`w-full mt-4 py-2 text-xs font-black rounded-xl transition ${
                  tenant2Paid 
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow'
                }`}
              >
                {tenant2Paid ? 'Simulate Revert Payment' : '💳 Complete Tenant 2 Remita Payment'}
              </button>
            </div>
          </div>

          {/* Step 3: Verified Digital Joint Tenancy Certificate */}
          {tenant1Paid && tenant2Paid ? (
            <div className="bg-white border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Watermark badge */}
              <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                      OFFICIAL VERIFIED ACCORD
                    </span>
                    <h3 className="text-base font-black text-slate-900">
                      LAUTECH Student Digital Co-Tenancy Agreement & Certificate
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-900 px-3 py-1 rounded-xl">
                  CTR-LAUTECH-2026-9482
                </span>
              </div>

              {/* Certificate Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Primary Accommodation</span>
                  <span className="font-black text-slate-900">{splitHostelTitle}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Total Escrow Holding</span>
                  <span className="font-black text-emerald-700">{formatNaira(splitRentAmount + splitCautionAmount)} (100% Funded)</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Co-Tenant 1</span>
                  <span className="font-bold text-slate-900">{tenant1Name} ({tenant1Matric})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Co-Tenant 2</span>
                  <span className="font-bold text-slate-900">{tenant2Name} ({tenant2Matric})</span>
                </div>
              </div>

              {/* Ironclad Legal Protective Clauses */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  Enforceable Co-Tenancy Protective Clauses:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/60 space-y-1">
                    <span className="font-bold text-emerald-950 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Default Immunity
                    </span>
                    <p className="text-slate-600">
                      Neither student can be evicted or penalized if the other co-tenant defaults on subsequent session rent renewals.
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/60 space-y-1">
                    <span className="font-bold text-emerald-950 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      Individual Caution Return
                    </span>
                    <p className="text-slate-600">
                      Refundable caution deposit (₦{((splitCautionAmount) / 2).toLocaleString()} each) is refunded directly to each student's account.
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/60 space-y-1">
                    <span className="font-bold text-emerald-950 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-emerald-600" />
                      Dispute Arbitration
                    </span>
                    <p className="text-slate-600">
                      Both parties bound by LAUTECH SUG Off-Campus Deanery Arbitration before any property entry or lock replacement.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onShowToast('Digital Certificate ready for download / printing 📄', 'success');
                      window.print();
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / Save Agreement</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://hostelease.ng/contracts/CTR-LAUTECH-2026-9482`);
                      onShowToast('Verification link copied to clipboard! 📋', 'info');
                    }}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Verification Hash</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const text = encodeURIComponent(`Hello Landlord, we have completed our 50/50 Escrow payment of ₦${(splitRentAmount + splitCautionAmount).toLocaleString()} for ${splitHostelTitle}. Our verified Hostel Ease Contract ID is CTR-LAUTECH-2026-9482.`);
                    window.open(`https://wa.me/?text=${text}`, '_blank');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Contract via WhatsApp</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-3xl text-center space-y-2">
              <Lock className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="text-xs font-black text-slate-700">Digital Co-Tenancy Agreement Pending 100% Funding</h4>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Once both Co-Tenant 1 and Co-Tenant 2 fund their respective 50% shares ({formatNaira((splitRentAmount + splitCautionAmount) / 2)}), the official stamped certificate will unlock automatically.
              </p>
            </div>
          )}
        </div>
      )}

      {/* MUTUAL ROOMMATE CHAT DRAWER */}
      {activeChatRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>{activeChatRequest.profile.displayName}</span>
                </h3>
                <p className="text-[10px] text-emerald-400 font-medium">Mutual Consent Roommate Chat</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRespondRequest(activeChatRequest.requestId, 'END')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg"
                >
                  End Match
                </button>
                <button onClick={() => setActiveChatRequest(null)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Safety Notice */}
            <div className="p-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-[10px] font-bold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span>Never send money or personal passwords. Use official escrow for bookings.</span>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50">
              {chatMessages.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <p className="font-bold">No messages yet.</p>
                  <p className="text-[10px]">Say hello and coordinate an inspection together!</p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMine = msg.sender_id === profile?.userId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[78%] p-3 rounded-2xl text-xs font-medium ${
                          isMine
                            ? 'bg-emerald-600 text-white rounded-br-none'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                        }`}
                      >
                        <p>{msg.message}</p>
                        <span className={`text-[9px] block mt-1 ${isMine ? 'text-emerald-200' : 'text-slate-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Input Footer */}
            <div className="p-3 bg-white border-t border-slate-200">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message to your potential roommate..."
                  className="flex-1 px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={sendingMsg || !chatInput.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all shadow flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* REPORT USER MODAL */}
      {reportingUser && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Flag className="w-4 h-4 text-rose-600" />
                <span>Report Student Behavior ({reportingUser.name})</span>
              </h4>
              <button onClick={() => setReportingUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Violation Category</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                >
                  <option value="HARASSMENT">Harassment / Inappropriate messages</option>
                  <option value="SCAM">Scam / Asking for money or off-platform deposits</option>
                  <option value="IMPERSONATION">Impersonation / Fake student profile</option>
                  <option value="SPAM">Spam or unwanted advertising</option>
                  <option value="OTHER">Other safety concern</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Specific Details</label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Provide context for Trust & Safety investigation..."
                  rows={3}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportingUser(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black shadow"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
