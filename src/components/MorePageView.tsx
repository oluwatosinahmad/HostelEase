import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Search, 
  LayoutDashboard, 
  Bookmark, 
  Receipt, 
  Calendar, 
  KeyRound, 
  MessageSquare, 
  Bell, 
  Users, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  Calculator, 
  Heart, 
  Sun, 
  Moon, 
  User as UserIcon, 
  LogOut, 
  Settings, 
  Building2, 
  PlusCircle, 
  Layers, 
  DollarSign, 
  TrendingUp, 
  Compass, 
  ArrowLeft,
  ChevronRight,
  X,
  Video
} from 'lucide-react';
import { AppView } from '../types/hostelEase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserAvatar } from './UserAvatar';
import { api } from '../services/api';

interface MorePageViewProps {
  onNavigate: (view: AppView) => void;
  onNavigateToDashboardTab?: (tab: 'overview' | 'bookings' | 'inspections' | 'shortlist' | 'preferences' | 'search_history' | 'profile_security') => void;
  onOpenAuth: (defaultRole?: 'STUDENT' | 'PROVIDER' | 'ADMIN') => void;
  savedCount: number;
  onOpenAI?: () => void;
  onOpenUtilityRadar?: () => void;
  onOpenSafeWalk?: () => void;
  onOpenUtilityCalculator?: () => void;
  onOpenWomenSection?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const MorePageView: React.FC<MorePageViewProps> = ({
  onNavigate,
  onNavigateToDashboardTab,
  onOpenAuth,
  savedCount,
  onOpenAI,
  onOpenUtilityRadar,
  onOpenSafeWalk,
  onOpenUtilityCalculator,
  onOpenWomenSection,
  onShowToast
}) => {
  const { user, isAuthenticated, isStudent, isProvider, isAdmin, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [unreadMsgCount, setUnreadMsgCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [notifModalOpen, setNotifModalOpen] = useState<boolean>(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  // Helper for landlord portal tabs
  const navigateLandlordTab = (tab: string) => {
    onNavigate('provider-portal');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('hostel_ease_provider_tab', { detail: tab }));
    }, 60);
  };

  // Helper for student dashboard tabs
  const navigateStudentTab = (tab: 'overview' | 'bookings' | 'inspections' | 'shortlist' | 'preferences' | 'search_history' | 'profile_security') => {
    onNavigate('student-dashboard');
    if (onNavigateToDashboardTab) {
      onNavigateToDashboardTab(tab);
    }
  };

  // Fetch live counts
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchLiveCounts = () => {
      api.messages.getUnreadCount()
        .then(res => setUnreadMsgCount(res.unreadCount || 0))
        .catch(() => {});

      api.notifications.getAll()
        .then(res => {
          setNotifications(res.notifications || []);
          setUnreadNotifCount(res.unreadCount || 0);
        })
        .catch(() => {});
    };

    fetchLiveCounts();
    const interval = setInterval(fetchLiveCounts, 12000);

    const handleUpdate = () => fetchLiveCounts();
    window.addEventListener('hostel_ease_notification_updated', handleUpdate);
    window.addEventListener('hostel_ease_conversations_updated', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('hostel_ease_notification_updated', handleUpdate);
      window.removeEventListener('hostel_ease_conversations_updated', handleUpdate);
    };
  }, [isAuthenticated]);

  const handleMarkAllNotifsRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadNotifCount(0);
      if (onShowToast) onShowToast('All notifications marked as read', 'success');
    } catch {
      if (onShowToast) onShowToast('Failed to mark notifications read', 'error');
    }
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.isRead) {
      try {
        await api.notifications.markRead(notif.id);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
        setUnreadNotifCount(prev => Math.max(0, prev - 1));
      } catch {}
    }

    setNotifModalOpen(false);

    if (notif.data?.propertyId) {
      onNavigate('search');
    } else if (notif.data?.bookingId) {
      onNavigate('bookings');
    } else if (notif.type?.includes('MESSAGE')) {
      onNavigate('messages');
    }
  };

  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      logout();
      setIsLoggingOut(false);
      onNavigate('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28 pt-2">
      {/* Page Header */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('home')}
              className="p-1.5 -ml-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-bold"
              aria-label="Go to Home"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
            <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              {isAdmin ? 'Admin Menu' : isProvider ? 'Agent Hub' : isStudent ? 'Student Hub' : 'Menu & Services'}
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* ========================================================================= */}
        {/* ROLE 1: AUTHENTICATED STUDENT                                            */}
        {/* ========================================================================= */}
        {isAuthenticated && isStudent && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Student Profile Card Banner */}
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50/60 dark:from-slate-800 dark:to-emerald-950/40 rounded-3xl flex items-center justify-between border border-emerald-200/70 dark:border-emerald-800/60 shadow-xs">
              <div className="flex items-center gap-3.5 min-w-0">
                <UserAvatar fullName={user?.fullName} avatarUrl={user?.avatarUrl} size="lg" />
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 dark:text-white truncate">{user?.fullName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 uppercase">
                    🎓 LAUTECH Student
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigateStudentTab('profile_security')}
                className="p-2.5 rounded-2xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 shadow-xs border border-slate-200/60 dark:border-slate-600 shrink-0"
                title="Profile & Settings"
                aria-label="Profile and Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Jump Action Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => onNavigate('home')}
                className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-center flex flex-col items-center gap-1.5 shadow-xs hover:border-emerald-500/50 transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Home className="w-4 h-4" />
                </div>
                <span className="text-slate-800 dark:text-slate-200">Home</span>
              </button>

              <button
                onClick={() => onNavigate('search')}
                className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-center flex flex-col items-center gap-1.5 shadow-xs hover:border-emerald-500/50 transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Search className="w-4 h-4" />
                </div>
                <span className="text-slate-800 dark:text-slate-200">Find Hostels</span>
              </button>

              <button
                onClick={() => navigateStudentTab('overview')}
                className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-center flex flex-col items-center gap-1.5 shadow-xs hover:border-emerald-500/50 transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <LayoutDashboard className="w-4 h-4" />
                </div>
                <span className="text-slate-800 dark:text-slate-200">Dashboard</span>
              </button>
            </div>

            {/* Accommodation & Bookings Group */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
              <p className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Accommodation & Bookings
              </p>

              <button
                onClick={() => onNavigate('saved')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Bookmark className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Saved Hostels</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Shortlisted lodges and bookmark history</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {savedCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-black bg-emerald-600 text-white rounded-full">
                      {savedCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>

              <button
                onClick={() => onNavigate('bookings')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">My Bookings & Reservations</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Active requests, acceptance & receipts</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('virtual-tours')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>4K Virtual Property Tours</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 uppercase">
                        4K
                      </span>
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Watch uncut on-site inspection videos</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('inspections')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Scheduled Inspections</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Physical & live video walkthrough dates</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('move-in')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Move-In Hub & Key Handover</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Code verification, keys & room check-in</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('messages')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Agent Messages & Chat</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Direct real-time conversations</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unreadMsgCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-black bg-rose-600 text-white rounded-full">
                      {unreadMsgCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>

              <button
                onClick={() => setNotifModalOpen(true)}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Notifications & Alerts</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Activity updates, responses & rent alerts</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unreadNotifCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-black bg-rose-600 text-white rounded-full">
                      {unreadNotifCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            </div>

            {/* Student Community & AI Group */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <p className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Student Community & AI
              </p>

              <button
                onClick={() => onNavigate('community')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Student Community & Roommates</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Campus discussions, sublets & 50/50 split rent</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {onOpenAI && (
                <button
                  onClick={onOpenAI}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm hover:shadow transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
                    <span>Ask Hostel Ease AI Assistant</span>
                  </div>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-black">24/7 AI</span>
                </button>
              )}
            </div>

            {/* Campus Living & Safety Tools */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <p className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Campus Living & Safety Tools
              </p>

              {onOpenUtilityRadar && (
                <button
                  onClick={onOpenUtilityRadar}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
                    <div>
                      <span className="text-xs">⚡ UtilityRadar™ (NEPA & Water)</span>
                      <p className="text-[10px] font-normal text-slate-600 dark:text-slate-400">Live grid electricity and borehole water uptime</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 rounded font-black shrink-0">
                    LIVE
                  </span>
                </button>
              )}

              {onOpenSafeWalk && (
                <button
                  onClick={onOpenSafeWalk}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-xs">🚨 SafeWalk™ Night-Trek Companion</span>
                      <p className="text-[10px] font-normal text-slate-600 dark:text-slate-400">Illuminated pathways & emergency SOS dispatch</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 rounded font-black shrink-0">
                    SOS
                  </span>
                </button>
              )}

              {onOpenUtilityCalculator && (
                <button
                  onClick={onOpenUtilityCalculator}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div>
                      <span className="text-xs">💡 Utility Bill Calculator (IBEDC)</span>
                      <p className="text-[10px] font-normal text-slate-600 dark:text-slate-400">Accurate appliance wattage & prepaid cost estimation</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200 rounded font-black shrink-0">
                    CALC
                  </span>
                </button>
              )}

              {onOpenWomenSection && (
                <button
                  onClick={onOpenWomenSection}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Heart className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <div>
                      <span className="text-xs">🌸 Women's Living & Safety</span>
                      <p className="text-[10px] font-normal text-slate-600 dark:text-slate-400">Female-only lodges, perimeter security & verified hosts</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 rounded font-black shrink-0">
                    SAFE
                  </span>
                </button>
              )}
            </div>

            {/* Settings & Sign Out */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <p className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Account & Preferences
              </p>

              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 transition-colors text-xs font-bold"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                    {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                  </div>
                  <span>Interface Theme</span>
                </div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </span>
              </button>

              <button
                onClick={() => navigateStudentTab('profile_security')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 transition-colors text-xs font-bold"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <span>Student Profile & Security</span>
                    <p className="text-[11px] font-normal text-slate-500">Department, level, matric and password</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full py-3 px-4 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-2xl transition-colors flex items-center justify-center gap-2 mt-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Student Account</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ROLE 2: AUTHENTICATED AGENT (PROVIDER)                                   */}
        {/* ========================================================================= */}
        {isAuthenticated && isProvider && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Agent Profile Header */}
            <div className="p-4 bg-gradient-to-br from-amber-50 to-emerald-50/60 dark:from-slate-800 dark:to-amber-950/30 rounded-3xl flex items-center justify-between border border-amber-200/70 dark:border-amber-800/60 shadow-xs">
              <div className="flex items-center gap-3.5 min-w-0">
                <UserAvatar fullName={user?.fullName} avatarUrl={user?.avatarUrl} size="lg" />
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 dark:text-white truncate">{user?.fullName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 uppercase">
                    🏡 Hostel Agent
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigateLandlordTab('profile_team')}
                className="p-2.5 rounded-2xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 shadow-xs border border-slate-200/60 dark:border-slate-600 shrink-0"
                title="Agent Verification & Profile"
                aria-label="Agent Verification & Profile"
              >
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </button>
            </div>

            {/* Quick Jump Action Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => navigateLandlordTab('dashboard')}
                className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-center flex flex-col items-center gap-1.5 shadow-xs hover:border-emerald-500/50 transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <LayoutDashboard className="w-4 h-4" />
                </div>
                <span className="text-slate-800 dark:text-slate-200">Dashboard</span>
              </button>

              <button
                onClick={() => navigateLandlordTab('listings')}
                className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-center flex flex-col items-center gap-1.5 shadow-xs hover:border-emerald-500/50 transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="text-slate-800 dark:text-slate-200">My Hostels</span>
              </button>

              <button
                onClick={() => navigateLandlordTab('wizard')}
                className="p-3 bg-emerald-600 rounded-2xl text-white text-xs font-bold text-center flex flex-col items-center gap-1.5 shadow-sm hover:bg-emerald-700 transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <span>+ Add Hostel</span>
              </button>
            </div>

            {/* Hostel Operations & Inventory */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
              <p className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Hostel Operations & Inventory
              </p>

              <button
                onClick={() => navigateLandlordTab('listings')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Home className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">My Hostels & Verification Status</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">View lodge approval, pricing and public preview</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => navigateLandlordTab('rooms')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Rooms & Bedspaces Inventory</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Manage individual units, prices and features</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => navigateLandlordTab('availability')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Availability & Calendar Manager</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Real-time room occupancy and vacancies</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Tenants, Bookings & Inquiries */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
              <p className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Tenants, Bookings & Inquiries
              </p>

              <button
                onClick={() => navigateLandlordTab('bookings')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Tenant Bookings & Reservations</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Accept or decline incoming space requests</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => navigateLandlordTab('move_ins')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Move-In Key Handover Manager</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Authorize tenant key release code</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => navigateLandlordTab('inspections')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Scheduled Student Inspections</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Confirm visiting dates with prospective tenants</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('messages')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Student Inquiries & Chat</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Real-time messaging with students</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unreadMsgCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-black bg-rose-600 text-white rounded-full">
                      {unreadMsgCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>

              <button
                onClick={() => setNotifModalOpen(true)}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Agent Booking Alerts</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Inspection reminders and payment confirmations</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unreadNotifCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-black bg-rose-600 text-white rounded-full">
                      {unreadNotifCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            </div>

            {/* Financials, Reports & Team */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
              <p className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Financials, Reports & Team
              </p>

              <button
                onClick={() => navigateLandlordTab('financials')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Payouts & Rent Settlements</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Bank payouts and transaction history</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => navigateLandlordTab('performance')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Performance Analytics & Views</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Search impressions, clicks and conversions</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => navigateLandlordTab('profile_team')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Team & Verification Documents</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">CAC documents, NIN, and manager roles</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* AI & Operations Tools */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <p className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                AI & Operations Tools
              </p>

              <button
                onClick={() => {
                  if (onOpenAI) onOpenAI();
                  else navigateLandlordTab('dashboard');
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 text-white rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm hover:shadow transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
                  <span>Agent AI & Price Estimator</span>
                </div>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-black">AI TOOLS</span>
              </button>

              <button
                onClick={() => onNavigate('home')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs font-medium transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
                    <Compass className="w-4 h-4" />
                  </div>
                  <span>Browse Public Listings (Student View)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Settings & Sign Out */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <p className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Account & Preferences
              </p>

              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 transition-colors text-xs font-bold"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                    {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                  </div>
                  <span>Interface Theme</span>
                </div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </span>
              </button>

              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full py-3 px-4 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-2xl transition-colors flex items-center justify-center gap-2 mt-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Agent Portal</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ROLE 3: AUTHENTICATED ADMIN                                              */}
        {/* ========================================================================= */}
        {isAuthenticated && isAdmin && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Super Admin Header */}
            <div className="p-4 bg-purple-50 dark:bg-purple-950/40 rounded-3xl flex items-center justify-between border border-purple-200 dark:border-purple-900 shadow-xs">
              <div className="flex items-center gap-3.5 min-w-0">
                <UserAvatar fullName={user?.fullName} avatarUrl={user?.avatarUrl} size="lg" />
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 dark:text-white truncate">{user?.fullName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200 uppercase">
                    👑 Super Admin
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Command Portal Action */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
              <button
                onClick={() => onNavigate('admin-portal')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 font-black text-xs shadow-xs hover:bg-purple-200 dark:hover:bg-purple-900 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-purple-700 dark:text-purple-400" />
                  <span>Admin Command Portal</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('home')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Home className="w-4 h-4 text-slate-500" />
                  <span>Home</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('search')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Search className="w-4 h-4 text-slate-500" />
                  <span>All Lodges Directory</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('community')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>Community Feed & Flags</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('messages')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-slate-500" />
                  <span>Support Messages</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Settings & Sign Out */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <p className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Account & Preferences
              </p>

              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 transition-colors text-xs font-bold"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                    {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                  </div>
                  <span>Interface Theme</span>
                </div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </span>
              </button>

              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full py-3 px-4 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-2xl transition-colors flex items-center justify-center gap-2 mt-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Admin Portal</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ROLE 4: GUEST / UNAUTHENTICATED                                          */}
        {/* ========================================================================= */}
        {!isAuthenticated && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Public Welcome Card */}
            <div className="p-4 bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-900 text-white rounded-3xl shadow-md border border-emerald-500/20">
              <p className="text-sm font-extrabold text-emerald-400">Hostel Ease • LAUTECH Edition</p>
              <p className="text-xs text-slate-200 mt-1">Verified off-campus student accommodation in Ogbomoso.</p>
            </div>

            {/* Quick Jump Action Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => onNavigate('home')}
                className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-center flex flex-col items-center gap-1.5 shadow-xs hover:border-emerald-500/50 transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Home className="w-4 h-4" />
                </div>
                <span className="text-slate-800 dark:text-slate-200">Home</span>
              </button>

              <button
                onClick={() => onNavigate('search')}
                className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-center flex flex-col items-center gap-1.5 shadow-xs hover:border-emerald-500/50 transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Search className="w-4 h-4" />
                </div>
                <span className="text-slate-800 dark:text-slate-200">Find Hostels</span>
              </button>
            </div>

            {/* Public Exploration Links */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <button
                onClick={() => onNavigate('community')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">Student Community & Roommate Matching</span>
                    <p className="text-[11px] font-normal text-slate-500">Find compatible roommates & split rent</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {onOpenAI && (
                <button
                  onClick={onOpenAI}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs hover:shadow transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
                    <span>Ask Hostel Ease AI Assistant</span>
                  </div>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-black">24/7 AI</span>
                </button>
              )}
            </div>

            {/* Campus Living Tools */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <p className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Campus Living Tools
              </p>

              {onOpenUtilityRadar && (
                <button
                  onClick={onOpenUtilityRadar}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
                    <div>
                      <span className="text-xs">⚡ UtilityRadar™ (NEPA & Water)</span>
                      <p className="text-[10px] font-normal text-slate-600 dark:text-slate-400">Track live electricity and water status</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 rounded font-black shrink-0">
                    LIVE
                  </span>
                </button>
              )}

              {onOpenSafeWalk && (
                <button
                  onClick={onOpenSafeWalk}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-xs">🚨 SafeWalk™ Night Companion</span>
                      <p className="text-[10px] font-normal text-slate-600 dark:text-slate-400">Night routes & emergency SOS</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 rounded font-black shrink-0">
                    SOS
                  </span>
                </button>
              )}

              {onOpenUtilityCalculator && (
                <button
                  onClick={onOpenUtilityCalculator}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div>
                      <span className="text-xs">💡 Utility Bill Calculator (IBEDC)</span>
                      <p className="text-[10px] font-normal text-slate-600 dark:text-slate-400">Calculate electricity and monthly bills</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200 rounded font-black shrink-0">
                    CALC
                  </span>
                </button>
              )}

              {onOpenWomenSection && (
                <button
                  onClick={onOpenWomenSection}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Heart className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <div>
                      <span className="text-xs">🌸 Women's Living & Safety</span>
                      <p className="text-[10px] font-normal text-slate-600 dark:text-slate-400">Female-only lodges & verified security</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 rounded font-black shrink-0">
                    SAFE
                  </span>
                </button>
              )}
            </div>

            {/* Agent Sign In Entry */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <button
                onClick={() => onOpenAuth('PROVIDER')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/60 text-xs font-bold"
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Are you an Agent? List Your Hostel</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 rounded-full font-black">
                  PARTNER
                </span>
              </button>
            </div>

            {/* Auth Actions in Public Drawer */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 transition-colors text-xs font-bold"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                    {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                  </div>
                  <span>Interface Theme</span>
                </div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={() => onOpenAuth('STUDENT')}
                  className="w-full py-3 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-colors text-center"
                >
                  Log In
                </button>
                <button
                  onClick={() => onOpenAuth('STUDENT')}
                  className="w-full py-3 text-xs font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-2xl shadow-xs transition-colors text-center"
                >
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notifications Modal */}
      {notifModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50 duration-200"
          onClick={() => setNotifModalOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] pb-[max(env(safe-area-inset-bottom),0.75rem)] animate-in slide-in-from-bottom-5 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-sm text-slate-900 dark:text-white">Notifications</span>
                {unreadNotifCount > 0 && (
                  <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-black">
                    {unreadNotifCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadNotifCount > 0 && (
                  <button
                    onClick={handleMarkAllNotifsRead}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer px-2 py-1 rounded-lg"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setNotifModalOpen(false)}
                  className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  aria-label="Close notifications"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter tabs: All vs Unread */}
            <div className="px-4 py-2 bg-slate-100/70 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-800 flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setNotifFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  notifFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setNotifFilter('unread')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  notifFilter === 'unread'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Unread ({unreadNotifCount})
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2">
              {(() => {
                const displayNotifs = notifFilter === 'unread'
                  ? notifications.filter(n => !n.isRead)
                  : notifications;

                if (displayNotifs.length === 0) {
                  return (
                    <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
                      <p className="font-bold">No {notifFilter === 'unread' ? 'unread ' : ''}notifications</p>
                      <p className="text-[11px]">You're all caught up!</p>
                    </div>
                  );
                }

                return displayNotifs.slice(0, 20).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 rounded-2xl text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-start gap-3 min-h-[48px] ${
                      !n.isRead ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-l-3 border-emerald-500' : ''
                    }`}
                  >
                    <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${!n.isRead ? 'bg-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-700' : 'bg-slate-300 dark:bg-slate-700'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{n.title}</p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{n.message}</p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 inline-block font-medium">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Prompt Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-inner">
              <LogOut className="w-6 h-6" />
            </div>
            
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Log Out of Hostel Ease?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to sign out? You will need to log back in to access your saved hostels, active reservations, and chat messages.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogout();
                }}
                className="py-2.5 px-4 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Yes, Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Processing Loading Overlay */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <div className="w-8 h-8 border-3 border-emerald-600 dark:border-emerald-400 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Logging out...</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Securing your session and redirecting you to Home.</p>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-2/3 animate-pulse rounded-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
