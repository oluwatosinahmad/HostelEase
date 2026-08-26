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
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppView } from '../types/hostelEase';
import { api } from '../services/api';
import { UserAvatar } from './UserAvatar';

interface NavbarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenAuth: (defaultRole?: 'STUDENT' | 'PROVIDER' | 'ADMIN') => void;
  savedCount: number;
  onOpenAI?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onNavigate,
  onOpenAuth,
  savedCount,
  onOpenAI
}) => {
  const { user, isAuthenticated, isStudent, isProvider, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [unreadMsgCount, setUnreadMsgCount] = useState<number>(0);

  const profileMenuRef = useRef<HTMLDivElement>(null);

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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      {/* LAUTECH Focus Announcement Bar */}
      <div className="bg-emerald-950 text-emerald-50 px-4 py-1 text-xs font-medium flex items-center justify-between">
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
                <span className="font-extrabold text-xl tracking-tight text-slate-900">
                  HOSTEL<span className="text-emerald-600">EASE</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                  LAUTECH
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Find your hostel. Stress less.
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links (Strictly Student Relevant) */}
          <nav className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => onNavigate('home')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeView === 'home' 
                  ? 'bg-emerald-50 text-emerald-800 font-bold' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>

            <button
              onClick={() => onNavigate('search')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeView === 'search' 
                  ? 'bg-emerald-50 text-emerald-800 font-bold' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Find Hostels</span>
            </button>

            <button
              onClick={() => onNavigate('saved')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 relative ${
                activeView === 'saved' 
                  ? 'bg-emerald-50 text-emerald-800 font-bold' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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

            {isAuthenticated && isStudent && (
              <button
                onClick={() => onNavigate('bookings')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeView === 'bookings' 
                    ? 'bg-emerald-50 text-emerald-800 font-bold' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
                  ? 'bg-emerald-50 text-emerald-800 font-bold' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-600" />
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

          {/* Desktop Right Side: Student Profile & Notifications */}
          <div className="hidden md:flex items-center gap-3">
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
                    className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl hover:bg-slate-100 border border-slate-200/80 transition-all text-left group"
                  >
                    <UserAvatar fullName={user?.fullName} avatarUrl={user?.avatarUrl} size="md" />
                    <div className="hidden lg:block text-left">
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        {user?.fullName?.split(' ')[0]}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-medium">
                        {isStudent ? 'LAUTECH Student' : isProvider ? 'Hostel Landlord' : 'Admin'}
                      </p>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform" />
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      {/* Profile Card Header */}
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                        <UserAvatar fullName={user?.fullName} avatarUrl={user?.avatarUrl} size="lg" />
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-900 truncate">{user?.fullName}</p>
                          <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                          <span className="inline-block mt-0.5 text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {isStudent ? '🎓 Student' : isProvider ? '🏡 Landlord' : '🛡️ Admin'}
                          </span>
                        </div>
                      </div>

                      {/* Student Menu Items */}
                      <div className="py-1 text-xs font-medium text-slate-700">
                        {isStudent && (
                          <>
                            <button
                              onClick={() => {
                                onNavigate('student-dashboard');
                                setProfileDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5"
                            >
                              <UserIcon className="w-4 h-4 text-emerald-600" />
                              <span>My Profile & Preferences</span>
                            </button>

                            <button
                              onClick={() => {
                                onNavigate('bookings');
                                setProfileDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5"
                            >
                              <Receipt className="w-4 h-4 text-emerald-600" />
                              <span>My Bookings & Reservations</span>
                            </button>

                            <button
                              onClick={() => {
                                onNavigate('saved');
                                setProfileDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2.5">
                                <Bookmark className="w-4 h-4 text-emerald-600" />
                                <span>Saved Hostels</span>
                              </div>
                              {savedCount > 0 && (
                                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                                  {savedCount}
                                </span>
                              )}
                            </button>

                            <button
                              onClick={() => {
                                onNavigate('inspections');
                                setProfileDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5"
                            >
                              <Calendar className="w-4 h-4 text-emerald-600" />
                              <span>My Inspections</span>
                            </button>

                            <button
                              onClick={() => {
                                onNavigate('move-in');
                                setProfileDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5"
                            >
                              <KeyRound className="w-4 h-4 text-emerald-600" />
                              <span>Move-In Checklist & Hub</span>
                            </button>

                            <button
                              onClick={() => {
                                onNavigate('messages');
                                setProfileDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2.5">
                                <MessageSquare className="w-4 h-4 text-emerald-600" />
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
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5"
                          >
                            <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                            <span>Landlord Management Center</span>
                          </button>
                        )}

                        {isAdmin && (
                          <button
                            onClick={() => {
                              onNavigate('admin-portal');
                              setProfileDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5"
                          >
                            <ShieldCheck className="w-4 h-4 text-purple-600" />
                            <span>Admin Command Portal</span>
                          </button>
                        )}
                      </div>

                      {/* Log Out Button */}
                      <div className="pt-1 mt-1 border-t border-slate-100">
                        <button
                          onClick={() => {
                            logout();
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
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
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
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

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {isAuthenticated && isStudent && (
              <button
                onClick={() => onNavigate('messages')}
                className="p-2 text-slate-600 relative"
                aria-label="Messages"
              >
                <MessageSquare className="w-5 h-5 text-emerald-700" />
                {unreadMsgCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {unreadMsgCount}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => onNavigate('saved')}
              className="p-2 text-slate-600 relative"
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
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu (Student-Focused) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top duration-200">
          {/* User Profile Header in Mobile Menu */}
          {isAuthenticated && (
            <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-3 border border-slate-200/80">
              <UserAvatar fullName={user?.fullName} avatarUrl={user?.avatarUrl} size="lg" />
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.fullName}</p>
                <p className="text-[10px] text-emerald-600 font-semibold">
                  {isStudent ? 'LAUTECH Student' : isProvider ? 'Hostel Landlord' : 'Admin'}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100">
            <button
              onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl text-xs font-bold text-center flex flex-col items-center gap-1 ${
                activeView === 'home' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-700'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>
            <button
              onClick={() => { onNavigate('search'); setMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl text-xs font-bold text-center flex flex-col items-center gap-1 ${
                activeView === 'search' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-700'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Find Hostels</span>
            </button>
          </div>

          <div className="space-y-1 text-xs font-medium text-slate-700">
            {isStudent && (
              <>
                <button
                  onClick={() => { onNavigate('student-dashboard'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50"
                >
                  <UserIcon className="w-4 h-4 text-emerald-600" />
                  <span>My Profile & Preferences</span>
                </button>

                <button
                  onClick={() => { onNavigate('bookings'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50"
                >
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>My Bookings</span>
                </button>

                <button
                  onClick={() => { onNavigate('saved'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2.5">
                    <Bookmark className="w-4 h-4 text-emerald-600" />
                    <span>Saved Hostels</span>
                  </div>
                  {savedCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full">
                      {savedCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { onNavigate('inspections'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50"
                >
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>My Inspections</span>
                </button>

                <button
                  onClick={() => { onNavigate('move-in'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 font-bold text-emerald-800"
                >
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  <span>Move-In Center</span>
                </button>
              </>
            )}

            <button
              onClick={() => { onNavigate('community'); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50"
            >
              <Users className="w-4 h-4 text-emerald-600" />
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
          <div className="pt-2 border-t border-slate-100">
            {isAuthenticated ? (
              <button
                onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="w-full py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { onOpenAuth('STUDENT'); setMobileMenuOpen(false); }}
                  className="w-full py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl"
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
    </header>
  );
};
