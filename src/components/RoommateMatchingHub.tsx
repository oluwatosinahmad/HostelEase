import React, { useState, useEffect } from 'react';
import { 
  Users, Sparkles, Shield, AlertTriangle, Send, CheckCircle2, MessageSquare, 
  X, UserPlus, Filter, Clock, MapPin, DollarSign, Bed, Ban, Flag, PhoneOff, 
  HelpCircle, Settings, Check, UserCheck
} from 'lucide-react';
import { api } from '../services/api';
import { formatNaira } from '../utils/formatters';

interface RoommateMatchingHubProps {
  isAuthenticated: boolean;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onOpenAuthModal?: () => void;
}

export const RoommateMatchingHub: React.FC<RoommateMatchingHubProps> = ({
  isAuthenticated,
  onShowToast,
  onOpenAuthModal
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'discover' | 'profile' | 'requests'>('discover');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [matches, setMatches] = useState<any[]>([]);

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
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('discover')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'discover'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Discover Potential Matches ({matches.length})</span>
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
            <span>{profile ? 'Edit Living Preferences' : 'Create Roommate Profile'}</span>
          </button>
        </div>

        {/* Safety Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] font-bold">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>Contact Privacy Guaranteed • Mutual Consent Chat</span>
        </div>
      </div>

      {/* SUB-VIEW 1: DISCOVER MATCHES */}
      {activeSubTab === 'discover' && (
        <div className="space-y-4">
          
          {/* If No Profile Exists, Prompt User */}
          {!profile && (
            <div className="p-8 bg-gradient-to-br from-emerald-500/10 via-slate-50 to-slate-100 border-2 border-dashed border-emerald-500/30 rounded-3xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/20">
                <Users className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-black text-slate-900">Find Compatible LAUTECH Roommates</h3>
                <p className="text-xs text-slate-600 font-medium">
                  Roommate matching is 100% optional. Set your budget, preferred area, and study habits to view potential compatibility matches.
                </p>
              </div>
              <button
                onClick={() => setActiveSubTab('profile')}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-md"
              >
                Set Up Roommate Profile
              </button>
            </div>
          )}

          {/* Potential Matches Feed */}
          {profile && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.length === 0 ? (
                <div className="col-span-full p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-2">
                  <Users className="w-8 h-8 text-slate-400 mx-auto" />
                  <h4 className="text-sm font-black text-slate-800">No active roommate candidates right now</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    New student profiles are posted daily around LAUTECH semester resumption. Check back soon!
                  </p>
                </div>
              ) : (
                matches.map((m) => (
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
                ))
              )}
            </div>
          )}

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
