import React, { useState, useEffect } from 'react';
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
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppView } from '../types/hostelEase';
import { api } from '../services/api';

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
  const { user, isAuthenticated, isStudent, isProvider, isAdmin, logout, loginDemo } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoDropdownOpen, setDemoDropdownOpen] = useState(false);
  const [unreadMsgCount, setUnreadMsgCount] = useState<number>(0);

  // Poll or fetch unread count on mount & when authenticated
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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      {/* LAUTECH Focus Announcement Bar */}
      <div className="bg-emerald-800 text-emerald-50 px-4 py-1 text-xs font-medium flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-amber-950 uppercase tracking-wide">
            LAUTECH Edition
          </span>
          <span className="truncate">Ogbomoso, Oyo State — Official Student Housing Directory</span>
        </div>
        <div className="hidden md:flex items-center gap-3 text-[11px] text-emerald-200">
          <span>Search First. Visit Less.</span>
          <span>•</span>
          <span className="text-amber-300 font-semibold">100% Verified Listings</span>
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

          {/* Desktop Navigation Links (Clean & Streamlined) */}
          <nav className="hidden md:flex items-center gap-2">
            <button
              onClick={() => onNavigate('home')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeView === 'home' 
                  ? 'bg-emerald-50 text-emerald-800 font-bold' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Home className="w-4 h-4" />
              Home
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
              Find Hostels
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
              Saved
              {savedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-emerald-600 text-white text-[10px] font-black rounded-full">
                  {savedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onNavigate('community')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeView === 'community' 
                  ? 'bg-emerald-50 text-emerald-800 font-bold' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-600" />
              Community
            </button>

            {/* Ask AI Assistant Button */}
            {onOpenAI && (
              <button
                onClick={onOpenAI}
                className="ml-1 px-3.5 py-2 rounded-xl text-xs font-black transition-all bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-xs flex items-center gap-1.5 group hover:scale-[1.02]"
                title="Ask Hostel Ease AI Accommodation Assistant"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
                <span>Ask AI</span>
              </button>
            )}
          </nav>

          {/* Desktop Right Side (Explicit Auth & User Controls) */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {/* Logged-In Status Pill */}
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {user?.role === 'STUDENT' ? 'Student' : user?.role === 'PROVIDER' ? 'Landlord' : 'Admin'}
                </span>

                {/* Instant Demo Role Switcher for seamless testing */}
                <div className="relative">
                  <button
                    onClick={() => setDemoDropdownOpen(!demoDropdownOpen)}
                    className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs font-black flex items-center gap-1.5 hover:bg-amber-100 transition-colors shadow-xs"
                    title="Switch between Student, Landlord, and Admin demo accounts"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>Switch Role ▾</span>
                  </button>

                  {demoDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Switch Active Perspective
                      </div>
                      <button
                        onClick={() => {
                          loginDemo('STUDENT');
                          setDemoDropdownOpen(false);
                          onNavigate('student-dashboard');
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                          user?.role === 'STUDENT' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-semibold">🎓 Student (Tunde)</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded">Student</span>
                      </button>
                      <button
                        onClick={() => {
                          loginDemo('PROVIDER');
                          setDemoDropdownOpen(false);
                          onNavigate('provider-portal');
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                          user?.role === 'PROVIDER' ? 'bg-blue-50 text-blue-900 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-semibold">🏡 Landlord (Segun)</span>
                        <span className="text-[10px] bg-blue-100 text-blue-800 font-black px-1.5 py-0.5 rounded">Landlord</span>
                      </button>
                      <button
                        onClick={() => {
                          loginDemo('ADMIN');
                          setDemoDropdownOpen(false);
                          onNavigate('admin-portal');
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                          user?.role === 'ADMIN' ? 'bg-purple-50 text-purple-900 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-semibold">🛡️ Platform Admin</span>
                        <span className="text-[10px] bg-purple-100 text-purple-800 font-black px-1.5 py-0.5 rounded">Admin</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Role Portal / Dashboard Shortcut */}
                {isStudent && (
                  <button
                    onClick={() => onNavigate('student-dashboard')}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Dashboard</span>
                  </button>
                )}

                {isProvider && (
                  <button
                    onClick={() => onNavigate('provider-portal')}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Landlord Portal</span>
                  </button>
                )}

                {isAdmin && (
                  <button
                    onClick={() => onNavigate('admin-portal')}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin Portal</span>
                  </button>
                )}

                {/* User Info & Log Out */}
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900 leading-tight">
                      {user?.fullName}
                    </p>
                    <p className="text-[10px] font-medium text-emerald-600">
                      {user?.role === 'STUDENT' ? 'Student' : user?.role === 'PROVIDER' ? 'Hostel Landlord' : 'System Admin'}
                    </p>
                  </div>

                  <button
                    onClick={logout}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                    title="Sign out of your account"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                {/* Logged-Out Status Pill */}
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  Logged Out
                </span>

                {/* Demo Switcher Pill */}
                <div className="relative">
                  <button
                    onClick={() => setDemoDropdownOpen(!demoDropdownOpen)}
                    className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold flex items-center gap-1.5 hover:bg-amber-100 transition-colors"
                    title="Quick demo access"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>Demo</span>
                  </button>

                  {demoDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Instant Demo Login
                      </div>
                      <button
                        onClick={() => {
                          loginDemo('STUDENT');
                          setDemoDropdownOpen(false);
                          onNavigate('search');
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center justify-between"
                      >
                        <span className="font-medium">🎓 Tunde Adeyemi</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">Student</span>
                      </button>
                      <button
                        onClick={() => {
                          loginDemo('PROVIDER');
                          setDemoDropdownOpen(false);
                          onNavigate('provider-portal');
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-800 flex items-center justify-between"
                      >
                        <span className="font-medium">🏡 Engr. Segun Alabi</span>
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Landlord</span>
                      </button>
                      <button
                        onClick={() => {
                          loginDemo('ADMIN');
                          setDemoDropdownOpen(false);
                          onNavigate('admin-portal');
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-800 flex items-center justify-between"
                      >
                        <span className="font-medium">🛡️ Verification Admin</span>
                        <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">Admin</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onOpenAuth('STUDENT')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Log In
                </button>
                <button
                  onClick={() => onOpenAuth('STUDENT')}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm hover:shadow transition-all"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {isAuthenticated && (
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
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top duration-200">
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100">
            <button
              onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl text-xs font-semibold text-center flex flex-col items-center gap-1 ${
                activeView === 'home' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-700'
              }`}
            >
              <Home className="w-4 h-4" />
              Home
            </button>
            <button
              onClick={() => { onNavigate('search'); setMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl text-xs font-semibold text-center flex flex-col items-center gap-1 ${
                activeView === 'search' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-700'
              }`}
            >
              <Search className="w-4 h-4" />
              Search Hostels
            </button>
          </div>

          {onOpenAI && (
            <button
              onClick={() => { onOpenAI(); setMobileMenuOpen(false); }}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl text-xs font-black flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>Ask Hostel Ease AI</span>
              </div>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">24/7 Guide</span>
            </button>
          )}

          <div className="space-y-1">
            {isAuthenticated && (
              <button
                onClick={() => { onNavigate('messages'); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-between p-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Hostel Messages</span>
                </div>
                {unreadMsgCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-rose-600 text-white rounded-full">
                    {unreadMsgCount}
                  </span>
                )}
              </button>
            )}

            {isStudent && (
              <button
                onClick={() => { onNavigate('move-in'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 p-2.5 rounded-lg text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
              >
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <span>Move-In Center</span>
              </button>
            )}

            {isStudent && (
              <button
                onClick={() => { onNavigate('inspections'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 p-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
              >
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>My Inspections</span>
              </button>
            )}

            {isAuthenticated && (
              <button
                onClick={() => { onNavigate('bookings'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 p-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
              >
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>{isStudent ? 'My Bookings' : 'Reservations'}</span>
              </button>
            )}

            {isAuthenticated && isStudent && (
              <button
                onClick={() => { onNavigate('payments'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 p-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
              >
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>My Payments & Receipts</span>
              </button>
            )}

            <button
              onClick={() => { onNavigate('community'); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-2 p-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
            >
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Student Community</span>
            </button>

            <button
              onClick={() => { onNavigate('saved'); setMobileMenuOpen(false); }}
              className="w-full flex items-center justify-between p-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
            >
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-emerald-600" />
                <span>My Saved Hostels</span>
              </div>
              {savedCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full">
                  {savedCount}
                </span>
              )}
            </button>

            {isStudent && (
              <button
                onClick={() => { onNavigate('student-dashboard'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 p-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                <span>Student Hub</span>
              </button>
            )}

            {isProvider && (
              <button
                onClick={() => { onNavigate('provider-portal'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 p-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
              >
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span>Landlord Listing Portal</span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => { onNavigate('admin-portal'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 p-2.5 rounded-lg text-sm text-purple-700 hover:bg-purple-50"
              >
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Admin Moderation Portal</span>
              </button>
            )}
          </div>

          {/* Quick Demo Test Buttons for Mobile */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Quick Demo Accounts
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => { loginDemo('STUDENT'); setMobileMenuOpen(false); }}
                className="px-2 py-1.5 text-[11px] font-semibold bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200"
              >
                🎓 Student
              </button>
              <button
                onClick={() => { loginDemo('PROVIDER'); setMobileMenuOpen(false); }}
                className="px-2 py-1.5 text-[11px] font-semibold bg-blue-50 text-blue-800 rounded-lg border border-blue-200"
              >
                🏡 Landlord
              </button>
              <button
                onClick={() => { loginDemo('ADMIN'); setMobileMenuOpen(false); }}
                className="px-2 py-1.5 text-[11px] font-semibold bg-purple-50 text-purple-800 rounded-lg border border-purple-200"
              >
                🛡️ Admin
              </button>
            </div>
          </div>

          {/* Auth in Mobile Menu */}
          <div className="pt-3 border-t border-slate-100">
            {isAuthenticated ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900">{user?.fullName}</p>
                  <p className="text-[10px] text-emerald-600">{user?.role}</p>
                </div>
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-lg"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { onOpenAuth('STUDENT'); setMobileMenuOpen(false); }}
                  className="w-full py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl"
                >
                  Log in
                </button>
                <button
                  onClick={() => { onOpenAuth('STUDENT'); setMobileMenuOpen(false); }}
                  className="w-full py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl shadow-sm"
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
