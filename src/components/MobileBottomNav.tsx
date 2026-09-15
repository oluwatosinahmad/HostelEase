import React from 'react';
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
  Sparkles
} from 'lucide-react';
import { AppView } from '../types/hostelEase';
import { useAuth } from '../context/AuthContext';

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
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] pb-safe"
    >
      {/* ================================================================= */}
      {/* ROLE 1: AUTHENTICATED STUDENT BOTTOM NAV                           */}
      {/* ================================================================= */}
      {isAuthenticated && isStudent && (
        <div className="grid grid-cols-5 items-center justify-items-center">
          {/* 1. Home */}
          <button
            onClick={() => onNavigate('home')}
            className={`flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all ${
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
            className={`flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all ${
              activeView === 'search'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeView === 'search' ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
              <Search className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Search</span>
          </button>

          {/* 3. Saved Hostels (With live saved counter badge) */}
          <button
            onClick={() => onNavigate('saved')}
            className={`flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all relative ${
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
            className={`flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all relative ${
              activeView === 'bookings'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all relative ${activeView === 'bookings' ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
              <Receipt className="w-5 h-5" />
              {activeBookingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {activeBookingCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Bookings</span>
          </button>

          {/* 5. Student Hub / Profile / Full Menu */}
          <button
            onClick={() => onNavigate('student-dashboard')}
            className={`flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all ${
              activeView === 'student-dashboard'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeView === 'student-dashboard' ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
              <User className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">
              {user?.fullName?.split(' ')[0] || 'Hub'}
            </span>
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* ROLE 2: AUTHENTICATED LANDLORD (PROVIDER) BOTTOM NAV               */}
      {/* ================================================================= */}
      {isAuthenticated && isProvider && (
        <div className="grid grid-cols-5 items-center justify-items-center">
          {/* 1. Dashboard Overview */}
          <button
            onClick={() => navigateProviderTab('dashboard')}
            className={`flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all ${
              activeView === 'provider-portal'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeView === 'provider-portal' ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Dashboard</span>
          </button>

          {/* 2. My Hostels & Rooms */}
          <button
            onClick={() => navigateProviderTab('listings')}
            className="flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <div className="p-1 rounded-xl transition-all">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Hostels</span>
          </button>

          {/* 3. Tenant Bookings */}
          <button
            onClick={() => navigateProviderTab('bookings')}
            className="flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all relative text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <div className="p-1 rounded-xl transition-all relative">
              <Receipt className="w-5 h-5" />
              {activeBookingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {activeBookingCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Bookings</span>
          </button>

          {/* 4. Student Inquiries & Messages */}
          <button
            onClick={() => onNavigate('messages')}
            className={`flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all relative ${
              activeView === 'messages'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all relative ${activeView === 'messages' ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
              <MessageSquare className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Chat</span>
          </button>

          {/* 5. Complete Landlord Menu (Operations Drawer) */}
          <button
            onClick={handleMenuToggle}
            className="flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <div className="p-1 rounded-xl transition-all">
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Menu</span>
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* ROLE 3: ADMIN BOTTOM NAV                                           */}
      {/* ================================================================= */}
      {isAuthenticated && isAdmin && (
        <div className="grid grid-cols-5 items-center justify-items-center">
          <button
            onClick={() => onNavigate('home')}
            className={`flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all ${
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

          <button
            onClick={() => onNavigate('search')}
            className={`flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all ${
              activeView === 'search'
                ? 'text-purple-600 dark:text-purple-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeView === 'search' ? 'bg-purple-50 dark:bg-purple-950/60' : ''}`}>
              <Search className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Search</span>
          </button>

          <button
            onClick={() => onNavigate('admin-portal')}
            className={`flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all ${
              activeView === 'admin-portal'
                ? 'text-purple-600 dark:text-purple-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeView === 'admin-portal' ? 'bg-purple-50 dark:bg-purple-950/60' : ''}`}>
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Admin</span>
          </button>

          <button
            onClick={() => onNavigate('messages')}
            className={`flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all relative ${
              activeView === 'messages'
                ? 'text-purple-600 dark:text-purple-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all relative ${activeView === 'messages' ? 'bg-purple-50 dark:bg-purple-950/60' : ''}`}>
              <MessageSquare className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Messages</span>
          </button>

          <button
            onClick={handleMenuToggle}
            className="flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <div className="p-1 rounded-xl transition-all">
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Menu</span>
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* ROLE 4: PUBLIC / LOGGED OUT BOTTOM NAV (UNCHANGED CLEAN LAYOUT)     */}
      {/* ================================================================= */}
      {!isAuthenticated && (
        <div className="grid grid-cols-5 items-center justify-items-center">
          {/* 1. Home */}
          <button
            onClick={() => onNavigate('home')}
            className={`flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all ${
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
            className={`flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all ${
              activeView === 'search'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeView === 'search' ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
              <Search className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Search</span>
          </button>

          {/* 3. Bookings Prompt */}
          <button
            onClick={() => onOpenAuth('STUDENT')}
            className="flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <div className="p-1 rounded-xl transition-all">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Bookings</span>
          </button>

          {/* 4. Messages Prompt */}
          <button
            onClick={() => onOpenAuth('STUDENT')}
            className="flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <div className="p-1 rounded-xl transition-all">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Messages</span>
          </button>

          {/* 5. Log In */}
          <button
            onClick={() => onOpenAuth('STUDENT')}
            className="flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <div className="p-1 rounded-xl transition-all">
              <User className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Log In</span>
          </button>
        </div>
      )}
    </nav>
  );
};
