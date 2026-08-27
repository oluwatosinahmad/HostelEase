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
  UserCheck
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
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onNavigate,
  onNavigateToDashboardTab,
  onOpenAuth,
  savedCount,
  onOpenAI
}) => {
  const { user, isAuthenticated, isStudent, isProvider, isAgent, isAdmin, logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [unreadMsgCount, setUnreadMsgCount] = useState<number>(0);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    setIsLoggingOut(true);
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);

    setTimeout(() => {
      logout();
      setIsLoggingOut(false);
      onNavigate('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1200);
  };

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Poll unread message count when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      api.messages.getUnreadCount()
        .then(res => setUnreadMsgCount(res.unreadCount || 0))
        .catch(() => {});
      
      const interval = setInterval(() => {
        api.messages.getUnreadCount()
          .then(res => setUnreadMsgCount(res.unreadCount || 0))
          .catch(() => {});
      }, 15000);
      return () => clearInterval(interval);
    } else {
      setUnreadMsgCount(0);
    }
  }, [isAuthenticated, activeView]);

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

                {/* Agent Portal Quick Button (Only for Agent account) */}
                {isAgent && (
                  <button
                    onClick={() => onNavigate('agent-portal')}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-teal-100 text-teal-800 hover:bg-teal-200 transition-colors flex items-center gap-1"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Agent Portal</span>
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
                        {isStudent ? 'LAUTECH Student' : isProvider ? 'Hostel Landlord' : isAgent ? 'Verified Agent' : 'Admin'}
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
                            {isStudent ? '🎓 Student' : isProvider ? '🏡 Landlord' : isAgent ? '🤝 Agent' : '🛡️ Admin'}
                          </span>
                        </div>
                      </div>

                      {/* Agent Menu Items */}
                      {isAgent && (
                        <div className="py-1 border-b border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => {
                              onNavigate('agent-portal');
                              setProfileDropdownOpen(false);
                            }}
                            className="w-full px-4 py-2 text-left text-xs font-bold text-teal-700 dark:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                          >
                            <LayoutDashboard className="w-4 h-4 text-teal-600" />
                            Agent Portal Dashboard
                          </button>
                        </div>
                      )}

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
                                if (onNavigateToDashboardTab) onNavigateToDashboardTab('preferences');
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

                        {isAdmin && (
                          <button
                            onClick={() => {
                              onNavigate('admin-portal');
                              setProfileDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                          >
                            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span>Admin Command Portal</span>
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

          <div className={`grid ${isAuthenticated && isStudent ? 'grid-cols-3' : 'grid-cols-2'} gap-2 pb-2 border-b border-slate-100 dark:border-slate-800`}>
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
            {isAuthenticated && isStudent && (
              <button
                onClick={() => { onNavigate('student-dashboard'); setMobileMenuOpen(false); }}
                className={`p-2.5 rounded-xl text-xs font-bold text-center flex flex-col items-center gap-1 ${
                  activeView === 'student-dashboard' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Dashboard</span>
              </button>
            )}
          </div>

          <div className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
            {isStudent && (
              <>
                <button
                  onClick={() => { onNavigate('student-dashboard'); setMobileMenuOpen(false); }}
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

            <button
              onClick={() => { onNavigate('community'); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Student Community & Roommates</span>
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
