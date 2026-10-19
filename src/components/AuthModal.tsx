import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Building2, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Phone, 
  ShieldCheck, 
  AlertCircle,
  ShieldAlert,
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
  Sparkles
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

export type AuthModalMode = 'login' | 'register' | 'verify_email' | 'forgot_password' | 'reset_password';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: UserRole;
  initialMode?: AuthModalMode;
  initialEmail?: string;
  initialResetCode?: string;
  initialResetToken?: string;
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

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultRole = 'STUDENT',
  initialMode = 'login',
  initialEmail = '',
  initialResetCode = '',
  initialResetToken = '',
  onSuccess
}) => {
  const { login, register, verifyEmail, resendVerification, forgotPassword, resetPassword } = useAuth();

  // Mode state: login, register, verify_email, forgot_password, reset_password
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [role, setRole] = useState<UserRole>(defaultRole);

  // Common Form Fields
  const [email, setEmail] = useState<string>(initialEmail);
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');

  // Password Visibility States (Eye icon toggle)
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Email Verification OTP State
  const [verificationEmail, setVerificationEmail] = useState<string>(initialEmail);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [resendingCode, setResendingCode] = useState<boolean>(false);

  // Password Recovery States
  const [recoveryEmail, setRecoveryEmail] = useState<string>(initialEmail);
  const [resetCode, setResetCode] = useState<string>(initialResetCode);
  const [resetToken, setResetToken] = useState<string>(initialResetToken);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // UI & Loading States
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [accessRestricted, setAccessRestricted] = useState<boolean>(false);
  const [customAvatarInput, setCustomAvatarInput] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync props when modal opens or initialMode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRole(defaultRole);
      setError(null);
      setInfoMessage(null);
      setShowPassword(false);
      setShowConfirmPassword(false);
      if (initialEmail) {
        setEmail(initialEmail);
        setVerificationEmail(initialEmail);
        setRecoveryEmail(initialEmail);
      }
      if (initialResetCode) setResetCode(initialResetCode);
      if (initialResetToken) setResetToken(initialResetToken);
    }
  }, [isOpen, initialMode, defaultRole, initialEmail, initialResetCode, initialResetToken]);

  // Resend OTP Cooldown Timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

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
    if (submitting || isLoggingIn) return;
    setError(null);
    setInfoMessage(null);
    setAccessRestricted(false);
    setSubmitting(true);

    const cleanEmail = email.trim();

    try {
      const authedUser = await login(cleanEmail, password, role === 'ADMIN' ? 'ADMIN' : undefined);
      setSubmitting(false);
      setIsLoggingIn(false);
      if (onSuccess) onSuccess(authedUser);
      onClose();
    } catch (err: any) {
      setSubmitting(false);
      setIsLoggingIn(false);
      const errMsg = err.message || 'Authentication failed. Please check your email and password.';
      
      if (err.code === 'EMAIL_NOT_VERIFIED' || errMsg.toLowerCase().includes('not yet verified')) {
        setVerificationEmail(cleanEmail);
        setMode('verify_email');
        setInfoMessage('Please enter the 6-digit verification code sent to your email to activate your account.');
        setResendCooldown(60);
        return;
      }

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

  // 2. Submit Sign-Up Flow
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setInfoMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid, real email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
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

      if (res.verificationRequired || !res.token) {
        setVerificationEmail(cleanEmail);
        setVerificationCode('');
        setMode('verify_email');
        setResendCooldown(60);
        setInfoMessage(`We've sent a 6-digit verification code to ${cleanEmail}. Please enter it below to complete registration.`);
      } else {
        if (onSuccess) onSuccess(res.user);
        onClose();
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

  // 3. Submit Email OTP Verification Flow
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setInfoMessage(null);

    const code = verificationCode.trim();
    if (!code || code.length < 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setSubmitting(true);

    try {
      const verifiedUser = await verifyEmail(verificationEmail.trim().toLowerCase(), code);
      setSubmitting(false);
      if (onSuccess) onSuccess(verifiedUser);
      onClose();
    } catch (err: any) {
      setSubmitting(false);
      setError(err.message || 'Incorrect verification code. Please check your email and try again.');
    }
  };

  // 4. Resend Verification OTP
  const handleResendOtp = async () => {
    if (resendingCode || resendCooldown > 0) return;
    setError(null);
    setResendingCode(true);

    try {
      await resendVerification(verificationEmail.trim().toLowerCase());
      setResendingCode(false);
      setResendCooldown(60);
      setInfoMessage(`A fresh 6-digit verification code has been sent to ${verificationEmail}.`);
    } catch (err: any) {
      setResendingCode(false);
      if (err.remainingSeconds) {
        setResendCooldown(err.remainingSeconds);
      }
      setError(err.message || 'Failed to resend verification code. Please wait and try again.');
    }
  };

  // 5. Submit Forgot Password Request
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
      const res = await forgotPassword(cleanEmail);
      setSubmitting(false);
      setVerificationEmail(cleanEmail);
      setMode('reset_password');
      setInfoMessage('If an account exists with this email address, a 6-digit recovery code has been sent. Please enter it below.');
    } catch (err: any) {
      setSubmitting(false);
      setError(err.message || 'Failed to send recovery code. Please try again.');
    }
  };

  // 6. Submit Password Reset
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setInfoMessage(null);

    if (!resetCode.trim() && !resetToken.trim()) {
      setError('Please enter the 6-digit recovery code from your email.');
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
      setError(err.message || 'Failed to reset password. Please check your code or request a new one.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150 my-6 relative">
        
        {/* Loading Overlay */}
        {submitting && (
          <div className="absolute inset-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {mode === 'login' ? 'Authenticating credentials...' : 
               mode === 'register' ? 'Sending verification code...' : 
               mode === 'verify_email' ? 'Activating account...' : 
               mode === 'forgot_password' ? 'Sending recovery email...' : 'Updating password...'}
            </p>
          </div>
        )}

        {/* Modal Header */}
        <div className="bg-slate-900 dark:bg-black text-white p-6 pb-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-600/30">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">
                Hostel <span className="text-emerald-400">Ease</span>
              </h2>
              <p className="text-xs text-slate-400">LAUTECH Student & Agent Accommodation Platform</p>
            </div>
          </div>

          {/* Role selector pills - only for login or register */}
          {(mode === 'login' || mode === 'register') && (
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

        {/* Modal Body */}
        <div className="p-6 space-y-4">

          {/* Access Restricted Warning View */}
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
                          setMode('forgot_password'); 
                          setError(null); 
                        }}
                        className="text-xs font-bold text-rose-700 dark:text-rose-300 underline hover:text-rose-800 cursor-pointer"
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
              {/* FLOW 1: LOGIN (Dedicated Login Flow) */}
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
                              setMode('forgot_password');
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
                          onClick={() => { setMode('register'); setError(null); setInfoMessage(null); }}
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
              {/* FLOW 2: SIGN UP (Simplified Student & Agent Registration) */}
              {/* ========================================================================= */}
              {mode === 'register' && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {role === 'PROVIDER' ? '🏢 Create Agent Account' : '👨‍🎓 Create Student Account'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Join Hostel Ease. A real verification code will be sent to your email.
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

                    {/* Real Email Address */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Real Email Address
                      </label>
                      <div className="relative flex items-center">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setError(null); }}
                          placeholder="e.g. yourname@gmail.com or student@lautech.edu.ng"
                          className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Your real email is required for 6-digit OTP verification and password recovery.
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
                          required
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

                    {/* Profile Picture Upload Section (Camera, File, or Presets) */}
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
                      <span>{submitting ? 'Creating account...' : `Create ${role === 'PROVIDER' ? 'Agent' : 'Student'} Account`}</span>
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
              {/* FLOW 3: EMAIL OTP VERIFICATION */}
              {/* ========================================================================= */}
              {mode === 'verify_email' && (
                <div className="space-y-4">
                  <div className="text-center space-y-1.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner border border-emerald-200 dark:border-emerald-800">
                      <Mail className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Verify Your Email Address</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                      We've sent a 6-digit confirmation code to{' '}
                      <strong className="text-slate-800 dark:text-slate-200">{maskEmail(verificationEmail)}</strong>.
                    </p>
                  </div>

                  <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5 text-center">
                        Enter 6-Digit Verification Code
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          autoFocus
                          required
                          value={verificationCode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setVerificationCode(val);
                            setError(null);
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pasted = e.clipboardData.getData('text');
                            const digits = pasted.replace(/\D/g, '').slice(0, 6);
                            if (digits) {
                              setVerificationCode(digits);
                              setError(null);
                            }
                          }}
                          placeholder="123456"
                          className="w-full text-center text-2xl font-mono tracking-widest bg-slate-50 dark:bg-slate-800 border-2 border-emerald-500/50 rounded-2xl py-3 text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-1">
                        Code expires in 10 minutes.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || verificationCode.length < 6}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{submitting ? 'Verifying...' : 'Verify & Activate Account'}</span>
                    </button>
                  </form>

                  <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={resendingCode || resendCooldown > 0}
                      onClick={handleResendOtp}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${resendingCode ? 'animate-spin' : ''}`} />
                      <span>
                        {resendCooldown > 0 
                          ? `Resend code in ${resendCooldown}s` 
                          : 'Resend Verification Code'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setMode('register'); setError(null); }}
                      className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                    >
                      Wrong email? Change email address
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* FLOW 4: FORGOT PASSWORD */}
              {/* ========================================================================= */}
              {mode === 'forgot_password' && (
                <div className="space-y-4">
                  <div className="text-center space-y-1.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner border border-amber-200 dark:border-amber-800">
                      <KeyRound className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Recover Password</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                      Enter your account email address and we'll send a 6-digit recovery code.
                    </p>
                  </div>

                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Registered Email
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
                      <span>{submitting ? 'Sending code...' : 'Send Password Recovery Code'}</span>
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
              {/* FLOW 5: RESET PASSWORD */}
              {/* ========================================================================= */}
              {mode === 'reset_password' && (
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
                  ) : (
                    <>
                      <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                        <h3 className="text-base font-black text-slate-900 dark:text-white">Set New Password</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Enter the 6-digit recovery code sent to <strong>{maskEmail(recoveryEmail)}</strong> and your new password.
                        </p>
                      </div>

                      <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                            6-Digit Recovery Code
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            required
                            value={resetCode}
                            onChange={(e) => {
                              setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                              setError(null);
                            }}
                            onPaste={(e) => {
                              e.preventDefault();
                              const pasted = e.clipboardData.getData('text');
                              const digits = pasted.replace(/\D/g, '').slice(0, 6);
                              if (digits) {
                                setResetCode(digits);
                                setError(null);
                              }
                            }}
                            placeholder="123456"
                            className="w-full text-center text-lg font-mono tracking-widest bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

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

export default AuthModal;
