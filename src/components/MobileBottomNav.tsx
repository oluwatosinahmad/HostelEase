import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Search, 
  Receipt, 
  MessageSquare, 
  User, 
  Bookmark, 
  LayoutDashboard, 
  Building2, 
  Menu,
  Sparkles,
  Users,
  ShieldCheck,
  Bell
} from 'lucide-react';
import { AppView } from '../types/hostelEase';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface MobileBottomNavProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenAuth: (role?: any) => void;
  onOpenAI?: () => void;
  onToggleMenu?: () => void;
  unreadCount?: number;
  activeBookingCount?: number;
  savedCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  onNavigate,
  onOpenAuth,
  onOpenAI,
  onToggleMenu,
  unreadCount = 0,
  activeBookingCount = 0,
  savedCount = 0
}) => {
  const { isAuthenticated, isStudent, isProvider, isAdmin, user } = useAuth();
  const [liveUnreadMsg, setLiveUnreadMsg] = useState<number>(0);
  const [liveUnreadNotif, setLiveUnreadNotif] = useState<number>(0);
  const [liveActiveBookings, setLiveActiveBookings] = useState<number>(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setLiveUnreadMsg(0);
      setLiveUnreadNotif(0);
      setLiveActiveBookings(0);
      return;
    }

    const refreshCounts = () => {
      api.messages.getUnreadCount()
        .then(res => setLiveUnreadMsg(res.unreadCount || 0))
        .catch(() => {});

      api.notifications.getAll()
        .then(res => setLiveUnreadNotif(res.unreadCount || 0))
        .catch(() => {});

      if (isStudent) {
        api.bookings.getAll()
          .then(res => {
            const active = (res.bookings || []).filter((b: any) => 
              ['CONFIRMED', 'PENDING', 'PAID'].includes(b.status)
            ).length;
            setLiveActiveBookings(active);
          })
          .catch(() => {});
      } else if (isProvider) {
        api.provider.getDashboard()
          .then(res => {
            setLiveActiveBookings(res.stats?.pendingBookings || 0);
          })
          .catch(() => {});
      }
    };

    refreshCounts();
    const interval = setInterval(refreshCounts, 12000);

    const handleUpdate = () => refreshCounts();
    window.addEventListener('hostel_ease_notification_updated', handleUpdate);
    window.addEventListener('hostel_ease_conversations_updated', handleUpdate);
    window.addEventListener('hostel_ease_booking_created', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('hostel_ease_notification_updated', handleUpdate);
      window.removeEventListener('hostel_ease_conversations_updated', handleUpdate);
      window.removeEventListener('hostel_ease_booking_created', handleUpdate);
    };
  }, [isAuthenticated, isStudent, isProvider]);

  const effectiveMsgCount = Math.max(unreadCount, liveUnreadMsg);
  const effectiveBookingCount = Math.max(activeBookingCount, liveActiveBookings);
  const totalAlertCount = effectiveMsgCount + liveUnreadNotif;

  const handleMenuToggle = () => {
    if (onToggleMenu) {
      onToggleMenu();
    } else {
      window.dispatchEvent(new CustomEvent('hostel_ease_toggle_mobile_menu'));
    }
  };

  const navigateProviderTab = (tab: string) => {
    onNavigate('provider-portal');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('hostel_ease_provider_tab', { detail: tab }));
    }, 50);
  };

  return (
    <nav 
      aria-label="Mobile navigation bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-1 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] pb-[max(env(safe-area-inset-bottom),0.5rem)]"
    >
      {/* ================================================================= */}
      {/* ROLE 1: AUTHENTICATED STUDENT BOTTOM NAV                           */}
      {/* Matches desktop: Home | Find Hostels | Saved | My Bookings | More  */}
      {/* ================================================================= */}
      {isAuthenticated && isStudent && (
        <div className="grid grid-cols-5 items-center justify-items-center">
          {/* 1. Home */}
          <button
            onClick={() => onNavigate('home')}
            className={`flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all ${
              activeView === 'home'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeView === 'home' ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
              <Home className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Home</span>
          </button>

          {/* 2. Find Hostels */}
          <button
            onClick={() => onNavigate('search')}
            className={`flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all ${
              activeView === 'search'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeView === 'search' ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
              <Search className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Find Hostels</span>
          </button>

          {/* 3. Saved Hostels (With live saved counter badge) */}
          <button
            onClick={() => onNavigate('saved')}
            className={`flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all relative ${
              activeView === 'saved'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all relative ${activeView === 'saved' ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
              <Bookmark className="w-5 h-5" />
              {savedCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {savedCount > 9 ? '9+' : savedCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Saved</span>
          </button>

          {/* 4. My Bookings (With live booking counter badge) */}
          <button
            onClick={() => onNavigate('bookings')}
            className={`flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all relative ${
              activeView === 'bookings'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all relative ${activeView === 'bookings' ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
              <Receipt className="w-5 h-5" />
              {effectiveBookingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {effectiveBookingCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Bookings</span>
          </button>

          {/* 5. Complete Student More Menu (Community, Ask AI, Chat, Notifs, Theme, Profile) */}
          <button
            onClick={handleMenuToggle}
            className="flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all relative text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            aria-label="Open complete student menu"
          >
            <div className="p-1 rounded-xl transition-all relative">
              <Menu className="w-5 h-5" />
              {totalAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {totalAlertCount > 9 ? '9+' : totalAlertCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-bold">More</span>
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* ROLE 2: AUTHENTICATED LANDLORD (PROVIDER) BOTTOM NAV               */}
      {/* Matches desktop: Home | Find Hostels | My Hostels | Bookings | More */}
      {/* ================================================================= */}
      {isAuthenticated && isProvider && (
        <div className="grid grid-cols-5 items-center justify-items-center">
          {/* 1. Home */}
          <button
            onClick={() => onNavigate('home')}
            className={`flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all ${
              activeView === 'home'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeView === 'home' ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
              <Home className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Home</span>
          </button>

          {/* 2. Find Hostels */}
          <button
            onClick={() => onNavigate('search')}
            className={`flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all ${
              activeView === 'search'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeView === 'search' ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
              <Search className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Find Hostels</span>
          </button>

          {/* 3. My Hostels (Desktop: 'My Hostels') */}
          <button
            onClick={() => navigateProviderTab('listings')}
            className={`flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all ${
              activeView === 'provider-portal'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeView === 'provider-portal' ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">My Hostels</span>
          </button>

          {/* 4. Bookings */}
          <button
            onClick={() => navigateProviderTab('bookings')}
            className="flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all relative text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <div className="p-1 rounded-xl transition-all relative">
              <Receipt className="w-5 h-5" />
              {effectiveBookingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {effectiveBookingCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Bookings</span>
          </button>

          {/* 5. Complete Landlord Menu (Operations Drawer: Dashboard, Ask AI, Community, Chat, etc.) */}
          <button
            onClick={handleMenuToggle}
            className="flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all relative text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            aria-label="Open complete landlord menu"
          >
            <div className="p-1 rounded-xl transition-all relative">
              <Menu className="w-5 h-5" />
              {totalAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {totalAlertCount > 9 ? '9+' : totalAlertCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-bold">More</span>
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* ROLE 3: ADMIN BOTTOM NAV                                           */}
      {/* Matches desktop: Home | Find Hostels | Admin Portal | Community | More */}
      {/* ================================================================= */}
      {isAuthenticated && isAdmin && (
        <div className="grid grid-cols-5 items-center justify-items-center">
          {/* 1. Home */}
          <button
            onClick={() => onNavigate('home')}
            className={`flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all ${
              activeView === 'home'
                ? 'text-purple-600 dark:text-purple-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeView === 'home' ? 'bg-purple-50 dark:bg-purple-950/60' : ''}`}>
              <Home className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Home</span>
          </button>

          {/* 2. Find Hostels */}
          <button
            onClick={() => onNavigate('search')}
            className={`flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all ${
              activeView === 'search'
                ? 'text-purple-600 dark:text-purple-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeView === 'search' ? 'bg-purple-50 dark:bg-purple-950/60' : ''}`}>
              <Search className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Find Hostels</span>
          </button>

          {/* 3. Admin Command Portal */}
          <button
            onClick={() => onNavigate('admin-portal')}
            className={`flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all ${
              activeView === 'admin-portal'
                ? 'text-purple-600 dark:text-purple-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeView === 'admin-portal' ? 'bg-purple-50 dark:bg-purple-950/60' : ''}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Admin</span>
          </button>

          {/* 4. Community */}
          <button
            onClick={() => onNavigate('community')}
            className={`flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all ${
              activeView === 'community'
                ? 'text-purple-600 dark:text-purple-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeView === 'community' ? 'bg-purple-50 dark:bg-purple-950/60' : ''}`}>
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Community</span>
          </button>

          {/* 5. More Menu */}
          <button
            onClick={handleMenuToggle}
            className="flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all relative text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <div className="p-1 rounded-xl transition-all relative">
              <Menu className="w-5 h-5" />
              {effectiveMsgCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {effectiveMsgCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-bold">More</span>
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* ROLE 4: PUBLIC / GUEST (UNAUTHENTICATED) BOTTOM NAV                */}
      {/* Matches desktop: Home | Find Hostels | Community | Ask AI | Log In  */}
      {/* ================================================================= */}
      {!isAuthenticated && (
        <div className="grid grid-cols-5 items-center justify-items-center">
          {/* 1. Home */}
          <button
            onClick={() => onNavigate('home')}
            className={`flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all ${
              activeView === 'home'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeView === 'home' ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
              <Home className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Home</span>
          </button>

          {/* 2. Find Hostels */}
          <button
            onClick={() => onNavigate('search')}
            className={`flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all ${
              activeView === 'search'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeView === 'search' ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
              <Search className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Find Hostels</span>
          </button>

          {/* 3. Community (Faithfully mirrors desktop Community navigation) */}
          <button
            onClick={() => onNavigate('community')}
            className={`flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all ${
              activeView === 'community'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeView === 'community' ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Community</span>
          </button>

          {/* 4. Ask AI (Faithfully mirrors desktop Ask AI button) */}
          <button
            onClick={() => {
              if (onOpenAI) onOpenAI();
              else window.dispatchEvent(new CustomEvent('hostel_ease_open_ai'));
            }}
            className="flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            <div className="p-1 rounded-xl transition-all">
              <Sparkles className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Ask AI</span>
          </button>

          {/* 5. Log In (Faithfully mirrors desktop Log In action) */}
          <button
            onClick={() => onOpenAuth('STUDENT')}
            className="flex flex-col items-center justify-center w-full py-1 rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <div className="p-1 rounded-xl transition-all">
              <User className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-bold">Log In</span>
          </button>
        </div>
      )}
    </nav>
  );
};
