import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Video, 
  Footprints, 
  CheckCircle2, 
  AlertCircle, 
  Bookmark, 
  Search,
  MessageSquare,
  Building2,
  XCircle,
  Receipt,
  CreditCard,
  Sparkles,
  DollarSign,
  User as UserIcon,
  Settings,
  ShieldCheck,
  History,
  ArrowRight,
  Eye,
  SlidersHorizontal,
  Bell,
  Trash2,
  Layers,
  Lock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Plus,
  Bot,
  KeyRound,
  Users,
  HelpCircle
} from 'lucide-react';
import { 
  StudentDashboardData, 
  StudentPreferences, 
  Area, 
  Property,
  PropertyType
} from '../types/hostelEase';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatNaira, formatDistance, formatDate, getPropertyTypeLabel } from '../utils/formatters';
import { PaymentModal } from './PaymentModal';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import { BookingDetailModal } from './BookingDetailModal';
import { StudentOnboardingModal } from './StudentOnboardingModal';
import { SmartMatchFeed } from './SmartMatchFeed';
import { SmartSearchBar } from './SmartSearchBar';
import { SmartShortlistManager } from './SmartShortlistManager';
import { AccommodationProgressTracker } from './AccommodationProgressTracker';
import { UserAvatar } from './UserAvatar';
import { DEFAULT_STUDENT_DASHBOARD } from '../services/offlineFallback';

