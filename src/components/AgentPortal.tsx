import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Search, Users, Home, CalendarCheck, MessageSquare,
  Wallet, Star, PlusCircle, UserCheck, Shield, FileText, Bell,
  CheckCircle2, Clock, AlertCircle, Phone, Mail, MapPin, DollarSign,
  ChevronRight, ArrowUpRight, Filter, Eye, RefreshCw, Send, Lock,
  Building, Check, X, ShieldAlert, Award, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  AgentDashboardData, AgentRequest, AgentEarning, AgentPayout, 
  AgentLead, AgentReview 
} from '../types/hostelEase';

export const AgentPortal: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'find_hostels' | 'student_requests' | 'my_students' |
    'assigned_hostels' | 'bookings' | 'messages' | 'earnings' | 'reviews' |
    'leads' | 'profile' | 'terms'
  >('dashboard');

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<AgentDashboardData | null>(null);
  const [requests, setRequests] = useState<AgentRequest[]>([]);
  const [hostels, setHostels] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [leads, setLeads] = useState<AgentLead[]>([]);
  const [earnings, setEarnings] = useState<AgentEarning[]>([]);
  const [payouts, setPayouts] = useState<AgentPayout[]>([]);
  const [reviews, setReviews] = useState<AgentReview[]>([]);
  const [earningsSummary, setEarningsSummary] = useState<any>(null);

  // Search & Filter States
  const [hostelSearch, setHostelSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState('All');
  const [requestStatusFilter, setRequestStatusFilter] = useState('ALL');

  // Modals & Action States
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutBank, setPayoutBank] = useState('Guaranty Trust Bank');
  const [payoutAccountNum, setPayoutAccountNum] = useState('');
  const [payoutAccountName, setPayoutAccountName] = useState('');

  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadHostelName, setLeadHostelName] = useState('');
  const [leadAreaId, setLeadAreaId] = useState('area-under-g');
  const [leadLandmark, setLeadLandmark] = useState('');
  const [leadRent, setLeadRent] = useState('220000');
  const [leadLandlordName, setLeadLandlordName] = useState('');
  const [leadLandlordPhone, setLeadLandlordPhone] = useState('');
  const [leadNotes, setLeadNotes] = useState('');

  const [suggestModalRequest, setSuggestModalRequest] = useState<AgentRequest | null>(null);
  const [selectedHostelIds, setSelectedHostelIds] = useState<string[]>([]);
  const [notificationMsg, setNotificationMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotificationMsg({ text, type });
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [dashRes, reqRes, hostRes, studRes, leadRes, earnRes, revRes] = await Promise.allSettled([
        api.agent.getDashboard(),
        api.agent.getRequests(),
        api.agent.getHostels(),
        api.agent.getStudents(),
        api.agent.getLeads(),
        api.agent.getEarnings(),
        api.agent.getReviews()
      ]);

      if (dashRes.status === 'fulfilled') setDashboardData(dashRes.value);
      if (reqRes.status === 'fulfilled') setRequests(reqRes.value.requests || []);
      if (hostRes.status === 'fulfilled') setHostels(hostRes.value.hostels || []);
      if (studRes.status === 'fulfilled') setStudents(studRes.value.students || []);
      if (leadRes.status === 'fulfilled') setLeads(leadRes.value.leads || []);
      if (earnRes.status === 'fulfilled') {
        setEarnings(earnRes.value.earnings || []);
        setPayouts(earnRes.value.payouts || []);
        setEarningsSummary(earnRes.value.summary || null);
      }
      if (revRes.status === 'fulfilled') setReviews(revRes.value.reviews || []);
    } catch (err) {
      console.error('Failed to load agent data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await api.agent.acceptRequest(requestId);
      showNotification('Request accepted successfully! You can now suggest accommodations.');
      loadAllData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to accept request', 'error');
    }
  };

  const handleCompleteRequest = async (requestId: string) => {
    try {
      await api.agent.completeRequest(requestId);
      showNotification('Student assistance marked as complete! ₦5,000 service fee credited to balance.');
      loadAllData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to complete request', 'error');
    }
  };

  const handleSendSuggestions = async () => {
    if (!suggestModalRequest || selectedHostelIds.length === 0) return;
    try {
      await api.agent.suggestHostels(suggestModalRequest.id, selectedHostelIds);
      showNotification('Hostel suggestions sent to student!');
      setSuggestModalRequest(null);
      setSelectedHostelIds([]);
      loadAllData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to suggest hostels', 'error');
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.agent.requestPayout({
        amount: Number(payoutAmount),
        bankName: payoutBank,
        accountNumber: payoutAccountNum,
        accountName: payoutAccountName
      });
      showNotification('Payout request submitted successfully.');
      setShowPayoutModal(false);
      setPayoutAmount('');
      loadAllData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to request payout', 'error');
    }
  };

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.agent.submitLead({
        hostelName: leadHostelName,
        areaId: leadAreaId,
        landmark: leadLandmark,
        estimatedRent: Number(leadRent),
        roomTypes: 'Self-Contain & Single Rooms',
        landlordName: leadLandlordName,
        landlordPhone: leadLandlordPhone,
        notes: leadNotes
      });
      showNotification('Hostel lead submitted! Pending admin physical verification.');
      setShowLeadModal(false);
      setLeadHostelName('');
      setLeadLandmark('');
      setLeadNotes('');
      loadAllData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to submit lead', 'error');
    }
  };

  const filteredHostels = hostels.filter(h => {
    const matchesSearch = !hostelSearch || 
      h.title?.toLowerCase().includes(hostelSearch.toLowerCase()) || 
      h.displayAddress?.toLowerCase().includes(hostelSearch.toLowerCase());
    const matchesArea = selectedArea === 'All' || h.areaName === selectedArea;
    return matchesSearch && matchesArea;
  });

  const filteredRequests = requests.filter(r => {
    if (requestStatusFilter === 'ALL') return true;
    return r.status === requestStatusFilter;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
      
      {/* Toast Notification */}
      {notificationMsg && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium border animate-in fade-in slide-in-from-top-3 ${
          notificationMsg.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/30' 
            : 'bg-rose-950/90 text-rose-200 border-rose-500/30'
        }`}>
          {notificationMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          {notificationMsg.text}
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-800 shrink-0 flex flex-col">
        {/* Brand */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-900/40">
              HE
            </div>
            <div>
              <div className="font-bold text-sm text-white tracking-tight">Hostel Ease</div>
              <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Agent Portal
              </div>
            </div>
          </div>
        </div>

        {/* Agent Info Card */}
        <div className="p-4 mx-3 my-3 bg-slate-900/80 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-full bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center text-xs">
              {user?.fullName?.slice(0, 2).toUpperCase() || 'AG'}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-white truncate">{user?.fullName || 'Bamidele Olatunji'}</div>
              <div className="text-[11px] text-slate-400 truncate">{dashboardData?.agent?.businessName || 'Verified Agent'}</div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3 h-3" /> Approved
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-semibold">
              <Star className="w-3 h-3 fill-amber-400" /> {dashboardData?.agent?.rating || '4.9'}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'dashboard' ? 'bg-emerald-600 text-white font-semibold shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>

          <button
            onClick={() => setActiveTab('find_hostels')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'find_hostels' ? 'bg-emerald-600 text-white font-semibold shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Search className="w-4 h-4" /> Find Accommodation
          </button>

          <button
            onClick={() => setActiveTab('student_requests')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition ${
              activeTab === 'student_requests' ? 'bg-emerald-600 text-white font-semibold shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4" /> Student Requests
            </div>
            {requests.filter(r => r.status === 'OPEN').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                {requests.filter(r => r.status === 'OPEN').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('my_students')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'my_students' ? 'bg-emerald-600 text-white font-semibold shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" /> My Students
          </button>

          <button
            onClick={() => setActiveTab('assigned_hostels')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'assigned_hostels' ? 'bg-emerald-600 text-white font-semibold shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Home className="w-4 h-4" /> Assigned Hostels
          </button>

          <button
            onClick={() => setActiveTab('earnings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'earnings' ? 'bg-emerald-600 text-white font-semibold shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Wallet className="w-4 h-4" /> Earnings & Payouts
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'leads' ? 'bg-emerald-600 text-white font-semibold shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <PlusCircle className="w-4 h-4" /> Submit Hostel Lead
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'reviews' ? 'bg-emerald-600 text-white font-semibold shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Star className="w-4 h-4" /> Reviews & Ratings
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'profile' ? 'bg-emerald-600 text-white font-semibold shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" /> Profile & Settings
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'terms' ? 'bg-emerald-600 text-white font-semibold shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" /> Terms & Policies
          </button>
        </nav>

        {/* Footer / Logout */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full py-2 px-3 text-xs text-rose-400 hover:bg-rose-950/40 rounded-xl transition font-medium text-left flex items-center gap-2"
          >
            <Lock className="w-3.5 h-3.5" /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Portal Viewport */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-900 overflow-y-auto">
        
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-950/50 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-base text-white capitalize">
              {activeTab.replace('_', ' ')}
            </h1>
            <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-500/30 rounded-full">
              📍 LAUTECH Ogbomoso
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLeadModal(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Submit Hostel Lead
            </button>

            <button
              onClick={loadAllData}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Metric Highlights */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-slate-400 text-xs font-medium mb-1">Active Requests</div>
                  <div className="text-2xl font-bold text-white flex items-center justify-between">
                    {dashboardData?.metrics?.activeRequests || requests.length}
                    <Users className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-1">Students awaiting accommodation</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-slate-400 text-xs font-medium mb-1">Assigned Students</div>
                  <div className="text-2xl font-bold text-white flex items-center justify-between">
                    {dashboardData?.metrics?.assignedStudents || students.length}
                    <UserCheck className="w-5 h-5 text-teal-400" />
                  </div>
                  <div className="text-[11px] text-teal-400 mt-1">Active assistance cases</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-slate-400 text-xs font-medium mb-1">Available Balance</div>
                  <div className="text-2xl font-bold text-emerald-400 flex items-center justify-between">
                    ₦{(dashboardData?.metrics?.availableBalance || earningsSummary?.availableBalance || 45000).toLocaleString()}
                    <Wallet className="w-5 h-5 text-emerald-400" />
                  </div>
                  <button 
                    onClick={() => setShowPayoutModal(true)}
                    className="text-[11px] text-emerald-300 hover:underline mt-1 font-semibold flex items-center gap-0.5"
                  >
                    Withdraw to Bank <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-slate-400 text-xs font-medium mb-1">Total Assisted Bookings</div>
                  <div className="text-2xl font-bold text-white flex items-center justify-between">
                    {dashboardData?.metrics?.completedBookings || 18}
                    <Award className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="text-[11px] text-amber-400 mt-1">Verified placements</div>
                </div>
              </div>

              {/* Student Requests to Claim */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-bold text-sm text-white">Eligible Student Requests</h2>
                    <p className="text-xs text-slate-400">Students requesting accommodation assistance in your operational zones</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('student_requests')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                  >
                    View All ({requests.length})
                  </button>
                </div>

                <div className="space-y-3">
                  {requests.slice(0, 3).map((req) => (
                    <div key={req.id} className="p-4 bg-slate-900/90 rounded-xl border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{req.studentName}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.status === 'OPEN' ? 'bg-amber-950 text-amber-300 border border-amber-500/30' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {req.status}
                          </span>
                          <span className="text-xs text-slate-400">• Budget: ₦{req.budgetMax?.toLocaleString()} max</span>
                        </div>
                        <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2">
                          <span className="text-slate-400">Areas:</span>
                          {req.preferredAreas?.map(a => (
                            <span key={a} className="px-2 py-0.5 bg-slate-800 rounded text-[11px] text-slate-200">{a}</span>
                          ))}
                          <span className="text-slate-400">| Room Type:</span>
                          <span className="text-emerald-400 font-medium">{req.roomType?.replace('_', ' ')}</span>
                        </div>
                        {req.notes && (
                          <div className="text-xs text-slate-400 italic">"{req.notes}"</div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {req.status === 'OPEN' ? (
                          <button
                            onClick={() => handleAcceptRequest(req.id)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
                          >
                            Accept & Assist
                          </button>
                        ) : (
                          <button
                            onClick={() => setSuggestModalRequest(req)}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition"
                          >
                            Suggest Hostels
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verified Hostels Quick View */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-bold text-sm text-white">Verified LAUTECH Hostels Database</h2>
                    <p className="text-xs text-slate-400">Available vetted accommodations ready for student placement</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('find_hostels')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                  >
                    Search Full Catalog ({hostels.length})
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {hostels.slice(0, 3).map((h) => (
                    <div key={h.id} className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col">
                      <div className="h-32 bg-slate-800 relative">
                        <img 
                          src={h.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80'} 
                          alt={h.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/30">
                          {h.areaName || 'Under G'}
                        </span>
                      </div>
                      <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="font-bold text-xs text-white truncate">{h.title}</div>
                          <div className="text-[11px] text-slate-400 truncate">{h.displayAddress}</div>
                        </div>
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-400">₦{h.minPrice?.toLocaleString()}/yr</span>
                          <span className="text-[10px] text-slate-400">{h.availableRoomsCount || 3} rooms left</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: FIND ACCOMMODATION */}
          {activeTab === 'find_hostels' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Search and Filters Bar */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={hostelSearch}
                    onChange={(e) => setHostelSearch(e.target.value)}
                    placeholder="Search by lodge name, landmark or address in Ogbomoso..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs focus:border-emerald-500 outline-none text-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-emerald-500"
                  >
                    <option value="All">All LAUTECH Areas</option>
                    <option value="Under G">Under G</option>
                    <option value="Adenike">Adenike</option>
                    <option value="Stadium Road">Stadium Road</option>
                    <option value="College Road">College Road</option>
                    <option value="General Area">General Area</option>
                  </select>
                </div>
              </div>

              {/* Hostels Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {filteredHostels.map((h) => (
                  <div key={h.id} className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex flex-col hover:border-slate-700 transition">
                    <div className="h-40 bg-slate-800 relative">
                      <img 
                        src={h.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80'} 
                        alt={h.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950/90 text-emerald-300 border border-emerald-500/30">
                          {h.areaName || 'Under G'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                          Verified
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-white truncate">{h.title}</h3>
                        <p className="text-xs text-slate-400 truncate">{h.displayAddress}</p>
                      </div>

                      <div className="py-2 border-y border-slate-800/80 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-slate-400 text-[10px] block">Rent Amount</span>
                          <span className="font-bold text-emerald-400">₦{h.minPrice?.toLocaleString()}/yr</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 text-[10px] block">Type</span>
                          <span className="font-medium text-slate-200">{h.propertyType?.replace('_', ' ')}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          showNotification(`Selected "${h.title}". Go to Student Requests to link.`);
                        }}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl transition border border-slate-800"
                      >
                        Select for Student Option
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* TAB 3: STUDENT REQUESTS */}
          {activeTab === 'student_requests' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">Student Accommodation Requests</h2>
                  <p className="text-xs text-slate-400">Students actively seeking verified agent assistance in LAUTECH</p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={requestStatusFilter}
                    onChange={(e) => setRequestStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="OPEN">Open (Unclaimed)</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                {filteredRequests.map((req) => (
                  <div key={req.id} className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{req.studentName}</span>
                          <span className="text-xs text-slate-400">({req.studentDepartment || 'LAUTECH Student'})</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.status === 'OPEN' ? 'bg-amber-950 text-amber-300 border border-amber-500/30' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Requested: {new Date(req.createdAt).toLocaleDateString()} | Service Fee: <strong className="text-emerald-400">₦{req.serviceFee?.toLocaleString() || '5,000'}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {req.status === 'OPEN' && (
                          <button
                            onClick={() => handleAcceptRequest(req.id)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
                          >
                            Accept & Assist
                          </button>
                        )}
                        {req.status === 'IN_PROGRESS' && (
                          <>
                            <button
                              onClick={() => setSuggestModalRequest(req)}
                              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl transition"
                            >
                              Suggest Options
                            </button>
                            <button
                              onClick={() => handleCompleteRequest(req.id)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition"
                            >
                              Mark Completed
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-slate-900 rounded-xl">
                        <span className="text-slate-400 text-[10px] block">Target Budget</span>
                        <span className="font-bold text-white">₦{req.budgetMin?.toLocaleString()} - ₦{req.budgetMax?.toLocaleString()}</span>
                      </div>
                      <div className="p-3 bg-slate-900 rounded-xl">
                        <span className="text-slate-400 text-[10px] block">Preferred Room Type</span>
                        <span className="font-bold text-emerald-400">{req.roomType?.replace('_', ' ')}</span>
                      </div>
                      <div className="p-3 bg-slate-900 rounded-xl">
                        <span className="text-slate-400 text-[10px] block">Move-in Date</span>
                        <span className="font-bold text-white">{req.moveInDate || 'Flexible'}</span>
                      </div>
                      <div className="p-3 bg-slate-900 rounded-xl">
                        <span className="text-slate-400 text-[10px] block">Preferred Locations</span>
                        <span className="font-bold text-slate-200">{req.preferredAreas?.join(', ') || 'Under G'}</span>
                      </div>
                    </div>

                    {req.notes && (
                      <div className="p-3 bg-slate-900/60 rounded-xl text-xs text-slate-300 border border-slate-800/60">
                        <strong className="text-slate-400">Student Notes: </strong> {req.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: MY STUDENTS */}
          {activeTab === 'my_students' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-base font-bold text-white">Assigned Students Directory</h2>
                <p className="text-xs text-slate-400">Privacy-protected directory of students you are actively or previously assisting</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {students.map((st) => (
                  <div key={st.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center text-sm">
                          {st.fullName?.slice(0, 2).toUpperCase() || 'ST'}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">{st.fullName}</div>
                          <div className="text-xs text-slate-400">{st.department || 'Student'} • {st.level || '400L'}</div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        st.requestStatus === 'IN_PROGRESS' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {st.requestStatus || 'ACTIVE'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Budget:</span>
                        <span className="text-white font-semibold">₦{st.budgetMax?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Room Type:</span>
                        <span className="text-emerald-400 font-medium">{st.roomType?.replace('_', ' ')}</span>
                      </div>
                    </div>

                    {st.phone && (
                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={`tel:${st.phone}`}
                          className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg text-center transition flex items-center justify-center gap-1.5"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call Student
                        </a>
                        <a
                          href={`https://wa.me/${st.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 text-xs font-semibold rounded-lg text-center transition flex items-center justify-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: EARNINGS & PAYOUTS */}
          {activeTab === 'earnings' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Earnings Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Available Withdrawal Balance</span>
                  <div className="text-2xl font-bold text-emerald-400 mb-3">
                    ₦{(earningsSummary?.availableBalance || 45000).toLocaleString()}
                  </div>
                  <button
                    onClick={() => setShowPayoutModal(true)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Wallet className="w-4 h-4" /> Request Bank Payout
                  </button>
                </div>

                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Total Lifetime Earnings</span>
                  <div className="text-2xl font-bold text-white mb-2">
                    ₦{(earningsSummary?.totalEarnings || 90000).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400">Cumulative assistance service fees</div>
                </div>

                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Completed Payouts</span>
                  <div className="text-2xl font-bold text-teal-400 mb-2">
                    ₦{(earningsSummary?.completedPayouts || 35000).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400">Disbursed to verified bank account</div>
                </div>
              </div>

              {/* Transactions Ledger */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5">
                <h3 className="font-bold text-sm text-white mb-3">Recent Earnings & Credits</h3>
                <div className="space-y-2">
                  {earnings.map((ern) => (
                    <div key={ern.id} className="p-3 bg-slate-900 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{ern.notes || 'Student Placement Service Fee'}</div>
                        <div className="text-slate-400 text-[11px]">{new Date(ern.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-400">+₦{ern.amount?.toLocaleString()}</div>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300">
                          {ern.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 10: SUBMIT HOSTEL LEAD */}
          {activeTab === 'leads' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">Submitted Hostel Leads</h2>
                  <p className="text-xs text-slate-400">Submit new student hostels in Ogbomoso for Admin verification and listing</p>
                </div>
                <button
                  onClick={() => setShowLeadModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" /> Submit New Lead
                </button>
              </div>

              <div className="space-y-3">
                {leads.map((lead) => (
                  <div key={lead.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-white">{lead.hostelName}</div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        lead.status === 'PENDING_VERIFICATION' ? 'bg-amber-950 text-amber-300 border border-amber-500/30' : 'bg-emerald-950 text-emerald-300'
                      }`}>
                        {lead.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 bg-slate-900 rounded-lg">
                        <span className="text-slate-400 text-[10px] block">Location</span>
                        <span className="font-semibold text-white">{lead.areaName || 'Under G'}</span>
                      </div>
                      <div className="p-2.5 bg-slate-900 rounded-lg">
                        <span className="text-slate-400 text-[10px] block">Est. Rent</span>
                        <span className="font-semibold text-emerald-400">₦{lead.estimatedRent?.toLocaleString()}</span>
                      </div>
                      <div className="p-2.5 bg-slate-900 rounded-lg">
                        <span className="text-slate-400 text-[10px] block">Landlord / Caretaker</span>
                        <span className="font-semibold text-white">{lead.landlordName || 'N/A'}</span>
                      </div>
                      <div className="p-2.5 bg-slate-900 rounded-lg">
                        <span className="text-slate-400 text-[10px] block">Contact</span>
                        <span className="font-semibold text-white">{lead.landlordPhone || 'N/A'}</span>
                      </div>
                    </div>

                    {lead.notes && (
                      <p className="text-xs text-slate-400 italic">Notes: {lead.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 9: REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">Student Ratings & Feedback</h2>
                  <p className="text-xs text-slate-400">Verified reviews submitted by LAUTECH students after completed assistance</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-4xl font-extrabold text-amber-400">
                    {dashboardData?.agent?.rating || '4.9'}
                  </div>
                  <div>
                    <div className="flex items-center text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400" />
                      ))}
                    </div>
                    <div className="text-xs text-slate-400">{reviews.length || 18} verified ratings</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div key={rev.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-white">{rev.studentName}</div>
                      <div className="flex items-center text-amber-400">
                        {[...Array(rev.rating || 5)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-300">"{rev.reviewText}"</p>
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Verified Student Assistance
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 12: TERMS & POLICIES */}
          {activeTab === 'terms' && (
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 animate-in fade-in duration-150">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" /> Hostel Ease Agent Code of Conduct
              </h2>
              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <p>1. <strong>Standard Transparent Service Fee:</strong> Agent fee is standardized at ₦5,000 per completed placement. Hidden charges or unexpected demands are strictly illegal.</p>
                <p>2. <strong>Direct Student Booking Rights:</strong> Students always reserve the right to book directly through the platform without agent mediation.</p>
                <p>3. <strong>Anti-Fraud & Accuracy:</strong> All photos, prices, water supply details, and landlord identities must be strictly factual. False representations result in immediate account suspension.</p>
                <p>4. <strong>In-Platform Operations:</strong> Communication and payments are logged for safety and dispute resolution.</p>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* MODAL: Request Bank Payout */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-white space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Request Bank Withdrawal</h3>
              <button onClick={() => setShowPayoutModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleRequestPayout} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Withdrawal Amount (₦)</label>
                <input
                  type="number"
                  required
                  min="2000"
                  max={earningsSummary?.availableBalance || 45000}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="e.g. 20000"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Bank Name</label>
                <select
                  value={payoutBank}
                  onChange={(e) => setPayoutBank(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                >
                  <option value="Guaranty Trust Bank">Guaranty Trust Bank (GTBank)</option>
                  <option value="First Bank of Nigeria">First Bank of Nigeria</option>
                  <option value="Access Bank">Access Bank</option>
                  <option value="United Bank for Africa">United Bank for Africa (UBA)</option>
                  <option value="Zenith Bank">Zenith Bank</option>
                  <option value="Opay">Opay Digital Services</option>
                  <option value="Moniepoint">Moniepoint MFB</option>
                  <option value="Kuda Bank">Kuda Microfinance Bank</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Account Number (10 Digits)</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={payoutAccountNum}
                  onChange={(e) => setPayoutAccountNum(e.target.value)}
                  placeholder="0123456789"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  value={payoutAccountName}
                  onChange={(e) => setPayoutAccountName(e.target.value)}
                  placeholder="Bamidele Olatunji"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowPayoutModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl">Submit Payout</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Submit Hostel Lead */}
      {showLeadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-white space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Submit New Hostel Lead</h3>
              <button onClick={() => setShowLeadModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmitLead} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Hostel / Lodge Name *</label>
                <input
                  type="text"
                  required
                  value={leadHostelName}
                  onChange={(e) => setLeadHostelName(e.target.value)}
                  placeholder="e.g. Royal Palace Villa"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Area Location *</label>
                  <select
                    value={leadAreaId}
                    onChange={(e) => setLeadAreaId(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                  >
                    <option value="area-under-g">Under G</option>
                    <option value="area-adenike">Adenike</option>
                    <option value="area-stadium">Stadium Road</option>
                    <option value="area-college">College Road</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Estimated Rent (₦/yr)</label>
                  <input
                    type="number"
                    value={leadRent}
                    onChange={(e) => setLeadRent(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Landmark / Directions</label>
                <input
                  type="text"
                  value={leadLandmark}
                  onChange={(e) => setLeadLandmark(e.target.value)}
                  placeholder="e.g. Opposite Bovas Petrol Station, Under G"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Landlord / Caretaker Name</label>
                  <input
                    type="text"
                    value={leadLandlordName}
                    onChange={(e) => setLeadLandlordName(e.target.value)}
                    placeholder="e.g. Alhaji Kareem"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Landlord Phone Number</label>
                  <input
                    type="tel"
                    value={leadLandlordPhone}
                    onChange={(e) => setLeadLandlordPhone(e.target.value)}
                    placeholder="08012345678"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Lodge Condition & Facilities Notes</label>
                <textarea
                  rows={2}
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  placeholder="Compound gate, borehole water pumping schedule, prepaid meter..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowLeadModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl">Submit Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Suggest Hostels to Student */}
      {suggestModalRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 text-white space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Suggest Options for {suggestModalRequest.studentName}</h3>
                <p className="text-xs text-slate-400">Budget: ₦{suggestModalRequest.budgetMax?.toLocaleString()} • {suggestModalRequest.roomType?.replace('_', ' ')}</p>
              </div>
              <button onClick={() => setSuggestModalRequest(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 text-xs">
              {hostels.map(h => {
                const isSelected = selectedHostelIds.includes(h.id);
                return (
                  <div
                    key={h.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedHostelIds(selectedHostelIds.filter(id => id !== h.id));
                      } else {
                        setSelectedHostelIds([...selectedHostelIds, h.id]);
                      }
                    }}
                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                      isSelected ? 'bg-emerald-950/70 border-emerald-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{h.title}</div>
                      <div className="text-[11px] text-slate-400">{h.displayAddress} • ₦{h.minPrice?.toLocaleString()}/yr</div>
                    </div>
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                      isSelected ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-slate-700'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-between items-center text-xs">
              <span className="text-slate-400">{selectedHostelIds.length} lodges selected</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSuggestModalRequest(null)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
                <button
                  type="button"
                  disabled={selectedHostelIds.length === 0}
                  onClick={handleSendSuggestions}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl"
                >
                  Send to Student
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
