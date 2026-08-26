import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  KeyRound, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Phone, 
  ShieldCheck, 
  GraduationCap, 
  Home, 
  AlertCircle 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/hostelEase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: UserRole;
  onSuccess?: (user?: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultRole = 'STUDENT',
  onSuccess
}) => {
  const { login, register, loginDemo } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<UserRole>(defaultRole);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [businessName, setBusinessName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      let authedUser: any = null;
      if (mode === 'login') {
        authedUser = await login(email.trim(), password, role);
      } else {
        authedUser = await register({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
          role,
          studentDetails: role === 'STUDENT' ? { department } : undefined,
          providerDetails: role === 'PROVIDER' ? { businessName } : undefined
        });
      }

      setIsLoggingIn(true);
      setTimeout(() => {
        setIsLoggingIn(false);
        setSubmitting(false);
        if (onSuccess) onSuccess(authedUser);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
      setSubmitting(false);
      setIsLoggingIn(false);
    }
  };

  const handleQuickDemo = async (targetRole: UserRole) => {
    setSubmitting(true);
    setError(null);
    try {
      const demoUser = await loginDemo(targetRole);
      setIsLoggingIn(true);
      setTimeout(() => {
        setIsLoggingIn(false);
        setSubmitting(false);
        if (onSuccess) onSuccess(demoUser);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
      setSubmitting(false);
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150 my-6 relative">
        {/* Logging In Transition Overlay */}
        {isLoggingIn && (
          <div className="absolute inset-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 space-y-4 animate-in fade-in duration-150">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
              <div className="w-7 h-7 border-3 border-emerald-600 dark:border-emerald-400 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {mode === 'login' ? 'Logging You In...' : 'Account Created Successfully!'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Preparing your verified accommodation dashboard...
              </p>
            </div>
            <div className="w-48 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-3/4 animate-pulse rounded-full" />
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-slate-900 dark:bg-black text-white p-6 pb-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-600/30">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">
                HOSTEL<span className="text-emerald-400">EASE</span>
              </h2>
              <p className="text-xs text-slate-400">Find your hostel. Stress less.</p>
            </div>
          </div>

          {/* Role selector pill */}
          <div className="grid grid-cols-3 gap-1 bg-white/10 p-1 rounded-xl mt-4">
            <button
              type="button"
              onClick={() => setRole('STUDENT')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                role === 'STUDENT' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Student
            </button>
            <button
              type="button"
              onClick={() => setRole('PROVIDER')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                role === 'PROVIDER' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              Landlord
            </button>
            <button
              type="button"
              onClick={() => { setRole('ADMIN'); setMode('login'); }}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                role === 'ADMIN' ? 'bg-purple-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </button>
          </div>
        </div>

        {/* Quick Demo Test Bar */}
        <div className="bg-amber-50/80 px-6 py-2.5 border-b border-amber-200 flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
            <KeyRound className="w-3 h-3 text-amber-600" />
            1-Click Demo Login:
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => handleQuickDemo('STUDENT')}
              className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('PROVIDER')}
              className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 hover:bg-blue-200"
            >
              Landlord
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('ADMIN')}
              className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 hover:bg-purple-200"
            >
              Admin
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {/* Mode toggle (Login / Register) */}
          {role !== 'ADMIN' ? (
            <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 text-center py-1.5 text-xs font-bold border-b-2 transition-colors ${
                  mode === 'login'
                    ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 text-center py-1.5 text-xs font-bold border-b-2 transition-colors ${
                  mode === 'register'
                    ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>
          ) : (
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-purple-900 dark:text-purple-200 text-xs">
              <span className="font-bold block">Administrator Access Portal</span>
              <span className="text-[11px] text-purple-700 dark:text-purple-300">Enter your administrative credentials or use 1-Click Demo Admin above.</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Full Name</label>
                <div className="relative flex items-center">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3" />
                  <input
                    type="text"
                    placeholder="e.g. Babatunde Adeleke"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3" />
                <input
                  type="email"
                  placeholder={role === 'STUDENT' ? 'student@lautech.edu.ng' : 'youremail@hostelease.ng'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Password</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Phone / WhatsApp Number</label>
                <div className="relative flex items-center">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3" />
                  <input
                    type="tel"
                    placeholder="e.g. +234 803 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {mode === 'register' && role === 'STUDENT' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">LAUTECH Department</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science, Accounting, Med Lab"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            )}

            {mode === 'register' && role === 'PROVIDER' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Business / Housing Name</label>
                <input
                  type="text"
                  placeholder="e.g. Adeleke Student Lodges"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            >
              {submitting ? 'Authenticating...' : mode === 'login' ? `Log in as ${role}` : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