interface StudentDashboardProps {
  areas?: Area[];
  initialTab?: 'overview' | 'bookings' | 'inspections' | 'shortlist' | 'preferences' | 'search_history' | 'profile_security';
  onNavigateToSearch: () => void;
  onNavigateToSaved: () => void;
  onNavigateToInspections?: () => void;
  onNavigateToBookings?: () => void;
  onNavigateToPayments?: () => void;
  onNavigateToMoveIn?: () => void;
  onNavigateToHistory?: () => void;
  onNavigateToMessages?: () => void;
  onNavigateToCommunity?: () => void;
  onOpenConversation?: (propertyId: string) => void;
  onApplyPreferencesToSearch?: (prefs: StudentPreferences) => void;
  onSelectProperty?: (id: string) => void;
  onOpenAI?: (contextProp?: any) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  areas = [],
  initialTab,
  onNavigateToSearch,
  onNavigateToSaved,
  onNavigateToInspections,
  onNavigateToBookings,
  onNavigateToPayments,
  onNavigateToMoveIn,
  onNavigateToHistory,
  onNavigateToMessages,
  onNavigateToCommunity,
  onOpenConversation,
  onApplyPreferencesToSearch,
  onSelectProperty,
  onOpenAI,
  onShowToast
}) => {
  const { user, loginDemo } = useAuth();
  
  // Dashboard Sub-tabs
  type SubTab = 'overview' | 'bookings' | 'inspections' | 'shortlist' | 'preferences' | 'search_history' | 'profile_security';
  const [activeTab, setActiveTab] = useState<SubTab>(initialTab || 'overview');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Core Data
  const [dashboardData, setDashboardData] = useState<StudentDashboardData | null>(DEFAULT_STUDENT_DASHBOARD);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<any | null>(null);
  const [selectedReceiptRef, setSelectedReceiptRef] = useState<string | null>(null);
  const [selectedBookingDetailId, setSelectedBookingDetailId] = useState<string | null>(null);
  const [onboardingModalOpen, setOnboardingModalOpen] = useState<boolean>(false);
  const [showSupportModal, setShowSupportModal] = useState<boolean>(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState<string>('');

  // Profile Edit State
  const [profileFullName, setProfileFullName] = useState<string>('');
  const [profilePhone, setProfilePhone] = useState<string>('');
  const [profileDepartment, setProfileDepartment] = useState<string>('');
  const [profileLevel, setProfileLevel] = useState<string>('');
  const [profileMatricNo, setProfileMatricNo] = useState<string>('');
  const [profileGender, setProfileGender] = useState<string>('ANY');
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [changingPassword, setChangingPassword] = useState<boolean>(false);

  // Notification Preferences State
  const [notifPrefs, setNotifPrefs] = useState({
    inspectionReminders: true,
    availabilityAlerts: true,
    priceAlerts: true,
    recommendationAlerts: true
  });
  const [savingNotifs, setSavingNotifs] = useState<boolean>(false);

  // Preferences Form State
  const [prefMinBudget, setPrefMinBudget] = useState<number>(100000);
  const [prefMaxBudget, setPrefMaxBudget] = useState<number>(250000);
  const [prefAreas, setPrefAreas] = useState<string[]>([]);
  const [prefRoomTypes, setPrefRoomTypes] = useState<PropertyType[]>(['SELF_CONTAIN']);
  const [prefFacilities, setPrefFacilities] = useState<string[]>(['water', 'electricity']);
  const [prefMaxDistance, setPrefMaxDistance] = useState<number>(2.5);
  const [prefGender, setPrefGender] = useState<'ANY' | 'MALE_ONLY' | 'FEMALE_ONLY'>('ANY');
  const [prefMoveInDate, setPrefMoveInDate] = useState<string>('2026-09-01');
  const [prefMoveInFlexible, setPrefMoveInFlexible] = useState<boolean>(true);
  const [savingPrefs, setSavingPrefs] = useState<boolean>(false);

  // Fetch complete aggregated dashboard
  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await api.student.getDashboard();
      setDashboardData(data);

      // Populate profile state
      if (data.user) {
        setProfileFullName(data.user.fullName || '');
        setProfilePhone(data.user.phone || '');
        setProfileDepartment(data.user.department || '');
        setProfileLevel(data.user.level || '');
        setProfileMatricNo(data.user.matricNo || '');
        setProfileGender(data.user.gender || 'ANY');
      }

      // Populate preferences form state
      if (data.preferences) {
        setPrefMinBudget(data.preferences.minBudget || 100000);
        setPrefMaxBudget(data.preferences.maxBudget || 250000);
        setPrefAreas(data.preferences.preferredAreas || []);
        setPrefRoomTypes(data.preferences.preferredRoomTypes || ['SELF_CONTAIN']);
        setPrefFacilities(data.preferences.preferredFacilities || ['water', 'electricity']);
        setPrefMaxDistance(data.preferences.maxDistanceKm || 2.5);
        setPrefGender(data.preferences.genderPreference || 'ANY');
        setPrefMoveInDate(data.preferences.preferredMoveInDate || '2026-09-01');
        setPrefMoveInFlexible(Boolean(data.preferences.isMoveInFlexible));
      }

      // If student has never completed onboarding, prompt wizard
      if (data.preferences && data.preferences.onboardingCompleted === false && data.summary.savedCount === 0 && data.summary.activeBookingsCount === 0) {
        setOnboardingModalOpen(true);
      }

      setError(null);
    } catch (err: any) {
      console.warn('Student dashboard fetch error, using resilient local hub data:', err);
      setDashboardData(DEFAULT_STUDENT_DASHBOARD);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Save Preferences
  const handleSavePreferences = async (customPrefs?: Partial<StudentPreferences>) => {
    setSavingPrefs(true);
    try {
      const payload: Partial<StudentPreferences> = customPrefs || {
        minBudget: prefMinBudget,
        maxBudget: prefMaxBudget,
        preferredAreas: prefAreas,
        preferredRoomTypes: prefRoomTypes,
        preferredFacilities: prefFacilities,
        maxDistanceKm: prefMaxDistance,
        genderPreference: prefGender,
        preferredMoveInDate: prefMoveInDate,
        isMoveInFlexible: prefMoveInFlexible,
        academicSession: '2026/2027',
        onboardingCompleted: true
      };

      await api.student.savePreferences(payload);
      onShowToast('Accommodation preferences updated successfully!', 'success');
      loadDashboard();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update preferences', 'error');
    } finally {
      setSavingPrefs(false);
    }
  };

  // Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.student.updateProfile({
        fullName: profileFullName,
        phone: profilePhone,
        department: profileDepartment,
        level: profileLevel,
        matricNo: profileMatricNo,
        gender: profileGender
      });
      onShowToast('Personal profile details updated!', 'success');
      loadDashboard();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      onShowToast('New passwords do not match', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      await api.student.changePassword(currentPassword, newPassword);
      onShowToast('Password changed successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to change password', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  // Delete search item
  const handleDeleteSearchItem = async (id: string) => {
    try {
      await api.student.deleteSearchItem(id);
      loadDashboard();
    } catch (err: any) {
      onShowToast('Failed to delete search record', 'error');
    }
  };

  // Clear all search history
  const handleClearSearchHistory = async () => {
    try {
      await api.student.clearSearchHistory();
      onShowToast('Search history cleared', 'info');
      loadDashboard();
    } catch (err: any) {
      onShowToast('Failed to clear search history', 'error');
    }
  };

  // Handle Action Trigger from "What's Next?"
  const handleExecuteAction = (action: any) => {
    switch (action.actionType) {
      case 'PAY_NOW':
        if (action.bookingId && dashboardData?.pendingPayments) {
          const b = dashboardData.pendingPayments.find(p => p.id === action.bookingId);
          if (b) {
            setSelectedBookingForPayment({
              id: b.id,
              bookingReference: b.bookingReference,
              propertyTitle: b.propertyTitle,
              roomName: b.roomName,
              totalCost: b.totalCost,
              totalPayable: b.totalPayable
            });
          }
        }
        break;
      case 'VIEW_INSPECTION':
        if (onNavigateToInspections) onNavigateToInspections();
        else setActiveTab('inspections');
        break;
      case 'VIEW_BOOKINGS':
        if (onNavigateToBookings) onNavigateToBookings();
        else setActiveTab('bookings');
        break;
      case 'VIEW_INSPECTIONS':
        if (onNavigateToInspections) onNavigateToInspections();
        else setActiveTab('inspections');
        break;
      case 'VIEW_MESSAGES':
        if (onOpenConversation) onOpenConversation(action.propertyId || '');
        break;
      case 'COMPARE_SAVED':
        setActiveTab('shortlist');
        break;
      case 'EXPLORE_HOSTELS':
      default:
        onNavigateToSearch();
        break;
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
        <p className="text-sm font-bold text-slate-600">Loading your personal student hub...</p>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="p-6 bg-red-50 border border-red-200 rounded-3xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <h2 className="text-base font-bold text-red-950">Unable to load student hub</h2>
          <p className="text-xs text-red-700">{error}</p>
          <button
            onClick={loadDashboard}
            className="px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl shadow"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const { summary, urgentAction, activeBooking, pendingPayments, savedHostels, recentlyViewed, recommendedHostels, preferences, profileCompleteness } = dashboardData!;

  const studentFirstName = dashboardData?.user.fullName?.split(' ')[0] || user?.fullName?.split(' ')[0] || 'Student';
  const isReturningStudent = (summary?.savedCount || 0) > 0 || (summary?.activeBookingsCount || 0) > 0 || Boolean(preferences?.onboardingCompleted);
  const greetingSubtitle = isReturningStudent
    ? `Welcome back, ${studentFirstName} 👋 Ready to continue your accommodation search?`
    : `Welcome to Hostel Ease, ${studentFirstName} 👋 Let's help you find a place that feels right for you.`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* 1. TOP HERO GREETING & PROFILE BANNER */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6 border border-emerald-500/20">
        <div className="space-y-3 max-w-2xl z-10">
          <div className="flex items-center gap-3">
            <UserAvatar 
              fullName={dashboardData?.user.fullName || user?.fullName} 
              avatarUrl={dashboardData?.user.avatarUrl} 
              size="xl" 
              className="border-2 border-emerald-400 shadow-md ring-4 ring-emerald-500/20 shrink-0" 
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950 uppercase tracking-wide">
                  LAUTECH Student
                </span>
                <span className="text-[11px] text-emerald-300 font-medium">
                  {dashboardData?.user.department ? `${dashboardData.user.department} • ${dashboardData.user.level || 'Undergraduate'}` : 'Academic Session 2026/2027'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">
                {getGreeting()}, {studentFirstName}! 👋
              </h1>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-medium">
            {greetingSubtitle}
          </p>

          {/* Quick Search Directly in Hero */}
          <div className="pt-1">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-2xl p-1.5 border border-white/20 max-w-lg">
              <Search className="w-4 h-4 text-emerald-300 ml-2 shrink-0" />
              <input
                type="text"
                value={headerSearchQuery}
                onChange={(e) => setHeaderSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onNavigateToSearch();
                  }
                }}
                placeholder="Search for accommodation in Under G, Adenike, Stadium..."
                className="bg-transparent text-white placeholder-emerald-200/70 text-xs outline-none flex-1 font-medium"
              />
              <button
                onClick={onNavigateToSearch}
                className="px-3.5 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs rounded-xl transition shadow-sm"
              >
                Search
              </button>
            </div>
          </div>

          {/* Profile Completeness Bar */}
          <div className="pt-1 max-w-md">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-emerald-200 font-semibold flex items-center gap-1.5 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Profile Progress: {profileCompleteness.score}% Complete
              </span>
              <span className="font-bold text-emerald-300 text-[10px]">
                {profileCompleteness.score === 100 ? 'Verified 🛡️' : 'Basic Level'}
              </span>
            </div>
            <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${profileCompleteness.score}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 z-10 shrink-0">
          <button
            onClick={() => setOnboardingModalOpen(true)}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-300" />
            <span>Preferences</span>
          </button>
          
          <button
            onClick={onNavigateToSearch}
            className="px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            <span>Find Accommodation</span>
          </button>
        </div>
      </div>

      {/* QUICK ACTIONS RIBBON (Section 12) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <button
          onClick={onNavigateToSearch}
          className="p-3 bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-2xl text-left flex items-center gap-2.5 transition group shadow-xs"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block leading-tight">Find Hostels</span>
            <span className="text-[10px] text-slate-400">Search zones</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('shortlist')}
          className="p-3 bg-white hover:bg-rose-50/50 border border-slate-200 hover:border-rose-300 rounded-2xl text-left flex items-center gap-2.5 transition group shadow-xs"
        >
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
            <Bookmark className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block leading-tight">Saved ({summary.savedCount})</span>
            <span className="text-[10px] text-slate-400">Your shortlist</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className="p-3 bg-white hover:bg-sky-50/50 border border-slate-200 hover:border-sky-300 rounded-2xl text-left flex items-center gap-2.5 transition group shadow-xs"
        >
          <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block leading-tight">My Bookings</span>
            <span className="text-[10px] text-slate-400">{summary.activeBookingsCount} active</span>
          </div>
        </button>

        <button
          onClick={() => onNavigateToMessages ? onNavigateToMessages() : onOpenConversation ? onOpenConversation('') : null}
          className="p-3 bg-white hover:bg-teal-50/50 border border-slate-200 hover:border-teal-300 rounded-2xl text-left flex items-center gap-2.5 transition group shadow-xs"
        >
          <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-black group-hover:scale-105 transition-transform relative">
            <MessageSquare className="w-4 h-4" />
            {summary.unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-600 rounded-full border-2 border-white" />
            )}
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block leading-tight">Messages</span>
            <span className="text-[10px] text-slate-400">{summary.unreadMessagesCount > 0 ? `${summary.unreadMessagesCount} unread` : 'Landlords'}</span>
          </div>
        </button>

        <button
          onClick={() => onNavigateToMoveIn ? onNavigateToMoveIn() : null}
          className="p-3 bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 rounded-2xl text-left flex items-center gap-2.5 transition group shadow-xs"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block leading-tight">Move-In Hub</span>
            <span className="text-[10px] text-slate-400">Checklist & Key</span>
          </div>
        </button>

        <button
          onClick={() => setShowSupportModal(true)}
          className="p-3 bg-white hover:bg-purple-50/50 border border-slate-200 hover:border-purple-300 rounded-2xl text-left flex items-center gap-2.5 transition group shadow-xs"
        >
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block leading-tight">Get Help</span>
            <span className="text-[10px] text-slate-400">24/7 Support</span>
          </div>
        </button>
      </div>

      {/* 2. REAL SUMMARY METRICS RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveTab('shortlist')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-sm text-left transition-all group space-y-1"
        >
          <div className="flex items-center justify-between text-slate-400 group-hover:text-emerald-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Saved Hostels</span>
            <Bookmark className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.savedCount}</div>
          <span className="text-[10px] text-slate-400 font-medium">On your shortlist</span>
        </button>

        <button
          onClick={() => setActiveTab('inspections')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-sm text-left transition-all group space-y-1"
        >
          <div className="flex items-center justify-between text-slate-400 group-hover:text-emerald-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Inspections</span>
            <Calendar className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.pendingInspectionsCount}</div>
          <span className="text-[10px] text-slate-400 font-medium">Pending landlord reply</span>
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-sm text-left transition-all group space-y-1"
        >
          <div className="flex items-center justify-between text-slate-400 group-hover:text-emerald-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Bookings</span>
            <Building2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.activeBookingsCount}</div>
          <span className="text-[10px] text-slate-400 font-medium">Reserved room spaces</span>
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`p-4 rounded-2xl border text-left transition-all space-y-1 ${
            summary.pendingPaymentsCount > 0
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/20'
              : 'bg-white border-slate-200 hover:border-emerald-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              summary.pendingPaymentsCount > 0 ? 'text-rose-700' : 'text-slate-500'
            }`}>
              Pending Payment
            </span>
            <CreditCard className={`w-4 h-4 ${summary.pendingPaymentsCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-black ${summary.pendingPaymentsCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            {summary.pendingPaymentsCount}
          </div>
          <span className={`text-[10px] font-medium ${summary.pendingPaymentsCount > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
            {summary.pendingPaymentsCount > 0 ? 'Action required now' : 'All clear'}
          </span>
        </button>

        <button
          onClick={() => { if (onOpenConversation) onOpenConversation(''); }}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-sm text-left transition-all group space-y-1 col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between text-slate-400 group-hover:text-emerald-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Unread Messages</span>
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className={`text-2xl font-black ${summary.unreadMessagesCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {summary.unreadMessagesCount}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">From hostel owners</span>
        </button>
      </div>

      {/* 3. SMART ACTION PRIORITIZATION: "WHAT DO I NEED TO DO NEXT?" */}
      {urgentAction && (
        <div className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in slide-in-from-top-2">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${urgentAction.badgeColor}`}>
                {urgentAction.badge}
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Recommended Next Step
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900">{urgentAction.title}</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{urgentAction.message}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto">
            <button
              onClick={() => handleExecuteAction(urgentAction)}
              className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {urgentAction.actionLabel}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2-COLUMN LAYOUT: CATEGORIZED LEFT SIDEBAR + RIGHT MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* LEFT COLUMN: STUDENT SIDEBAR */}
        <div className="lg:col-span-1 space-y-4">
          
          {/* User Profile Mini Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <UserAvatar 
                fullName={dashboardData?.user.fullName || user?.fullName} 
                avatarUrl={dashboardData?.user.avatarUrl} 
                size="lg" 
                className="shrink-0 shadow-xs" 
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-sm text-slate-900 truncate">{dashboardData?.user.fullName || user?.fullName || 'Student'}</h3>
                <p className="text-[11px] text-emerald-700 font-bold truncate">{dashboardData?.user.matricNo || 'LAUTECH Student'}</p>
                <p className="text-[10px] text-slate-400 truncate">{dashboardData?.user.department ? `${dashboardData.user.department} • ${dashboardData.user.level || '100L'}` : 'Undergraduate'}</p>
              </div>
            </div>

            {/* Profile Completeness Status */}
            <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Profile Status
                </span>
                <span className="font-black text-emerald-700">{profileCompleteness.score}%</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${profileCompleteness.score}%` }}
                />
              </div>
            </div>
          </div>

          {/* Categorized Sidebar Navigation Links */}
          <div className="bg-white rounded-3xl p-3 border border-slate-200 shadow-xs space-y-4">
            
            {/* Group 1: Hub & Guidance */}
            <div>
              <p className="px-3 text-[10px] font-black tracking-wider text-slate-400 uppercase mb-1.5">
                Hub & Guidance
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'overview'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className={`w-4 h-4 ${activeTab === 'overview' ? 'text-amber-300' : 'text-slate-400'}`} />
                    <span>Hub Overview</span>
                  </div>
                </button>

                <button
                  onClick={() => onOpenAI && onOpenAI()}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60 group"
                >
                  <div className="flex items-center gap-2.5">
                    <Bot className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                    <span>Ask AI Assistant</span>
                  </div>
                  <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded-full font-black">
                    AI
                  </span>
                </button>

                <button
                  onClick={() => onNavigateToMessages ? onNavigateToMessages() : onOpenConversation ? onOpenConversation('') : null}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    <span>Messages</span>
                  </div>
                  {summary.unreadMessagesCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
                      {summary.unreadMessagesCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Group 2: Accommodation Journey */}
            <div className="border-t border-slate-100 pt-3">
              <p className="px-3 text-[10px] font-black tracking-wider text-slate-400 uppercase mb-1.5">
                Accommodation Journey
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => onNavigateToMoveIn ? onNavigateToMoveIn() : null}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <KeyRound className="w-4 h-4 text-emerald-600" />
                    <span>Move-In Hub</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-black">
                    Checklist
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('bookings')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'bookings'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 className={`w-4 h-4 ${activeTab === 'bookings' ? 'text-white' : 'text-slate-400'}`} />
                    <span>My Bookings</span>
                  </div>
                  {summary.activeBookingsCount > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      activeTab === 'bookings' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {summary.activeBookingsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('inspections')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'inspections'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className={`w-4 h-4 ${activeTab === 'inspections' ? 'text-white' : 'text-slate-400'}`} />
                    <span>Inspections</span>
                  </div>
                  {(dashboardData?.recentInspections?.length || 0) > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      activeTab === 'inspections' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {dashboardData?.recentInspections?.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => onNavigateToHistory ? onNavigateToHistory() : null}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <History className="w-4 h-4 text-slate-400" />
                    <span>Stay History</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Group 3: Finances & Shortlist */}
            <div className="border-t border-slate-100 pt-3">
              <p className="px-3 text-[10px] font-black tracking-wider text-slate-400 uppercase mb-1.5">
                Finances & Shortlist
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => onNavigateToPayments ? onNavigateToPayments() : null}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    <span>Payments & Receipts</span>
                  </div>
                  {summary.pendingPaymentsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
                      Action
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('shortlist')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'shortlist'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bookmark className={`w-4 h-4 ${activeTab === 'shortlist' ? 'text-white' : 'text-slate-400'}`} />
                    <span>Saved Hostels</span>
                  </div>
                  {summary.savedCount > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      activeTab === 'shortlist' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {summary.savedCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Group: Community & Roommates */}
            <div className="border-t border-slate-100 pt-3">
              <p className="px-3 text-[10px] font-black tracking-wider text-slate-400 uppercase mb-1.5">
                Community & Roommates
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => onNavigateToCommunity ? onNavigateToCommunity() : null}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                    <span>Student Community</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-black">
                    Live
                  </span>
                </button>
              </div>
            </div>

            {/* Group 4: Settings & Preferences */}
            <div className="border-t border-slate-100 pt-3">
              <p className="px-3 text-[10px] font-black tracking-wider text-slate-400 uppercase mb-1.5">
                Settings & Preferences
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('preferences')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'preferences'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <SlidersHorizontal className={`w-4 h-4 ${activeTab === 'preferences' ? 'text-white' : 'text-slate-400'}`} />
                    <span>Preferences & Budget</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('profile_security')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'profile_security'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <UserIcon className={`w-4 h-4 ${activeTab === 'profile_security' ? 'text-white' : 'text-slate-400'}`} />
                    <span>Profile & Security</span>
                  </div>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: MAIN TAB CONTENT */}
        <div className="lg:col-span-3 space-y-6">

          {/* ========================================================================= */}
          {/* SUB-TAB 1: HUB OVERVIEW                                                   */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in">
              
              {/* 1. ACCOMMODATION JOURNEY TRACKER */}
              <AccommodationProgressTracker currentStage="SEARCHING" />

              {/* FIRST-TIME STUDENT GUIDED SETUP CARD (Section 10) */}
              {(!preferences?.onboardingCompleted || profileCompleteness.score < 60) && (
                <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-3xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-700" />
                      <h3 className="font-black text-sm text-emerald-950">Let's find the right accommodation for you</h3>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 uppercase tracking-wide">
                      Personalized Match
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tell us your budget and preferred location around LAUTECH (Under G, Adenike, Stadium Road) to get personalized lodge recommendations tailored specifically to your needs.
                  </p>
                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-700 flex-wrap pt-1">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-xl border border-emerald-100"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 1. Budget</span>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-xl border border-emerald-100"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 2. Preferred Area</span>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-xl border border-emerald-100"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 3. Room Type</span>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-xl border border-emerald-100"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 4. Move-In Date</span>
                  </div>
                  <div className="pt-1">
                    <button
                      onClick={() => setOnboardingModalOpen(true)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-sm transition flex items-center gap-2"
                    >
                      <span>Set Accommodation Preferences</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* 2. "WHAT CAN I DO HERE?" 4-CARD PRIMARY ACTION GRID (Section 8) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Find Accommodation */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      <Search className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">Find Accommodation</h4>
                    <p className="text-xs text-slate-500">Search verified hostels around LAUTECH campus.</p>
                  </div>
                  <button 
                    onClick={onNavigateToSearch} 
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                  >
                    <span>Find a Hostel</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Card 2: Saved Hostels */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                      <Bookmark className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">Saved Hostels</h4>
                    <p className="text-xs text-slate-500">Quickly return to places you liked ({summary.savedCount} saved).</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('shortlist')} 
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    View Saved
                  </button>
                </div>

                {/* Card 3: Upcoming Booking */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">Upcoming Booking</h4>
                    <p className="text-xs text-slate-500 truncate">
                      {activeBooking ? `${activeBooking.propertyTitle} (${activeBooking.roomName})` : 'No active booking. Schedule your first tour.'}
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('bookings')} 
                    className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    {activeBooking ? 'View Booking' : 'Book a Tour'}
                  </button>
                </div>

                {/* Card 4: Community */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                      <Users className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">Student Community</h4>
                    <p className="text-xs text-slate-500">Connect with coursemates and read area guides.</p>
                  </div>
                  <button 
                    onClick={() => onNavigateToCommunity ? onNavigateToCommunity() : null} 
                    className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    Explore Community
                  </button>
                </div>
              </div>

              {/* 3. NATURAL LANGUAGE SMART SEARCH BAR */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Student Intelligence Search
                  </h3>
                  <p className="text-xs text-slate-500">
                    Type what you need in plain words — budget, area, or requirements.
                  </p>
                </div>
                <SmartSearchBar
                  onSelectProperty={onSelectProperty}
                  onSearchResults={(r) => {
                    if (r.properties && r.properties.length > 0 && onSelectProperty) {
                      onSelectProperty(r.properties[0].id);
                    }
                  }}
                />
              </div>

              {/* 3. DETERMINISTIC SMART MATCH RECOMMENDATION FEED */}
              <SmartMatchFeed
                onSelectProperty={onSelectProperty || (() => {})}
                onRequestInspection={(id) => {
                  if (onNavigateToInspections) onNavigateToInspections();
                  else if (onSelectProperty) onSelectProperty(id);
                }}
                onBookNow={(id) => {
                  if (onSelectProperty) onSelectProperty(id);
                }}
              />

              {/* Ask Hostel Ease AI Assistant Card */}
          {onOpenAI && (
            <div className="p-6 sm:p-7 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl shadow-lg border border-emerald-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
              <div className="space-y-2 max-w-xl z-10">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                    AI Accommodation Assistant
                  </span>
                  <span className="text-xs text-slate-300 font-bold">• 100% Real LAUTECH Data</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black">
                  Need help deciding or comparing LAUTECH hostels?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Ask our AI Assistant to find lodges within your budget, break down mandatory fees, check inspection checklists, or assess warning signs.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {[
                    'Find hostels under ₦180k near Under G',
                    'Give me an inspection checklist',
                    'What do I need to do next?'
                  ].map((quickPrompt, pIdx) => (
                    <button
                      key={pIdx}
                      onClick={() => onOpenAI()}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-[11px] font-bold text-emerald-200 transition"
                    >
                      "{quickPrompt}"
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onOpenAI()}
                className="w-full md:w-auto px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 shrink-0 z-10 hover:scale-105"
              >
                <Bot className="w-4 h-4" />
                Ask Hostel Ease AI
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Student Hub Quick Command Center Grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Student Command Center Services
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* 1. Ask AI Assistant */}
              <div 
                onClick={() => onOpenAI && onOpenAI()}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Bot className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Ask AI Assistant
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Chat with AI to search budget lodges, verify light/water reliability, and generate checklists.
                  </p>
                </div>
                <div className="flex items-center text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                  Launch Assistant →
                </div>
              </div>

              {/* 2. Messages & Inquiries */}
              <div 
                onClick={() => onNavigateToMessages ? onNavigateToMessages() : onOpenConversation ? onOpenConversation('') : null}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center group-hover:scale-110 transition-transform relative">
                    <MessageSquare className="w-5 h-5" />
                    {summary.unreadMessagesCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                        {summary.unreadMessagesCount}
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Hostel Messages & Chat
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Direct in-app chat with verified LAUTECH hostel landlords, caretakers, and admins.
                  </p>
                </div>
                <div className="flex items-center text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                  Open Chat Center →
                </div>
              </div>

              {/* 3. Move-In Hub */}
              <div 
                onClick={() => onNavigateToMoveIn ? onNavigateToMoveIn() : null}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Move-In Center
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Interactive packing checklist, GPS route, room condition report & defect resolver.
                  </p>
                </div>
                <div className="flex items-center text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                  Open Move-In Hub →
                </div>
              </div>

              {/* 4. Payments & Receipts */}
              <div 
                onClick={() => onNavigateToPayments ? onNavigateToPayments() : null}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Payments & Receipts
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    View official tamper-proof payment receipts, platform fee records & transaction history.
                  </p>
                </div>
                <div className="flex items-center text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                  View Payment History →
                </div>
              </div>

              {/* 5. Inspections & Tours */}
              <div 
                onClick={() => setActiveTab('inspections')}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Hostel Inspections
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Track confirmed physical tour appointments, video walkthroughs and caretaker slots.
                  </p>
                </div>
                <div className="flex items-center text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                  Manage Tours →
                </div>
              </div>

              {/* 6. Stay History */}
              <div 
                onClick={() => onNavigateToHistory ? onNavigateToHistory() : null}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <History className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Stay History & Leases
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Verified record of your accommodation stays, leases, and caution deposit refund status.
                  </p>
                </div>
                <div className="flex items-center text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                  View Stay History →
                </div>
              </div>

            </div>
          </div>

          {/* Active Booking Card (if present) */}
          {activeBooking && (
            <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 uppercase tracking-wider border border-emerald-500/30">
                    Your Active Accommodation
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black">{activeBooking.propertyTitle}</h2>
                  <p className="text-xs text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    {activeBooking.propertyAddress} ({formatDistance(activeBooking.distanceFromCampusKm)})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30">
                    Booking: {activeBooking.status}
                  </span>
                  <span className={`px-3 py-1 rounded-full font-bold text-xs ${
                    activeBooking.paymentStatus === 'PAID'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-500 text-white animate-pulse'
                  }`}>
                    Payment: {activeBooking.paymentStatus}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Room Assigned</span>
                  <p className="font-bold text-white mt-0.5">{activeBooking.roomName}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Bedspace</span>
                  <p className="font-bold text-white mt-0.5">{activeBooking.bedspaceNumber || 'Private Ensuite'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Intended Move-In</span>
                  <p className="font-bold text-emerald-300 mt-0.5">{formatDate(activeBooking.moveInDate)}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Total Annual Cost</span>
                  <p className="font-black text-white mt-0.5">{formatNaira(activeBooking.totalCost)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
                <div className="text-xs text-slate-300 flex items-center gap-2">
                  <span>Landlord: <strong>{activeBooking.provider.name}</strong></span>
                  {activeBooking.provider.phone && <span>• 📞 {activeBooking.provider.phone}</span>}
                </div>

                <div className="flex items-center gap-2">
                  {activeBooking.status === 'CONFIRMED' && activeBooking.paymentStatus !== 'PAID' && (
                    <button
                      onClick={() => {
                        setSelectedBookingForPayment({
                          id: activeBooking.id,
                          bookingReference: activeBooking.bookingReference,
                          propertyTitle: activeBooking.propertyTitle,
                          roomName: activeBooking.roomName,
                          totalCost: activeBooking.totalCost,
                          totalPayable: activeBooking.totalCost + 2500
                        });
                      }}
                      className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all"
                    >
                      Pay Now ({formatNaira(activeBooking.totalCost + 2500)})
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedBookingDetailId(activeBooking.id)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all"
                  >
                    View Official Voucher
                  </button>

                  {onOpenConversation && (
                    <button
                      onClick={() => onOpenConversation(activeBooking.propertyId)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Chat Landlord
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Explainable Recommendations Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  Recommended For You
                </h2>
                <p className="text-xs text-slate-500">
                  Matches your saved budget ({formatNaira(preferences.minBudget)} – {formatNaira(preferences.maxBudget)}) and preferred LAUTECH locations.
                </p>
              </div>

              {onApplyPreferencesToSearch && (
                <button
                  onClick={() => onApplyPreferencesToSearch(preferences)}
                  className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  Apply to search filters ➔
                </button>
              )}
            </div>

            {recommendedHostels.length === 0 ? (
              <div className="p-8 bg-slate-50 border border-slate-200 rounded-3xl text-center space-y-2">
                <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No direct matches for your exact criteria</p>
                <p className="text-[11px] text-slate-500">Try widening your budget range or distance preference.</p>
                <button
                  onClick={() => setActiveTab('preferences')}
                  className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow"
                >
                  Adjust Preferences
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendedHostels.slice(0, 3).map(hostel => (
                  <div key={hostel.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                    <div className="relative h-40 bg-slate-100">
                      <img src={hostel.coverImage} alt={hostel.title} className="w-full h-full object-cover" />
                      <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-950/80 text-white backdrop-blur-sm">
                        {getPropertyTypeLabel(hostel.propertyType)}
                      </span>
                    </div>

                    <div className="p-4 space-y-3 flex-grow flex flex-col justify-between">
                      <div className="space-y-1">
                        <h3 className="font-bold text-sm text-slate-900 truncate">{hostel.title}</h3>
                        <p className="text-xs text-slate-500">{hostel.area.name} • {formatDistance(hostel.distanceFromCampusKm)}</p>
                        <p className="text-base font-black text-emerald-800">
                          {formatNaira(hostel.priceSummary?.rentAmount)}
                          <span className="text-[10px] text-slate-500 font-normal"> / year</span>
                        </p>
                      </div>

                      {/* Explanation Badges */}
                      <div className="space-y-1 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100 text-[10px] text-emerald-900">
                        {hostel.explanationReasons.slice(0, 2).map((reason, idx) => (
                          <p key={idx} className="flex items-center gap-1 font-semibold truncate">
                            ✓ {reason}
                          </p>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                        <button
                          onClick={() => { if (onSelectProperty) onSelectProperty(hostel.id); }}
                          className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors"
                        >
                          View Details
                        </button>
                        {onOpenConversation && (
                          <button
                            onClick={() => onOpenConversation(hostel.id)}
                            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                            title="Chat with Landlord"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Chat</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Saved Shortlist with Live Price & Availability Alerts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-emerald-600" />
                  Your Shortlist ({savedHostels.length})
                </h2>
                <p className="text-xs text-slate-500">Hostels you saved with real-time price change alerts.</p>
              </div>

              <button
                onClick={() => setActiveTab('shortlist')}
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                View full shortlist & comparison ➔
              </button>
            </div>

            {savedHostels.length === 0 ? (
              <div className="p-8 bg-slate-50 rounded-3xl border border-slate-200 text-center space-y-2">
                <Bookmark className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">You haven't saved any hostels yet</p>
                <p className="text-[11px] text-slate-500">Browse verified lodges and tap the bookmark icon to save them for comparison.</p>
                <button
                  onClick={onNavigateToSearch}
                  className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow"
                >
                  Explore Hostels
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedHostels.slice(0, 3).map(hostel => (
                  <div key={hostel.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <img src={hostel.coverImage} alt={hostel.title} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
                      <div className="space-y-0.5 truncate">
                        <h4 className="font-bold text-xs text-slate-900 truncate">{hostel.title}</h4>
                        <p className="text-[11px] text-slate-500 truncate">{hostel.area.name}</p>
                        <p className="text-xs font-black text-emerald-800">{formatNaira(hostel.priceSummary?.rentAmount)}/yr</p>
                      </div>
                    </div>

                    {/* Alerts if any */}
                    {hostel.priceChanged && (
                      <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-[10px] text-amber-900 font-bold flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span>{hostel.priceChangeDetails || 'Price updated by landlord'}</span>
                      </div>
                    )}

                    {hostel.availabilityChanged && (
                      <div className="p-2 bg-rose-50 rounded-xl border border-rose-200 text-[10px] text-rose-900 font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                        <span>{hostel.availabilityAlert}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => { if (onSelectProperty) onSelectProperty(hostel.id); }}
                        className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors"
                      >
                        Inspect Lodge
                      </button>
                      {onOpenConversation && (
                        <button
                          onClick={() => onOpenConversation(hostel.id)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                          title="Chat with Landlord"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Chat</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recently Viewed Hostels */}
          {recentlyViewed.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-600" />
                  Recently Viewed
                </h2>
                <button
                  onClick={onNavigateToSearch}
                  className="text-xs font-bold text-emerald-700 hover:underline"
                >
                  Continue Exploring ➔
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {recentlyViewed.slice(0, 4).map(hostel => (
                  <div 
                    key={hostel.id}
                    onClick={() => { if (onSelectProperty) onSelectProperty(hostel.id); }}
                    className="bg-white p-3 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-sm cursor-pointer transition-all space-y-2"
                  >
                    <img src={hostel.coverImage} alt={hostel.title} className="w-full h-24 rounded-xl object-cover" />
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 truncate">{hostel.title}</h4>
                      <p className="text-[10px] text-slate-500 truncate">{hostel.area.name}</p>
                      <p className="text-xs font-black text-emerald-800">{formatNaira(hostel.priceSummary?.rentAmount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: MY BOOKINGS                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'bookings' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm animate-in fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-black text-slate-900">Your Accommodation Reservations</h2>
              <p className="text-xs text-slate-500">Manage your room spaces, payment status, and official tenancy vouchers.</p>
            </div>

            {onNavigateToSearch && (
              <button
                onClick={onNavigateToSearch}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Reserve Another Room
              </button>
            )}
          </div>

          {/* Pending Payments Notice */}
          {pendingPayments.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-950">
                <CreditCard className="w-4 h-4 text-rose-600" />
                <span>Payment Required for {pendingPayments.length} Confirmed Reservation{pendingPayments.length > 1 ? 's' : ''}</span>
              </div>
              <p className="text-[11px] text-rose-800">
                The property landlord has accepted your reservation. Complete payment to generate your official signed receipt and lock the bedspace.
              </p>
            </div>
          )}

          {/* Active Booking Detailed View */}
          {activeBooking ? (
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase">
                    Primary Reservation
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1">{activeBooking.propertyTitle}</h3>
                  <p className="text-xs text-slate-500">{activeBooking.propertyAddress}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-800 font-bold text-xs">
                    {activeBooking.status}
                  </span>
                  <span className={`px-3 py-1 rounded-full font-bold text-xs ${
                    activeBooking.paymentStatus === 'PAID' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}>
                    {activeBooking.paymentStatus}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Reference</span>
                  <p className="font-mono font-bold text-slate-900 mt-0.5">{activeBooking.bookingReference}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Room Type</span>
                  <p className="font-bold text-slate-900 mt-0.5">{activeBooking.roomName}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Move-In Date</span>
                  <p className="font-bold text-emerald-800 mt-0.5">{formatDate(activeBooking.moveInDate)}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Total Cost</span>
                  <p className="font-black text-slate-900 mt-0.5">{formatNaira(activeBooking.totalCost)}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                {activeBooking.paymentStatus !== 'PAID' && activeBooking.status === 'CONFIRMED' && (
                  <button
                    onClick={() => {
                      setSelectedBookingForPayment({
                        id: activeBooking.id,
                        bookingReference: activeBooking.bookingReference,
                        propertyTitle: activeBooking.propertyTitle,
                        roomName: activeBooking.roomName,
                        totalCost: activeBooking.totalCost,
                        totalPayable: activeBooking.totalCost + 2500
                      });
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow"
                  >
                    Pay Now ({formatNaira(activeBooking.totalCost + 2500)})
                  </button>
                )}

                <button
                  onClick={() => setSelectedBookingDetailId(activeBooking.id)}
                  className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
                >
                  View Details & Voucher
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Building2 className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">You don't have any bookings yet.</p>
              <p className="text-xs text-slate-500">Find your preferred lodge, book a room space, and manage everything here.</p>
              <button
                onClick={onNavigateToSearch}
                className="px-5 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow"
              >
                Find a Hostel
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: INSPECTIONS                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'inspections' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Your Inspection Appointments</h2>
              <p className="text-xs text-slate-500">Physical visits and virtual video walkthrough tours scheduled with landlords.</p>
            </div>
          </div>

          {(!dashboardData?.recentInspections || dashboardData.recentInspections.length === 0) ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Calendar className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No scheduled hostel inspections yet.</p>
              <p className="text-xs text-slate-500">Before reserving, request a free physical tour or video walkthrough of any hostel.</p>
              <button
                onClick={onNavigateToSearch}
                className="px-5 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow"
              >
                Browse Hostels to Inspect
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboardData.recentInspections.map(ins => (
                <div key={ins.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-200 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                        {ins.inspectionType} TOUR
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 mt-1">{ins.propertyTitle}</h4>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800">
                      {ins.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      {formatDate(ins.preferredDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      {ins.preferredTime}
                    </span>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    {onOpenConversation && (
                      <button
                        onClick={() => onOpenConversation(ins.propertyId)}
                        className="px-3.5 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl"
                      >
                        Chat Landlord
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: SHORTLIST & SEARCH HISTORY                                    */}
      {/* ========================================================================= */}
      {activeTab === 'shortlist' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* SMART SHORTLIST ORGANIZER & COMPARISON */}
          <SmartShortlistManager
            onSelectProperty={onSelectProperty || (() => {})}
            onRequestInspection={(id) => {
              if (onNavigateToInspections) onNavigateToInspections();
              else if (onSelectProperty) onSelectProperty(id);
            }}
          />

          {/* Saved Hostels List */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-black text-slate-900">Saved Hostels ({savedHostels.length})</h2>
                <p className="text-xs text-slate-500">Your curated shortlist with automatic price tracking and availability alerts.</p>
              </div>

              {savedHostels.length >= 2 && onNavigateToSaved && (
                <button
                  onClick={onNavigateToSaved}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
                >
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Compare Shortlist Side-by-Side
                </button>
              )}
            </div>

            {savedHostels.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-8 text-center">No saved hostels yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedHostels.map(hostel => (
                  <div key={hostel.id} className="bg-slate-50 rounded-3xl border border-slate-200 p-4 space-y-3">
                    <img src={hostel.coverImage} alt={hostel.title} className="w-full h-36 rounded-2xl object-cover" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 truncate">{hostel.title}</h4>
                      <p className="text-xs text-slate-500">{hostel.area.name} • {formatDistance(hostel.distanceFromCampusKm)}</p>
                      <p className="text-sm font-black text-emerald-800 mt-1">{formatNaira(hostel.priceSummary?.rentAmount)}/yr</p>
                    </div>

                    {hostel.priceChanged && (
                      <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-[10px] text-amber-900 font-bold">
                        {hostel.priceChangeDetails}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => { if (onSelectProperty) onSelectProperty(hostel.id); }}
                        className="flex-1 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
                      >
                        View Hostel
                      </button>
                      {onOpenConversation && (
                        <button
                          onClick={() => onOpenConversation(hostel.id)}
                          className="px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                          title="Chat with Landlord"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Chat</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 5: PREFERENCES & BUDGET                                           */}
      {/* ========================================================================= */}
      {activeTab === 'preferences' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm animate-in fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-black text-slate-900">Accommodation Preferences & Budget</h2>
              <p className="text-xs text-slate-500">Configure your target budget, preferred areas, and essential facilities.</p>
            </div>

            {onApplyPreferencesToSearch && (
              <button
                onClick={() => onApplyPreferencesToSearch({
                  minBudget: prefMinBudget,
                  maxBudget: prefMaxBudget,
                  preferredAreas: prefAreas,
                  preferredRoomTypes: prefRoomTypes,
                  preferredFacilities: prefFacilities,
                  maxDistanceKm: prefMaxDistance,
                  genderPreference: prefGender,
                  preferredMoveInDate: prefMoveInDate,
                  isMoveInFlexible: prefMoveInFlexible,
                  academicSession: '2026/2027'
                })}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Use My Preferences in Search
              </button>
            )}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSavePreferences(); }} className="space-y-6">
            {/* Budget Range */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Target Annual Budget (₦)</label>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Min Budget</span>
                  <p className="text-base font-black text-slate-900">{formatNaira(prefMinBudget)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-emerald-700 uppercase font-bold">Max Budget</span>
                  <p className="text-base font-black text-emerald-800">{formatNaira(prefMaxBudget)}</p>
                </div>
              </div>
              <input
                type="range"
                min={80000}
                max={500000}
                step={10000}
                value={prefMaxBudget}
                onChange={(e) => setPrefMaxBudget(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>

            {/* Preferred Areas */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Preferred Areas</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {areas.map(a => {
                  const isChecked = prefAreas.includes(a.id);
                  return (
                    <label
                      key={a.id}
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between cursor-pointer transition-all ${
                        isChecked ? 'bg-emerald-50 border-emerald-500 text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{a.name}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setPrefAreas(prev => prev.includes(a.id) ? prev.filter(id => id !== a.id) : [...prev, a.id]);
                        }}
                        className="rounded text-emerald-600 w-4 h-4"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={savingPrefs}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow disabled:opacity-50"
              >
                {savingPrefs ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 6: PROFILE & SECURITY                                             */}
      {/* ========================================================================= */}
      {activeTab === 'profile_security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
          {/* Profile Form */}
          <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-emerald-600" />
              Personal Profile Details
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={profileFullName}
                onChange={(e) => setProfileFullName(e.target.value)}
                required
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                placeholder="e.g. 08012345678"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  value={profileDepartment}
                  onChange={(e) => setProfileDepartment(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Level</label>
                <select
                  value={profileLevel}
                  onChange={(e) => setProfileLevel(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                >
                  <option value="">Select Level</option>
                  <option value="100">100 Level (Fresher)</option>
                  <option value="200">200 Level</option>
                  <option value="300">300 Level</option>
                  <option value="400">400 Level</option>
                  <option value="500">500 Level (Finalist)</option>
                  <option value="PG">Postgraduate</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Matric / JAMB Number</label>
              <input
                type="text"
                value={profileMatricNo}
                onChange={(e) => setProfileMatricNo(e.target.value)}
                placeholder="e.g. 2026/LAU/CSC/0123"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow disabled:opacity-50"
              >
                {savingProfile ? 'Saving...' : 'Update Profile'}
              </button>
            </div>
          </form>

          {/* Account Security & Password */}
          <form onSubmit={handleChangePassword} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              Account Security & Password
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">New Password (min. 6 characters)</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={changingPassword}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow disabled:opacity-50"
              >
                {changingPassword ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}

        </div>
      </div>

      {/* Payment Checkout Modal */}
      {selectedBookingForPayment && (
        <PaymentModal
          booking={selectedBookingForPayment}
          isOpen={true}
          onClose={() => setSelectedBookingForPayment(null)}
          onPaymentSuccess={() => {
            setSelectedBookingForPayment(null);
            loadDashboard();
            onShowToast('Payment completed! Official receipt generated.', 'success');
          }}
          onShowToast={onShowToast}
        />
      )}

      {/* Payment Receipt Modal */}
      {selectedReceiptRef && (
        <PaymentReceiptModal
          paymentReference={selectedReceiptRef}
          isOpen={true}
          onClose={() => setSelectedReceiptRef(null)}
        />
      )}

      {/* Booking Voucher Detail Modal */}
      {selectedBookingDetailId && (
        <BookingDetailModal
          bookingId={selectedBookingDetailId}
          isOpen={true}
          onClose={() => setSelectedBookingDetailId(null)}
          onOpenConversation={onOpenConversation}
          onShowToast={onShowToast}
        />
      )}

      {/* First-Time Student Onboarding Wizard */}
      <StudentOnboardingModal
        areas={areas}
        isOpen={onboardingModalOpen}
        onClose={() => setOnboardingModalOpen(false)}
        onSavePreferences={handleSavePreferences}
        onShowToast={onShowToast}
      />

      {/* STUDENT 24/7 SUPPORT & ASSISTANCE MODAL */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-black">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900">Student Accommodation Support</h3>
              </div>
              <button 
                onClick={() => setShowSupportModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 space-y-1">
                <span className="font-bold text-emerald-900 block">📞 LAUTECH Campus Student Housing Desk</span>
                <p className="text-emerald-800">Direct hotline for urgent lodge inquiries, payment verification, and check-in support.</p>
                <p className="font-mono font-bold text-emerald-950 pt-1">+234 803 000 4321 / +234 812 000 8765</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <span className="font-bold text-slate-900 block">🛡️ Student Safety & Escrow Protection</span>
                <p className="text-slate-600">
                  Never make cash payments outside the platform. Your caution deposit and rent remain safely escrow-protected until keys and move-in inspection are complete.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowSupportModal(false);
                    if (onOpenAI) onOpenAI();
                  }}
                  className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <Bot className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ask AI Assistant</span>
                </button>
                <button
                  onClick={() => {
                    setShowSupportModal(false);
                    onShowToast('Support ticket logged with LAUTECH desk', 'success');
                  }}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition"
                >
                  Request Callback
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
