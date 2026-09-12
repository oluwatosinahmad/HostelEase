import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Search, 
  Bookmark, 
  User as UserIcon, 
  Menu, 
  X, 
  ShieldCheck, 
  LogOut, 
  PlusCircle, 
  LayoutDashboard, 
  MapPin, 
  KeyRound,
  Home,
  Bell,
  MessageSquare,
  Calendar,
  Receipt,
  CreditCard,
  Sparkles,
  Users,
  ChevronDown,
  HelpCircle,
  Settings,
  ShieldAlert,
  Sun,
  Moon,
  UserCheck,
  Zap,
  Calculator,
  Heart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AppView } from '../types/hostelEase';
import { api } from '../services/api';
import { UserAvatar } from './UserAvatar';

interface NavbarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onNavigateToDashboardTab?: (tab: 'overview' | 'bookings' | 'inspections' | 'shortlist' | 'preferences' | 'search_history' | 'profile_security') => void;
  onOpenAuth: (defaultRole?: 'STUDENT' | 'PROVIDER' | 'ADMIN') => void;
  savedCount: number;
  onOpenAI?: () => void;
  onOpenUtilityRadar?: () => void;
  onOpenSafeWalk?: () => void;
  onOpenUtilityCalculator?: () => void;
  onOpenWomenSection?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onNavigate,
  onNavigateToDashboardTab,
  onOpenAuth,
  savedCount,
  onOpenAI,
  onOpenUtilityRadar,
  onOpenSafeWalk,
  onOpenUtilityCalculator,
  onOpenWomenSection
}) => {
  const { user, isAuthenticated, isStudent, isProvider, isAdmin, logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [unreadMsgCount, setUnreadMsgCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    setIsLoggingOut(true);
    setProfileDropdownOpen(false);
    setNotifDropdownOpen(false);
    setMobileMenuOpen(false);

    setTimeout(() => {
      logout();
      setIsLoggingOut(false);
      onNavigate('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1200);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifs = () => {
    if (!isAuthenticated) return;
    api.notifications.getAll()
      .then(res => {
        setNotifications(res.notifications || []);
        setUnreadNotifCount(res.unreadCount || 0);
      })
      .catch(() => {});
  };

  // Poll unread message & notification count when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      api.messages.getUnreadCount()
        .then(res => setUnreadMsgCount(res.unreadCount || 0))
        .catch(() => {});
      
      fetchNotifs();

      const interval = setInterval(() => {
        api.messages.getUnreadCount()
          .then(res => setUnreadMsgCount(res.unreadCount || 0))
          .catch(() => {});
        fetchNotifs();
      }, 12000);

      const handleNotifEvent = () => fetchNotifs();
      window.addEventListener('hostel_ease_notification_updated', handleNotifEvent);
      window.addEventListener('hostel_ease_conversations_updated', handleNotifEvent);

      return () => {
        clearInterval(interval);
        window.removeEventListener('hostel_ease_notification_updated', handleNotifEvent);
        window.removeEventListener('hostel_ease_conversations_updated', handleNotifEvent);
      };
    } else {
      setUnreadMsgCount(0);
      setNotifications([]);
      setUnreadNotifCount(0);
    }
  }, [isAuthenticated, activeView]);

  const handleNotificationClick = async (n: any) => {
    setNotifDropdownOpen(false);
    setMobileMenuOpen(false);
    try {
      await api.notifications.markRead(n.id);
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true } : item));
      setUnreadNotifCount(prev => Math.max(0, prev - 1));
    } catch {}

    const link = n.linkUrl || '';
    if (link.includes('messages') || n.type === 'NEW_MESSAGE') {
      onNavigate('messages');
    } else if (link.includes('inspections') || n.type.includes('INSPECTION')) {
      if (isProvider) {
        onNavigate('provider-portal');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('hostel_ease_provider_tab', { detail: 'inspections' }));
        }, 100);
      } else {
        if (onNavigateToDashboardTab) {
          onNavigate('student-dashboard');
          onNavigateToDashboardTab('inspections');
        } else {
          onNavigate('inspections');
        }
      }
    } else if (link.includes('bookings') || n.type.includes('BOOKING')) {
      if (isProvider) {
        onNavigate('provider-portal');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('hostel_ease_provider_tab', { detail: 'bookings' }));
        }, 100);
      } else {
        onNavigate('bookings');
      }
    } else if (link.includes('community') || n.type.includes('COMMUNITY')) {
      onNavigate('community');
    }
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadNotifCount(0);
    } catch {}
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
      {/* LAUTECH Focus Announcement Bar */}
      <div className="bg-emerald-950 dark:bg-black text-emerald-50 px-4 py-1 text-xs font-medium flex items-center justify-between border-b border-emerald-900/30">
        <div className="flex items-center gap-2 truncate">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-amber-950 uppercase tracking-wide">
            LAUTECH Edition
          </span>
          <span className="truncate">Ogbomoso, Oyo State — Verified Student Accommodation Platform</span>
        </div>
        <div className="hidden md:flex items-center gap-3 text-[11px] text-emerald-200">
          <span>Search First. Visit Less.</span>
          <span>•</span>
          <span className="text-amber-300 font-semibold">100% Verified Lodges</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Tagline */}
          <div 
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                  HOSTEL<span className="text-emerald-600 dark:text-emerald-400">EASE</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 uppercase">
                  LAUTECH
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                Find your hostel. Stress less.
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => onNavigate('home')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeView === 'home' 
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>

            <button
              onClick={() => onNavigate('search')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeView === 'search' 
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Find Hostels</span>
            </button>

            {/* Saved Hostels (Shown only for Authenticated Students) */}
            {isAuthenticated && isStudent && (
              <button
                onClick={() => onNavigate('saved')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 relative ${
                  activeView === 'saved' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span>Saved</span>
                {savedCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 bg-emerald-600 text-white text-[10px] font-black rounded-full">
                    {savedCount}
                  </span>
                )}
              </button>
            )}

            {/* My Bookings (Shown only for Authenticated Students) */}
            {isAuthenticated && isStudent && (
              <button
                onClick={() => onNavigate('bookings')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeView === 'bookings' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>My Bookings</span>
              </button>
            )}

            <button
              onClick={() => onNavigate('community')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeView === 'community' 
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Community</span>
            </button>

            {/* Revolutionary: Live UtilityRadar Button */}
            {onOpenUtilityRadar && (
              <button
                onClick={onOpenUtilityRadar}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center gap-1.5 hover:scale-[1.02]"
                title="UtilityRadar™ - Live NEPA & Borehole Water Reliability Index"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                <span className="hidden xl:inline">UtilityRadar™</span>
                <span className="xl:hidden">Radar</span>
              </button>
            )}

            {/* Revolutionary: SafeWalk Night Trek Companion Button */}
            {onOpenSafeWalk && (
              <button
                onClick={onOpenSafeWalk}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1.5 hover:scale-[1.02]"
                title="SafeWalk™ - Campus Night-Trek Safety Companion & 1-Tap SOS"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden xl:inline">SafeWalk™</span>
                <span className="xl:hidden">SafeWalk</span>
              </button>
            )}

            {/* Utility Calculator Button */}
            {onOpenUtilityCalculator && (
              <button
                onClick={onOpenUtilityCalculator}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center gap-1.5 hover:scale-[1.02]"
                title="Utility Bill Calculator (IBEDC Band Tariffs, Water & Fuel)"
              >
                <Calculator className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="hidden xl:inline">Calculator</span>
              </button>
            )}

            {/* Women's Living & Safety Section */}
            {onOpenWomenSection && (
              <button
                onClick={onOpenWomenSection}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center gap-1.5 hover:scale-[1.02]"
                title="Women's Living & Safety (Verified Lodges, Roommate Matching, SafeWalk)"
              >
                <Heart className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span className="hidden xl:inline">Women's Safe</span>
              </button>
            )}

            {/* Ask AI Assistant Button */}
            {onOpenAI && (
              <button
                onClick={onOpenAI}
                className="ml-1 px-3 py-1.5 rounded-xl text-xs font-black transition-all bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-xs flex items-center gap-1.5 group hover:scale-[1.02]"
                title="Ask Hostel Ease AI Accommodation Assistant"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
                <span>Ask AI</span>
              </button>
            )}
          </nav>

          {/* Desktop Right Side: Student Profile & Notifications & Theme Toggle */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle Dark Mode"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform rotate-0 scale-100" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600 transition-transform rotate-0 scale-100" />
              )}
            </button>
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {/* Messages Shortcut */}
                {isStudent && (
                  <button
                    onClick={() => onNavigate('messages')}
                    className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-xl relative transition-all"
                    title="Messages"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {unreadMsgCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                        {unreadMsgCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Notifications Bell & Dropdown */}
                <div className="relative" ref={notifMenuRef}>
                  <button
                    onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                    className="p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl relative transition-all"
                    title="Notifications"
                    aria-label="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadNotifCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                        {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                      </span>
                    )}
                  </button>

                  {notifDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-bold text-xs text-slate-900 dark:text-white">Notifications</span>
                          {unreadNotifCount > 0 && (
                            <span className="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded-full font-bold">
                              {unreadNotifCount} new
                            </span>
                          )}
                        </div>
                        {unreadNotifCount > 0 && (
                          <button
                            onClick={handleMarkAllNotifsRead}
                            className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.slice(0, 10).map((n) => (
                            <div
                              key={n.id}
                              onClick={() => handleNotificationClick(n)}
                              className={`p-3 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-start gap-2.5 ${
                                !n.isRead ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                              }`}
                            >
                              <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!n.isRead ? 'bg-emerald-600' : 'bg-transparent'}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{n.title}</p>
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5">{n.message}</p>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 inline-block">
                                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Landlord Portal Quick Button (Only for Landlord account) */}
                {isProvider && (
                  <button
                    onClick={() => onNavigate('provider-portal')}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Landlord Portal</span>
                  </button>
                )}

                {/* Admin Portal Quick Button (Only for Admin account) */}
                {isAdmin && (
                  <button
                    onClick={() => onNavigate('admin-portal')}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin Portal</span>
                  </button>
                )}

                {/* Clean Professional Profile Dropdown (Section 7) */}
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition-all text-left group"
                  >
                    <UserAvatar fullName={user?.fullName} avatarUrl={user?.avatarUrl} size="md" />
                    <div className="hidden lg:block text-left">
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                        {user?.fullName?.split(' ')[0]}
                      </p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {isStudent ? 'LAUTECH Student' : isProvider ? 'Hostel Landlord' : 'Admin'}
                      </p>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform" />
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      {/* Profile Card Header */}
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                        <UserAvatar fullName={user?.fullName} avatarUrl={user?.avatarUrl} size="lg" />
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.fullName}</p>
                          <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                          <span className="inline-block mt-0.5 text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {isStudent ? '🎓 Student' : isProvider ? '🏡 Landlord' : '🛡️ Admin'}
                          </span>
                        </div>
                      </div>

                      {/* Student Menu Items */}
                      <div className="py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {isStudent && (
                          <>
                            <button
                              onClick={() => {
                                onNavigate('student-dashboard');
                                if (onNavigateToDashboardTab) onNavigateToDashboardTab('overview');
                                setProfileDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 font-bold text-slate-900 dark:text-white"
                            >
                              <LayoutDashboard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span>Student Dashboard</span>
                            </button>

                            <button
                              onClick={() => {
                                onNavigate('student-dashboard');
                                if (onNavigateToDashboardTab) onNavigateToDashboardTab('profile_security');
                                setProfileDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                            >
                              <UserIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span>My Profile & Preferences</span>
                            </button>

                            <button
                              onClick={() => {
                                onNavigate('bookings');
                                setProfileDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                            >
                              <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span>My Bookings & Reservations</span>
                            </button>

                            <button
                              onClick={() => {
                                onNavigate('saved');
                                setProfileDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2.5">
                                <Bookmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span>Saved Hostels</span>
                              </div>
                              {savedCount > 0 && (
                                <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded-full">
                                  {savedCount}
                                </span>
                              )}
                            </button>

                            <button
                              onClick={() => {
                                onNavigate('inspections');
                                setProfileDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                            >
                              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span>My Inspections</span>
                            </button>

                            <button
                              onClick={() => {
                                onNavigate('move-in');
                                setProfileDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                            >
                              <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span>Move-In Checklist & Hub</span>
                            </button>

                            <button
                              onClick={() => {
                                onNavigate('messages');
                                setProfileDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2.5">
                                <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span>Messages</span>
                              </div>
                              {unreadMsgCount > 0 && (
                                <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[10px] font-bold rounded-full">
                                  {unreadMsgCount}
                                </span>
                              )}
                            </button>
                          </>
                        )}

                        {isProvider && (
                          <button
                            onClick={() => {
                              onNavigate('provider-portal');
                              setProfileDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                          >
                            <LayoutDashboard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Landlord Management Center</span>
                          </button>
                        )}

                        {isAdmin ? (
                          <button
                            onClick={() => {
                              onNavigate('admin-portal');
                              setProfileDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-purple-700 dark:text-purple-400 font-bold"
                          >
                            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span>Admin Command Portal</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              onNavigate('admin-portal');
                              setProfileDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center gap-2.5 text-purple-700 dark:text-purple-400 font-medium"
                          >
                            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span>Switch to Admin Portal</span>
                          </button>
                        )}
                      </div>

                      {/* Log Out Button */}
                      <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            setShowLogoutConfirm(true);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Log Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => onOpenAuth('STUDENT')}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Log In
                </button>
                <button
                  onClick={() => onOpenAuth('STUDENT')}
                  className="px-4 py-2 text-xs font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-sm transition-all"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu & Theme Toggle */}
          <div className="flex md:hidden items-center gap-1.5">
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl"
              aria-label="Toggle Dark Mode"
            >
              {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>

            {isAuthenticated && isStudent && (
              <button
                onClick={() => onNavigate('messages')}
                className="p-2 text-slate-600 dark:text-slate-300 relative"
                aria-label="Messages"
              >
                <MessageSquare className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                {unreadMsgCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {unreadMsgCount}
                  </span>
                )}
              </button>
            )}

            {isAuthenticated && (
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="p-2 text-slate-600 dark:text-slate-300 relative"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => onNavigate('saved')}
              className="p-2 text-slate-600 dark:text-slate-300 relative"
              aria-label="Saved Hostels"
            >
              <Bookmark className="w-5 h-5" />
              {savedCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {savedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu (Student-Focused) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top duration-200">
          {/* User Profile Header in Mobile Menu */}
          {isAuthenticated && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl flex items-center gap-3 border border-slate-200/80 dark:border-slate-700">
              <UserAvatar fullName={user?.fullName} avatarUrl={user?.avatarUrl} size="lg" />
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.fullName}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  {isStudent ? 'LAUTECH Student' : isProvider ? 'Hostel Landlord' : 'Admin'}
                </p>
              </div>
            </div>
          )}

          <div className={`grid ${isAuthenticated ? 'grid-cols-3' : 'grid-cols-2'} gap-2 pb-2 border-b border-slate-100 dark:border-slate-800`}>
            <button
              onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl text-xs font-bold text-center flex flex-col items-center gap-1 ${
                activeView === 'home' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>
            <button
              onClick={() => { onNavigate('search'); setMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl text-xs font-bold text-center flex flex-col items-center gap-1 ${
                activeView === 'search' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Find Hostels</span>
            </button>
            {isAuthenticated && (
              <button
                onClick={() => { 
                  if (isProvider) {
                    onNavigate('provider-portal');
                  } else if (isAdmin) {
                    onNavigate('admin-portal');
                  } else {
                    onNavigate('student-dashboard'); 
                    if (onNavigateToDashboardTab) onNavigateToDashboardTab('overview');
                  }
                  setMobileMenuOpen(false); 
                }}
                className={`p-2.5 rounded-xl text-xs font-bold text-center flex flex-col items-center gap-1 ${
                  (activeView === 'student-dashboard' || activeView === 'provider-portal' || activeView === 'admin-portal') 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' 
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {isProvider ? (
                  <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : isAdmin ? (
                  <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                ) : (
                  <LayoutDashboard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>{isProvider ? 'Landlord' : isAdmin ? 'Admin' : 'Dashboard'}</span>
              </button>
            )}
          </div>

          <div className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
            {/* Student Navigation Links */}
            {isStudent && (
              <>
                <button
                  onClick={() => {
                    onNavigate('student-dashboard');
                    if (onNavigateToDashboardTab) onNavigateToDashboardTab('profile_security');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <UserIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>My Profile & Preferences</span>
                </button>

                <button
                  onClick={() => { onNavigate('bookings'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>My Bookings</span>
                </button>

                <button
                  onClick={() => { onNavigate('saved'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-2.5">
                    <Bookmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Saved Hostels</span>
                  </div>
                  {savedCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-full">
                      {savedCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { onNavigate('inspections'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>My Inspections</span>
                </button>

                <button
                  onClick={() => { onNavigate('move-in'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-emerald-800 dark:text-emerald-300"
                >
                  <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Move-In Center</span>
                </button>
              </>
            )}

            {/* Landlord / Provider Navigation Links (Mobile Parity) */}
            {isProvider && (
              <>
                <button
                  onClick={() => {
                    onNavigate('provider-portal');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-emerald-800 dark:text-emerald-300"
                >
                  <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Landlord Command Center</span>
                </button>

                <button
                  onClick={() => {
                    onNavigate('provider-portal');
                    window.dispatchEvent(new CustomEvent('hostel_ease_provider_tab', { detail: 'wizard' }));
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>+ Add New Hostel Listing</span>
                </button>

                <button
                  onClick={() => {
                    onNavigate('provider-portal');
                    window.dispatchEvent(new CustomEvent('hostel_ease_provider_tab', { detail: 'listings' }));
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Home className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>My Hostels & Verification</span>
                </button>

                <button
                  onClick={() => {
                    onNavigate('provider-portal');
                    window.dispatchEvent(new CustomEvent('hostel_ease_provider_tab', { detail: 'rooms' }));
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Rooms & Bedspace Inventory</span>
                </button>

                <button
                  onClick={() => {
                    onNavigate('provider-portal');
                    window.dispatchEvent(new CustomEvent('hostel_ease_provider_tab', { detail: 'inspections' }));
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Student Inspection Schedules</span>
                </button>

                <button
                  onClick={() => {
                    onNavigate('provider-portal');
                    window.dispatchEvent(new CustomEvent('hostel_ease_provider_tab', { detail: 'movein' }));
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Move-In Key Handover Manager</span>
                </button>

                <button
                  onClick={() => {
                    onNavigate('provider-portal');
                    window.dispatchEvent(new CustomEvent('hostel_ease_provider_tab', { detail: 'finance' }));
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Payouts & Rent Settlements</span>
                </button>

                <button
                  onClick={() => {
                    onNavigate('provider-portal');
                    window.dispatchEvent(new CustomEvent('hostel_ease_provider_tab', { detail: 'messages' }));
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Student Inquiries & Chat</span>
                </button>
              </>
            )}

            <button
              onClick={() => { onNavigate('community'); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Student Community & Roommates</span>
            </button>

            {/* Revolutionary: Live UtilityRadar in Mobile Menu */}
            {onOpenUtilityRadar && (
              <button
                onClick={() => { onOpenUtilityRadar(); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40"
              >
                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-400" />
                  <span>⚡ UtilityRadar™ (NEPA & Water)</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 rounded font-black">LIVE</span>
              </button>
            )}

            {/* Revolutionary: SafeWalk in Mobile Menu */}
            {onOpenSafeWalk && (
              <button
                onClick={() => { onOpenSafeWalk(); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>🚨 SafeWalk™ Night-Trek Companion</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 rounded font-black">SOS</span>
              </button>
            )}

            {/* Utility Calculator in Mobile Menu */}
            {onOpenUtilityCalculator && (
              <button
                onClick={() => { onOpenUtilityCalculator(); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40"
              >
                <div className="flex items-center gap-2.5">
                  <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>💡 Utility Bill Calculator (IBEDC)</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200 rounded font-black">CALC</span>
              </button>
            )}

            {/* Women's Living & Safety in Mobile Menu */}
            {onOpenWomenSection && (
              <button
                onClick={() => { onOpenWomenSection(); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40"
              >
                <div className="flex items-center gap-2.5">
                  <Heart className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>🌸 Women's Living & Safety</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 rounded font-black">SAFE</span>
              </button>
            )}

            <button
              onClick={() => { onNavigate('admin-portal'); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-400 font-bold"
            >
              <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Admin Command Portal</span>
            </button>

            {onOpenAI && (
              <button
                onClick={() => { onOpenAI(); setMobileMenuOpen(false); }}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-between shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>Ask Hostel Ease AI</span>
                </div>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">24/7</span>
              </button>
            )}
          </div>

          {/* Auth Action in Mobile Menu */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            {isAuthenticated ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowLogoutConfirm(true);
                }}
                className="w-full py-2 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { onOpenAuth('STUDENT'); setMobileMenuOpen(false); }}
                  className="w-full py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Log In
                </button>
                <button
                  onClick={() => { onOpenAuth('STUDENT'); setMobileMenuOpen(false); }}
                  className="w-full py-2 text-xs font-black text-slate-950 bg-emerald-400 rounded-xl shadow-xs"
                >
                  Sign Up
                </button>
              </div>
            )}
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
    </header>
  );
};
