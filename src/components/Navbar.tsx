import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Heart,
  SlidersHorizontal,
  Layers,
  TrendingUp,
  DollarSign,
  Eye,
  Compass
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
  const mobileNotifMenuRef = useRef<HTMLDivElement>(null);
  const mobileNotifModalRef = useRef<HTMLDivElement>(null);

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
      if (
        notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node) &&
        (!mobileNotifMenuRef.current || !mobileNotifMenuRef.current.contains(e.target as Node)) &&
        (!mobileNotifModalRef.current || !mobileNotifModalRef.current.contains(e.target as Node))
      ) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for mobile menu toggle/open/close events from MobileBottomNav or elsewhere
  useEffect(() => {
    const handleToggle = () => setMobileMenuOpen(prev => !prev);
    const handleOpen = () => setMobileMenuOpen(true);
    const handleClose = () => setMobileMenuOpen(false);

    window.addEventListener('hostel_ease_toggle_mobile_menu', handleToggle);
    window.addEventListener('hostel_ease_open_mobile_menu', handleOpen);
    window.addEventListener('hostel_ease_close_mobile_menu', handleClose);

    return () => {
      window.removeEventListener('hostel_ease_toggle_mobile_menu', handleToggle);
      window.removeEventListener('hostel_ease_open_mobile_menu', handleOpen);
      window.removeEventListener('hostel_ease_close_mobile_menu', handleClose);
    };
  }, []);

  const navigateLandlordTab = (tab: string) => {
    onNavigate('provider-portal');
    setMobileMenuOpen(false);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('hostel_ease_provider_tab', { detail: tab }));
    }, 60);
  };

  const navigateStudentTab = (tab: 'overview' | 'bookings' | 'inspections' | 'shortlist' | 'preferences' | 'search_history' | 'profile_security') => {
    onNavigate('student-dashboard');
    if (onNavigateToDashboardTab) {
      onNavigateToDashboardTab(tab);
    }
    setMobileMenuOpen(false);
  };

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
    <header className="main-navbar sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
      {/* LAUTECH Focus Announcement Bar */}
      <div className="announcement-bar bg-emerald-950 dark:bg-black text-emerald-50 px-4 py-1 text-xs font-medium flex items-center justify-between border-b border-emerald-900/30">
        <div className="flex items-center gap-2 truncate">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-amber-950 uppercase tracking-wide">
            LAUTECH Edition
          </span>
          <span className="truncate">Ogbomoso, Oyo State — Verified Student Accommodation Platform</span>
        </div>
        <div className="announcement-desktop hidden md:flex items-center gap-3 text-[11px] text-emerald-200">
          <span>Search First. Visit Less.</span>
          <span>•</span>
          <span className="text-amber-300 font-semibold">100% Verified Lodges</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo, Tagline & Mobile Role Badge */}
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            <div 
              onClick={() => {
                onNavigate('home');
                setMobileMenuOpen(false);
              }}
              className="navbar-brand flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0"
            >
              <div className="navbar-logo-icon w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform shrink-0">
                <Building2 className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>
              <div className="shrink-0 flex flex-col justify-center">
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  <span className="navbar-brand-name font-extrabold text-base sm:text-xl tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
                    Hostel <span className="text-emerald-600 dark:text-emerald-400">Ease</span>
                  </span>
                  <span className="navbar-brand-badge text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 uppercase shrink-0">
                    LAUTECH
                  </span>
                </div>
                <p className="navbar-brand-tagline text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                  Find your hostel. Stress less.
                </p>
              </div>
            </div>

            {/* Clean Mobile Role Pill Indicator (>= 370px) */}
            {isAuthenticated && (
              <div className="hidden min-[370px]:flex md:hidden items-center shrink-0">
                {isStudent && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 whitespace-nowrap">
                    🎓 Student
                  </span>
                )}
                {isProvider && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100/90 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 whitespace-nowrap">
                    🏡 Landlord
                  </span>
                )}
                {isAdmin && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100/90 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 whitespace-nowrap">
                    👑 Admin
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Desktop Navigation Links */}
          <nav className="desktop-nav hidden md:flex items-center gap-1.5">
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

            {/* My Hostels (Shown for Authenticated Landlords / Providers) */}
            {isAuthenticated && isProvider && (
              <button
                onClick={() => {
                  onNavigate('provider-portal');
                  window.dispatchEvent(new CustomEvent('hostel_ease_provider_tab', { detail: 'listings' }));
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeView === 'provider-portal' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>My Hostels</span>
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

            {/* Ask AI Assistant Button */}
            {onOpenAI && (
              <button
                onClick={onOpenAI}
                className="ml-1 px-3 py-1.5 rounded-xl text-xs font-black transition-all bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-xs flex items-center gap-1.5 group hover:scale-[1.02]"
                title={isProvider ? "Ask Landlord AI Assistant" : "Ask Hostel Ease AI Accommodation Assistant"}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
                <span>Ask AI</span>
              </button>
            )}
          </nav>

          {/* Desktop Right Side: Student Profile & Notifications & Theme Toggle */}
          <div className="desktop-actions hidden md:flex items-center gap-2.5">
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
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2">
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
          <div className="mobile-nav-actions flex md:hidden items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              onClick={toggleTheme}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {isAuthenticated && (
              <div className="relative" ref={mobileNotifMenuRef}>
                <button
                  onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                  className="p-1.5 text-slate-600 dark:text-slate-300 relative rounded-xl transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-rose-600 text-white text-[8px] font-black rounded-full flex items-center justify-center animate-pulse">
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </span>
                  )}
                </button>

                {/* Centered Mobile Notification Modal with Backdrop rendered outside header via Portal */}
                {notifDropdownOpen && createPortal(
                  <div 
                    ref={mobileNotifModalRef}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50 duration-200 sm:hidden"
                    onClick={() => setNotifDropdownOpen(false)}
                  >
                    <div 
                      className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
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
                              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            onClick={() => setNotifDropdownOpen(false)}
                            className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.slice(0, 15).map((n) => (
                            <div
                              key={n.id}
                              onClick={() => {
                                handleNotificationClick(n);
                                setNotifDropdownOpen(false);
                              }}
                              className={`p-3 rounded-2xl text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-start gap-2.5 ${
                                !n.isRead ? 'bg-emerald-50/60 dark:bg-emerald-950/30' : ''
                              }`}
                            >
                              <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.isRead ? 'bg-emerald-600' : 'bg-transparent'}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-900 dark:text-white">{n.title}</p>
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{n.message}</p>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 inline-block">
                                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 relative transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              {!mobileMenuOpen && (unreadMsgCount > 0 || unreadNotifCount > 0) && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE DRAWER MENU (STRICT ROLE-ADAPTIVE WITH COMPLETE FEATURE PARITY)    */}
      {/* ========================================================================= */}
      {mobileMenuOpen && (
        <div className="mobile-menu-drawer md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-8 space-y-4 max-h-[calc(100vh-4.5rem)] overflow-y-auto animate-in slide-in-from-top duration-200 shadow-2xl">
          
          {/* --------------------------------------------------------------------- */}
          {/* ROLE 1: AUTHENTICATED STUDENT DRAWER                                  */}
          {/* --------------------------------------------------------------------- */}
          {isAuthenticated && isStudent && (
            <div className="space-y-4">
              {/* Profile Card Banner */}
              <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-teal-50/60 dark:from-slate-800 dark:to-emerald-950/40 rounded-2xl flex items-center justify-between border border-emerald-200/70 dark:border-emerald-800/60 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar fullName={user?.fullName} avatarUrl={user?.avatarUrl} size="lg" />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">{user?.fullName}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                    <span className="inline-flex items-center gap-1 mt-0.5 text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 uppercase">
                      🎓 LAUTECH Student
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => navigateStudentTab('profile_security')}
                  className="p-2 rounded-xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 shadow-xs border border-slate-200/60 dark:border-slate-600 shrink-0"
                  title="Profile & Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Jump Action Grid */}
              <div className="grid grid-cols-3 gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }}
                  className={`p-2.5 rounded-xl text-xs font-bold text-center flex flex-col items-center gap-1 transition-all ${
                    activeView === 'home'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Home className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Home</span>
                </button>

                <button
                  onClick={() => { onNavigate('search'); setMobileMenuOpen(false); }}
                  className={`p-2.5 rounded-xl text-xs font-bold text-center flex flex-col items-center gap-1 transition-all ${
                    activeView === 'search'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Find Hostels</span>
                </button>

                <button
                  onClick={() => navigateStudentTab('overview')}
                  className={`p-2.5 rounded-xl text-xs font-bold text-center flex flex-col items-center gap-1 transition-all ${
                    activeView === 'student-dashboard'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Dashboard</span>
                </button>
              </div>

              {/* Accommodation & Bookings Group */}
              <div className="space-y-1">
                <p className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Accommodation & Bookings
                </p>

                <button
                  onClick={() => { onNavigate('saved'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-colors ${
                    activeView === 'saved' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bookmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs">Saved Hostels</span>
                  </div>
                  {savedCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-black bg-emerald-600 text-white rounded-full">
                      {savedCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { onNavigate('bookings'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl transition-colors ${
                    activeView === 'bookings' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs">My Bookings & Reservations</span>
                </button>

                <button
                  onClick={() => { onNavigate('inspections'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl transition-colors ${
                    activeView === 'inspections' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs">Scheduled Inspections</span>
                </button>

                <button
                  onClick={() => { onNavigate('move-in'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl transition-colors ${
                    activeView === 'move-in' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs">Move-In Hub & Key Handover</span>
                </button>

                <button
                  onClick={() => { onNavigate('messages'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-colors ${
                    activeView === 'messages' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs">Landlord Messages & Chat</span>
                  </div>
                  {unreadMsgCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-black bg-rose-600 text-white rounded-full">
                      {unreadMsgCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setNotifDropdownOpen(true); }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs">Notifications & Alerts</span>
                  </div>
                  {unreadNotifCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-black bg-rose-600 text-white rounded-full">
                      {unreadNotifCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Student Life & AI Group */}
              <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                <p className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Student Community & AI
                </p>

                <button
                  onClick={() => { onNavigate('community'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl transition-colors ${
                    activeView === 'community' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs">Student Community & Roommates</span>
                </button>

                {onOpenAI && (
                  <button
                    onClick={() => { onOpenAI(); setMobileMenuOpen(false); }}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-between shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
                      <span>Ask Hostel Ease AI Assistant</span>
                    </div>
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-black">24/7</span>
                  </button>
                )}
              </div>

              {/* Campus Living & Safety Tools */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                <p className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Campus Living & Safety Tools
                </p>

                {onOpenUtilityRadar && (
                  <button
                    onClick={() => { onOpenUtilityRadar(); setMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <Zap className="w-4 h-4 text-amber-500 fill-amber-400" />
                      <span className="text-xs">⚡ UtilityRadar™ (NEPA & Water)</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 rounded font-black">LIVE</span>
                  </button>
                )}

                {onOpenSafeWalk && (
                  <button
                    onClick={() => { onOpenSafeWalk(); setMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs">🚨 SafeWalk™ Night-Trek Companion</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 rounded font-black">SOS</span>
                  </button>
                )}

                {onOpenUtilityCalculator && (
                  <button
                    onClick={() => { onOpenUtilityCalculator(); setMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs">💡 Utility Bill Calculator (IBEDC)</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200 rounded font-black">CALC</span>
                  </button>
                )}

                {onOpenWomenSection && (
                  <button
                    onClick={() => { onOpenWomenSection(); setMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <Heart className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span className="text-xs">🌸 Women's Living & Safety</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 rounded font-black">SAFE</span>
                  </button>
                )}
              </div>

              {/* Settings & Sign Out */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800 text-xs font-semibold"
                >
                  <div className="flex items-center gap-2">
                    {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                    <span>Theme Mode</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    {isDark ? 'Dark Mode' : 'Light Mode'}
                  </span>
                </button>

                <button
                  onClick={() => navigateStudentTab('profile_security')}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  <UserIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Student Profile & Security</span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="w-full py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out of Student Account</span>
                </button>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* ROLE 2: AUTHENTICATED LANDLORD (PROVIDER) DRAWER                     */}
          {/* --------------------------------------------------------------------- */}
          {isAuthenticated && isProvider && (
            <div className="space-y-4">
              {/* Landlord Profile Header */}
              <div className="p-3.5 bg-gradient-to-br from-amber-50 to-emerald-50/60 dark:from-slate-800 dark:to-amber-950/30 rounded-2xl flex items-center justify-between border border-amber-200/70 dark:border-amber-800/60 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar fullName={user?.fullName} avatarUrl={user?.avatarUrl} size="lg" />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">{user?.fullName}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                    <span className="inline-flex items-center gap-1 mt-0.5 text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 uppercase">
                      🏡 Hostel Landlord
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => navigateLandlordTab('profile_team')}
                  className="p-2 rounded-xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 shadow-xs border border-slate-200/60 dark:border-slate-600 shrink-0"
                  title="Landlord Verification & Profile"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </button>
              </div>

              {/* Quick Jump Action Grid (Landlord Operations) */}
              <div className="grid grid-cols-3 gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => navigateLandlordTab('dashboard')}
                  className={`p-2.5 rounded-xl text-xs font-bold text-center flex flex-col items-center gap-1 transition-all ${
                    activeView === 'provider-portal'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => navigateLandlordTab('listings')}
                  className="p-2.5 rounded-xl text-xs font-bold text-center flex flex-col items-center gap-1 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50"
                >
                  <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>My Hostels</span>
                </button>

                <button
                  onClick={() => navigateLandlordTab('wizard')}
                  className="p-2.5 rounded-xl text-xs font-bold text-center flex flex-col items-center gap-1 bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                >
                  <PlusCircle className="w-4 h-4 text-white" />
                  <span>+ Add Hostel</span>
                </button>
              </div>

              {/* Hostel Inventory & Availability Group */}
              <div className="space-y-1">
                <p className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Hostel Operations & Inventory
                </p>

                <button
                  onClick={() => navigateLandlordTab('listings')}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Home className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs">My Hostels & Verification Status</span>
                </button>

                <button
                  onClick={() => navigateLandlordTab('rooms')}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs">Rooms & Bedspaces Inventory</span>
                </button>

                <button
                  onClick={() => navigateLandlordTab('availability')}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs">Availability & Calendar Manager</span>
                </button>
              </div>

              {/* Tenants, Bookings & Inquiries Group */}
              <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                <p className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Tenants, Bookings & Inquiries
                </p>

                <button
                  onClick={() => navigateLandlordTab('bookings')}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs">Tenant Bookings & Reservations</span>
                </button>

                <button
                  onClick={() => navigateLandlordTab('move_ins')}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs">Move-In Key Handover Manager</span>
                </button>

                <button
                  onClick={() => navigateLandlordTab('inspections')}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs">Scheduled Student Inspections</span>
                </button>

                <button
                  onClick={() => { onNavigate('messages'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-colors ${
                    activeView === 'messages' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs">Student Inquiries & Chat</span>
                  </div>
                  {unreadMsgCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-black bg-rose-600 text-white rounded-full">
                      {unreadMsgCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setNotifDropdownOpen(true); }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs">Landlord Booking Alerts</span>
                  </div>
                  {unreadNotifCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-black bg-rose-600 text-white rounded-full">
                      {unreadNotifCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Financials, Analytics & Team Group */}
              <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                <p className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Financials, Reports & Team
                </p>

                <button
                  onClick={() => navigateLandlordTab('financials')}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs">Payouts & Rent Settlements</span>
                </button>

                <button
                  onClick={() => navigateLandlordTab('performance')}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs">Performance Analytics & Views</span>
                </button>

                <button
                  onClick={() => navigateLandlordTab('profile_team')}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs">Team & Verification Documents</span>
                </button>
              </div>

              {/* Landlord AI Assistant & Tools */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                <p className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  AI & Operations Tools
                </p>

                <button
                  onClick={() => {
                    if (onOpenAI) {
                      onOpenAI();
                    } else {
                      navigateLandlordTab('dashboard');
                    }
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-700 to-teal-800 text-white rounded-xl text-xs font-bold flex items-center justify-between shadow-xs"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
                    <span>Landlord AI & Price Estimator</span>
                  </div>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-black">AI</span>
                </button>

                <button
                  onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium"
                >
                  <Compass className="w-4 h-4 text-slate-500" />
                  <span>Browse Public Listings (Student View)</span>
                </button>
              </div>

              {/* Settings & Sign Out */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800 text-xs font-semibold"
                >
                  <div className="flex items-center gap-2">
                    {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                    <span>Theme Mode</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    {isDark ? 'Dark Mode' : 'Light Mode'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="w-full py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out of Landlord Portal</span>
                </button>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* ROLE 3: AUTHENTICATED ADMIN DRAWER                                    */}
          {/* --------------------------------------------------------------------- */}
          {isAuthenticated && isAdmin && (
            <div className="space-y-4">
              <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 rounded-2xl flex items-center justify-between border border-purple-200 dark:border-purple-900 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar fullName={user?.fullName} avatarUrl={user?.avatarUrl} size="lg" />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">{user?.fullName}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                    <span className="inline-flex items-center gap-1 mt-0.5 text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200 uppercase">
                      👑 Super Admin
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => { onNavigate('admin-portal'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 p-3 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 font-black text-xs shadow-xs"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                  <span>Admin Command Portal</span>
                </button>

                <button
                  onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  <Home className="w-4 h-4 text-slate-500" />
                  <span>Home</span>
                </button>

                <button
                  onClick={() => { onNavigate('search'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  <Search className="w-4 h-4 text-slate-500" />
                  <span>All Lodges Directory</span>
                </button>

                <button
                  onClick={() => { onNavigate('community'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>Community Feed & Flags</span>
                </button>

                <button
                  onClick={() => { onNavigate('messages'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  <MessageSquare className="w-4 h-4 text-slate-500" />
                  <span>Support Messages</span>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800 text-xs font-semibold"
                >
                  <div className="flex items-center gap-2">
                    {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                    <span>Theme Mode</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    {isDark ? 'Dark Mode' : 'Light Mode'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="w-full py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out of Admin Portal</span>
                </button>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* ROLE 4: PUBLIC / GUEST DRAWER (NOT AUTHENTICATED)                     */}
          {/* --------------------------------------------------------------------- */}
          {!isAuthenticated && (
            <div className="space-y-4">
              {/* Public Welcome Card */}
              <div className="p-3.5 bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-900 text-white rounded-2xl shadow-md border border-emerald-500/20">
                <p className="text-xs font-extrabold text-emerald-400">Hostel Ease • LAUTECH Edition</p>
                <p className="text-[11px] text-slate-200 mt-0.5">Verified off-campus student accommodation in Ogbomoso.</p>
              </div>

              {/* Quick Jump Action Grid */}
              <div className="grid grid-cols-2 gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }}
                  className={`p-2.5 rounded-xl text-xs font-bold text-center flex flex-col items-center gap-1 transition-all ${
                    activeView === 'home'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Home className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Home</span>
                </button>

                <button
                  onClick={() => { onNavigate('search'); setMobileMenuOpen(false); }}
                  className={`p-2.5 rounded-xl text-xs font-bold text-center flex flex-col items-center gap-1 transition-all ${
                    activeView === 'search'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Find Hostels</span>
                </button>
              </div>

              {/* Public Exploration Links */}
              <div className="space-y-1">
                <button
                  onClick={() => { onNavigate('community'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Student Community & Roommate Matching</span>
                </button>

                {onOpenAI && (
                  <button
                    onClick={() => { onOpenAI(); setMobileMenuOpen(false); }}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-between shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
                      <span>Ask Hostel Ease AI Assistant</span>
                    </div>
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-black">24/7</span>
                  </button>
                )}
              </div>

              {/* Campus Living & Safety Tools */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                <p className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Campus Living Tools
                </p>

                {onOpenUtilityRadar && (
                  <button
                    onClick={() => { onOpenUtilityRadar(); setMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <Zap className="w-4 h-4 text-amber-500 fill-amber-400" />
                      <span className="text-xs">⚡ UtilityRadar™ (NEPA & Water)</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 rounded font-black">LIVE</span>
                  </button>
                )}

                {onOpenSafeWalk && (
                  <button
                    onClick={() => { onOpenSafeWalk(); setMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs">🚨 SafeWalk™ Night Companion</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 rounded font-black">SOS</span>
                  </button>
                )}

                {onOpenUtilityCalculator && (
                  <button
                    onClick={() => { onOpenUtilityCalculator(); setMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs">💡 Utility Bill Calculator (IBEDC)</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200 rounded font-black">CALC</span>
                  </button>
                )}

                {onOpenWomenSection && (
                  <button
                    onClick={() => { onOpenWomenSection(); setMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <Heart className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span className="text-xs">🌸 Women's Living & Safety</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 rounded font-black">SAFE</span>
                  </button>
                )}
              </div>

              {/* Landlord Sign In Entry */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    onOpenAuth('PROVIDER');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/60 text-xs font-bold"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Are you a Landlord? List Your Hostel</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 rounded-full font-black">
                    PARTNER
                  </span>
                </button>
              </div>

              {/* Auth Actions in Public Drawer */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800 text-xs font-semibold"
                >
                  <div className="flex items-center gap-2">
                    {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                    <span>Theme Mode</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    {isDark ? 'Dark Mode' : 'Light Mode'}
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { onOpenAuth('STUDENT'); setMobileMenuOpen(false); }}
                    className="w-full py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-center"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => { onOpenAuth('STUDENT'); setMobileMenuOpen(false); }}
                    className="w-full py-2.5 text-xs font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-xs transition-colors text-center"
                  >
                    Sign Up
                  </button>
                </div>
              </div>
            </div>
          )}
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
