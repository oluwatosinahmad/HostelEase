import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Phone, 
  AlertCircle,
  ArrowLeft,
  KeyRound,
  Camera,
  Check,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Send,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/hostelEase';

const PRESET_STUDENT_AVATARS = [
  { id: 'av-1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', label: 'Female 1' },
  { id: 'av-2', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80', label: 'Male 1' },
  { id: 'av-3', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80', label: 'Female 2' },
  { id: 'av-4', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', label: 'Male 2' },
  { id: 'av-5', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80', label: 'Female 3' },
  { id: 'av-6', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80', label: 'Male 3' }
];

const PRESET_AGENT_AVATARS = [
  { id: 'l-1', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', label: 'Agent 1' },
  { id: 'l-2', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80', label: 'Agent 2' },
  { id: 'l-3', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80', label: 'Agent 3' },
  { id: 'l-4', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80', label: 'Agent 4' }
];

export type AuthPageMode = 'login' | 'signup' | 'forgot-password' | 'reset-password';

interface AuthPageViewProps {
  initialMode?: AuthPageMode;
  initialRole?: UserRole;
  onNavigate: (view: any) => void;
  onSuccess?: (user?: any) => void;
}

function maskEmail(emailStr: string): string {
  if (!emailStr || !emailStr.includes('@')) return emailStr;
  const [local, domain] = emailStr.split('@');
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  const visibleStart = local.slice(0, 2);
  const visibleEnd = local.slice(-1);
  const maskedPart = '*'.repeat(Math.max(3, local.length - 3));
  return `${visibleStart}${maskedPart}${visibleEnd}@${domain}`;
}

export const AuthPageView: React.FC<AuthPageViewProps> = ({
  initialMode = 'login',
  initialRole = 'STUDENT',
  onNavigate,
  onSuccess
}) => {
  const { login, register, forgotPassword, resetPassword } = useAuth();

  const [mode, setMode] = useState<AuthPageMode>(initialMode === 'verify-email' as any ? 'login' : initialMode);
  const [role, setRole] = useState<UserRole>(initialRole);

  // Common Form Fields
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');

  // Password Visibility States (Eye icon toggle)
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Password Recovery States
  const [recoveryEmail, setRecoveryEmail] = useState<string>('');
  const [resetToken, setResetToken] = useState<string>('');
  const [resetCode, setResetCode] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // UI & Loading States
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [accessRestricted, setAccessRestricted] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read URL query params on mount for email or reset token
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '');
      const paramEmail = searchParams.get('email');
      const paramToken = searchParams.get('token');
      const paramCode = searchParams.get('code');
      if (paramEmail) {
        setEmail(paramEmail);
        setRecoveryEmail(paramEmail);
      }
      if (paramToken) {
        setResetToken(paramToken);
        setMode('reset-password');
      }
      if (paramCode) {
        setResetCode(paramCode);
        setMode('reset-password');
      }
    } catch {}
  }, []);

  useEffect(() => {
    setMode(initialMode === 'verify-email' as any ? 'login' : initialMode);
    setRole(initialRole);
    setError(null);
    setInfoMessage(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [initialMode, initialRole]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError('Image file is too large (max 8MB). Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      if (!dataUri) return;
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 200;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            setAvatarUrl(compressed);
            setError(null);
          } else {
            setAvatarUrl(dataUri);
            setError(null);
          }
        } catch {
          setAvatarUrl(dataUri);
          setError(null);
        }
      };
      img.src = dataUri;
    };
    reader.readAsDataURL(file);
  };

  // 1. Submit Login Flow
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setInfoMessage(null);
    setAccessRestricted(false);
    setSubmitting(true);

    const cleanEmail = email.trim();

    try {
      const authedUser = await login(cleanEmail, password, role === 'ADMIN' ? 'ADMIN' : undefined);
      setSubmitting(false);
      if (onSuccess) onSuccess(authedUser);

      // Route by role
      if (authedUser.role === 'PROVIDER') onNavigate('provider-portal');
      else if (authedUser.role === 'ADMIN') onNavigate('admin-portal');
      else onNavigate('student-dashboard');
    } catch (err: any) {
      setSubmitting(false);
      const errMsg = err.message || 'Authentication failed. Please check your email and password.';
      setError(errMsg);

      if (
        errMsg.toLowerCase().includes('not authorized to access the admin portal') ||
        err.code === 'UNAUTHORIZED_ADMIN_ACCESS' ||
        (role === 'ADMIN' && (err.status === 403 || errMsg.includes('403')))
      ) {
        setAccessRestricted(true);
      }
    }
  };

  // 2. Submit Sign-Up Flow (Immediate Registration without OTP)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setInfoMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await register({
        email: cleanEmail,
        password,
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        role,
        avatarUrl: avatarUrl || undefined,
        providerDetails: role === 'PROVIDER' ? {
          businessName: businessName.trim() || `${fullName.trim()} Accommodations`
        } : undefined
      });

      setSubmitting(false);

      if (res.user) {
        if (onSuccess) onSuccess(res.user);
        if (res.user.role === 'PROVIDER') {
          onNavigate('provider-portal');
        } else if (res.user.role === 'ADMIN') {
          onNavigate('admin-portal');
        } else {
          onNavigate('student-dashboard');
        }
      }
    } catch (err: any) {
      setSubmitting(false);
      if (err.code === 'EMAIL_ALREADY_REGISTERED' || err.status === 409) {
        setError('This email address is already registered. Please log in or use Forgot Password if you cannot access your account.');
      } else {
        setError(err.message || 'Registration failed. Please check your details and try again.');
      }
    }
  };

  // 3. Submit Forgot Password Request (Sends Direct Reset Link)
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setInfoMessage(null);

    const cleanEmail = recoveryEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);

    try {
      await forgotPassword(cleanEmail);
      setSubmitting(false);
      setInfoMessage('If an account exists with this email address, a secure password reset link has been sent. Please check your inbox and spam folder.');
    } catch (err: any) {
      setSubmitting(false);
      setError(err.message || 'Failed to send recovery link. Please try again.');
    }
  };

  // 4. Submit Password Reset (Direct Link / Token Update)
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setInfoMessage(null);

    if (!resetToken && !resetCode) {
      setError('Password reset token is missing. Please click the reset link sent to your email.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);

    try {
      await resetPassword(recoveryEmail.trim().toLowerCase(), newPassword, resetCode.trim() || undefined, resetToken.trim() || undefined);
      setSubmitting(false);
      setResetSuccessMessage('Your password has been successfully reset! You can now log in with your new password.');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setSubmitting(false);
      setError(err.message || 'Failed to reset password. Please request a fresh reset link.');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative my-6">
        
        {/* Loading Overlay */}
        {submitting && (
          <div className="absolute inset-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {mode === 'login' ? 'Authenticating credentials...' : 
               mode === 'signup' ? 'Creating your account...' : 
               mode === 'forgot-password' ? 'Sending reset link...' : 'Updating password...'}
            </p>
          </div>
        )}

        {/* Top Header */}
        <div className="bg-slate-900 dark:bg-black text-white p-6 pb-5 relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-600/30">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">
                Hostel <span className="text-emerald-400">Ease</span>
              </h2>
              <p className="text-xs text-slate-400">LAUTECH Accommodation Platform</p>
            </div>
          </div>

          {/* Role selector tabs - only on login or signup */}
          {(mode === 'login' || mode === 'signup') && (
            <div className="grid grid-cols-3 gap-1.5 bg-white/10 p-1 rounded-xl mt-4 text-xs">
              <button
                type="button"
                onClick={() => { setRole('STUDENT'); setError(null); }}
                className={`py-2 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === 'STUDENT' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                👨‍🎓 Student
              </button>
              <button
                type="button"
                onClick={() => { setRole('PROVIDER'); setError(null); }}
                className={`py-2 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === 'PROVIDER' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                🏢 Agent
              </button>
              <button
                type="button"
                onClick={() => { setRole('ADMIN'); setMode('login'); setError(null); }}
                className={`py-2 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === 'ADMIN' ? 'bg-purple-600 text-white shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                👑 Admin
              </button>
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">

          {/* Access Restricted Warning */}
          {accessRestricted ? (
            <div className="p-4 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-inner border border-rose-200 dark:border-rose-800">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white">Access Restricted</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  This account is not authorized to access the Admin Portal.
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Administrative privileges are managed strictly by the Super Administrator.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setAccessRestricted(false); setRole('STUDENT'); setMode('login'); }}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Return to Student Login
              </button>
            </div>
          ) : (
            <>
              {/* Error and Info Banners */}
              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="font-medium leading-relaxed">{error}</span>
                  </div>
                  {error.toLowerCase().includes('already registered') && (
                    <div className="flex items-center gap-2 pt-1 border-t border-rose-200 dark:border-rose-800/80">
                      <button
                        type="button"
                        onClick={() => { setMode('login'); setError(null); }}
                        className="text-xs font-bold text-emerald-700 dark:text-emerald-400 underline hover:text-emerald-800 cursor-pointer"
                      >
                        Log in now →
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <button
                        type="button"
                        onClick={() => { 
                          setRecoveryEmail(email);
                          setMode('forgot-password'); 
                          setError(null); 
                        }}
                        className="text-xs font-bold text-emerald-700 dark:text-emerald-400 underline hover:text-emerald-800 cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}
                </div>
              )}

              {infoMessage && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2">
                  <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-medium leading-relaxed">{infoMessage}</span>
                </div>
              )}

              {/* ========================================================================= */}
              {/* FLOW 1: LOGIN (Dedicated Login Page) */}
              {/* ========================================================================= */}
              {mode === 'login' && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {role === 'ADMIN' ? '👑 Admin Login' : role === 'PROVIDER' ? '🏢 Agent Login' : '👨‍🎓 Student Login'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Sign in to your existing account. Cross-device access enabled.
                    </p>
                  </div>

                  <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        {role === 'ADMIN' ? 'Username / Email' : 'Email Address'}
                      </label>
                      <div className="relative flex items-center">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3" />
                        <input
                          type="text"
                          required
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setError(null); }}
                          placeholder={role === 'ADMIN' ? 'admin or admin@hostelease.ng' : 'e.g. yourname@gmail.com'}
                          className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                          Password
                        </label>
                        {role !== 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() => {
                              setRecoveryEmail(email);
                              setMode('forgot-password');
                              setError(null);
                              setInfoMessage(null);
                            }}
                            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                          >
                            Forgot Password?
                          </button>
                        )}
                      </div>
                      <div className="relative flex items-center">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setError(null); }}
                          placeholder="••••••••"
                          className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-2.5 transition-colors cursor-pointer"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className={`w-full py-3 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer ${
                        role === 'ADMIN'
                          ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30'
                          : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                      }`}
                    >
                      <span>{submitting ? 'Authenticating...' : role === 'ADMIN' ? 'Log in as Admin' : role === 'PROVIDER' ? 'Log in as Agent' : 'Log in as Student'}</span>
                    </button>
                  </form>

                  {role !== 'ADMIN' && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Don't have an account?{' '}
                        <button
                          type="button"
                          onClick={() => { setMode('signup'); setError(null); setInfoMessage(null); }}
                          className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          Sign Up here
                        </button>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* FLOW 2: SIGN UP (Immediate Student & Agent Registration) */}
              {/* ========================================================================= */}
              {mode === 'signup' && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {role === 'PROVIDER' ? '🏢 Create Agent Account' : '👨‍🎓 Create Student Account'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Join Hostel Ease. Instant registration with direct access to your dashboard.
                    </p>
                  </div>

                  <form onSubmit={handleRegisterSubmit} className="space-y-3">
                    {/* Full Name */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Full Name {role === 'PROVIDER' ? '(Agent / Property Owner)' : '(Student)'}
                      </label>
                      <div className="relative flex items-center">
                        <UserIcon className="w-4 h-4 text-slate-400 absolute left-3" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => { setFullName(e.target.value); setError(null); }}
                          placeholder={role === 'PROVIDER' ? 'e.g. Engr. Segun Adeyemi' : 'e.g. Tunde Adeyemi'}
                          className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Email Address */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Email Address
                      </label>
                      <div className="relative flex items-center">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setError(null); }}
                          placeholder="Enter your email address"
                          className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        We'll use this email address for account security and notifications.
                      </p>
                    </div>

                    {/* Password with Eye Icon */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                          Password
                        </label>
                        <span className="text-[10px] text-slate-400">Min. 6 characters</span>
                      </div>
                      <div className="relative flex items-center">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setError(null); }}
                          placeholder="••••••••"
                          className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-2.5 transition-colors cursor-pointer"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Phone / WhatsApp Number
                      </label>
                      <div className="relative flex items-center">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. 08012345678"
                          className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Agent Specific Fields */}
                    {role === 'PROVIDER' && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                          Agency / Business Name
                        </label>
                        <input
                          type="text"
                          required
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="e.g. Destiny Accommodations Ogbomoso"
                          className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    )}

                    {/* Profile Picture Upload Section */}
                    <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/70 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Profile Photo</span>
                        </label>
                        <span className="text-[10px] text-slate-400">Optional</span>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />

                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt="Profile Preview"
                              className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500 shadow"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-inner">
                              <UserIcon className="w-6 h-6" />
                            </div>
                          )}
                          {avatarUrl && (
                            <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-600 text-white rounded-full p-0.5 shadow">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap flex-1">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1.5 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Photo</span>
                          </button>
                          {avatarUrl && (
                            <button
                              type="button"
                              onClick={() => setAvatarUrl('')}
                              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              title="Remove photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Quick Presets */}
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Or pick an avatar:
                        </span>
                        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
                          {(role === 'PROVIDER' ? PRESET_AGENT_AVATARS : PRESET_STUDENT_AVATARS).map((av) => (
                            <button
                              key={av.id}
                              type="button"
                              onClick={() => setAvatarUrl(av.url)}
                              className={`rounded-full p-0.5 transition-all shrink-0 cursor-pointer ${
                                avatarUrl === av.url ? 'ring-2 ring-emerald-500 scale-105' : 'opacity-70 hover:opacity-100'
                              }`}
                            >
                              <img src={av.url} alt={av.label} className="w-7 h-7 rounded-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 mt-3 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{submitting ? 'Creating account...' : `Create Account`}</span>
                    </button>
                  </form>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => { setMode('login'); setError(null); setInfoMessage(null); }}
                        className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        Log In here
                      </button>
                    </p>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* FLOW 3: FORGOT PASSWORD (Link Based) */}
              {/* ========================================================================= */}
              {mode === 'forgot-password' && (
                <div className="space-y-4">
                  <div className="text-center space-y-1.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner border border-amber-200 dark:border-amber-800">
                      <KeyRound className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Recover Password</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                      Enter your registered email address and we'll send you a secure password reset link.
                    </p>
                  </div>

                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Registered Email Address
                      </label>
                      <div className="relative flex items-center">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3" />
                        <input
                          type="email"
                          required
                          value={recoveryEmail}
                          onChange={(e) => { setRecoveryEmail(e.target.value); setError(null); }}
                          placeholder="e.g. yourname@gmail.com"
                          className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>{submitting ? 'Sending link...' : 'Send Password Reset Link'}</span>
                    </button>
                  </form>

                  <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setError(null); }}
                      className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Return to Log In</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* FLOW 4: RESET PASSWORD (Direct Link / Token Based) */}
              {/* ========================================================================= */}
              {mode === 'reset-password' && (
                <div className="space-y-4">
                  {resetSuccessMessage ? (
                    <div className="p-4 text-center space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner border border-emerald-200 dark:border-emerald-800">
                        <Check className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-black text-slate-900 dark:text-white">Password Updated!</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {resetSuccessMessage}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { 
                          setResetSuccessMessage(null);
                          setMode('login'); 
                          setError(null); 
                          setInfoMessage('You can now log in with your new password.');
                        }}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
                      >
                        Proceed to Log In
                      </button>
                    </div>
                  ) : !resetToken && !resetCode ? (
                    <div className="p-4 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
                        <KeyRound className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">Reset Link Required</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Please use the password reset link sent to your email to set a new password.
                      </p>
                      <button
                        type="button"
                        onClick={() => { setMode('forgot-password'); setError(null); }}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Request Password Reset Link
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                        <h3 className="text-base font-black text-slate-900 dark:text-white">Set New Password</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Create a strong new password for your account ({maskEmail(recoveryEmail)}).
                        </p>
                      </div>

                      <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                            New Password
                          </label>
                          <div className="relative flex items-center">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              required
                              minLength={6}
                              value={newPassword}
                              onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                              placeholder="Min. 6 characters"
                              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-2.5 transition-colors cursor-pointer"
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                            Confirm New Password
                          </label>
                          <div className="relative flex items-center">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3" />
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              required
                              minLength={6}
                              value={confirmPassword}
                              onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                              placeholder="Re-enter new password"
                              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-2.5 transition-colors cursor-pointer"
                              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>{submitting ? 'Updating...' : 'Update Password & Log In'}</span>
                        </button>
                      </form>

                      <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => { setMode('login'); setError(null); }}
                          className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Back to Log In</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default AuthPageView;
