import React from 'react';
import { Home, Search, Receipt, MessageSquare, User, Sparkles } from 'lucide-react';
import { AppView } from '../types/hostelEase';
import { useAuth } from '../context/AuthContext';

interface MobileBottomNavProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenAuth: (role?: any) => void;
  onOpenAI?: () => void;
  unreadCount?: number;
  activeBookingCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  onNavigate,
  onOpenAuth,
  onOpenAI,
  unreadCount = 0,
  activeBookingCount = 0
}) => {
  const { isAuthenticated, isStudent, isProvider, isAdmin, user } = useAuth();

  const handleProfileClick = () => {
    if (!isAuthenticated) {
      onOpenAuth('STUDENT');
      return;
    }
    if (isStudent) {
      onNavigate('student-dashboard');
    } else if (isProvider) {
      onNavigate('provider-portal');
    } else if (isAdmin) {
      onNavigate('admin-portal');
    }
  };

  const isProfileActive = 
    activeView === 'student-dashboard' || 
    activeView === 'provider-portal' || 
    activeView === 'admin-portal';

  return (
    <nav 
      aria-label="Mobile navigation bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] pb-safe"
    >
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

        {/* 3. Bookings */}
        <button
          onClick={() => {
            if (!isAuthenticated) {
              onOpenAuth('STUDENT');
            } else {
              onNavigate('bookings');
            }
          }}
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

        {/* 4. Messages */}
        <button
          onClick={() => {
            if (!isAuthenticated) {
              onOpenAuth('STUDENT');
            } else {
              onNavigate('messages');
            }
          }}
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
          <span className="text-[10px] mt-0.5 tracking-tight">Messages</span>
        </button>

        {/* 5. Profile / Student Hub */}
        <button
          onClick={handleProfileClick}
          className={`flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all ${
            isProfileActive
              ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <div className={`p-1 rounded-xl transition-all ${isProfileActive ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
            <User className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">
            {isAuthenticated ? (user?.fullName?.split(' ')[0] || 'Hub') : 'Log In'}
          </span>
        </button>
      </div>
    </nav>
  );
};
