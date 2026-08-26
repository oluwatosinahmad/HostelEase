import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Key, 
  Mail, 
  AlertTriangle, 
  ArrowRight, 
  X, 
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import { AdminUser, AdminSession } from '../types';
import { INITIAL_ADMIN_USERS } from '../data/campusData';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: AdminSession) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('admin@campusnest.ng');
  const [password, setPassword] = useState('password123');
  const [step, setStep] = useState<'CREDENTIALS' | '2FA'>('CREDENTIALS');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [pendingAdmin, setPendingAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleCredentialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isLocked) {
      setError(`Account security lockout active. Please wait ${lockoutTimer}s.`);
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const matchedAdmin = INITIAL_ADMIN_USERS.find(
        (a) => a.email.toLowerCase() === email.trim().toLowerCase()
      );

      if (!matchedAdmin || password !== 'password123') {
        const newFailed = failedAttempts + 1;
        setFailedAttempts(newFailed);
        if (newFailed >= 3) {
          setIsLocked(true);
          setLockoutTimer(30);
          const interval = setInterval(() => {
            setLockoutTimer((prev) => {
              if (prev <= 1) {
                clearInterval(interval);
                setIsLocked(false);
                setFailedAttempts(0);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
          setError('Too many failed attempts! Security lockout enforced for 30 seconds.');
        } else {
          setError(`Invalid credentials. ${3 - newFailed} attempts remaining before security lockout.`);
        }
        return;
      }

      if (matchedAdmin.status === 'SUSPENDED') {
        setError('This administrator account has been deactivated by the Super Admin.');
        return;
      }

      setPendingAdmin(matchedAdmin);

      if (matchedAdmin.is2FAEnabled) {
        setStep('2FA');
        setTwoFactorCode('');
      } else {
        completeLogin(matchedAdmin);
      }
    }, 600);
  };

  const handle2FASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingAdmin) return;

    if (twoFactorCode.trim() !== '123456' && twoFactorCode.trim() !== '000000') {
      setError('Invalid 2FA Security Code. (Use demo code: 123456)');
      return;
    }

    completeLogin(pendingAdmin);
  };

  const completeLogin = (admin: AdminUser) => {
    const session: AdminSession = {
      token: `cn-adm-token-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      admin,
      role: admin.role,
      authenticatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
      is2FAVerified: true,
    };
    onLoginSuccess(session);
  };

  const selectPresetRole = (admin: AdminUser) => {
    setEmail(admin.email);
    setPassword('password123');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden text-white my-8">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 p-6 border-b border-slate-800 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-600/20 border border-brand-500/40 text-brand-400 flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-brand-400 tracking-wider uppercase">CampusNest Control Center</span>
                <span className="text-[10px] bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full border border-brand-500/30 font-mono font-bold">
                  v8.0 ENTERPRISE
                </span>
              </div>
              <h2 className="text-xl font-black text-white">Administrator Access Gate</h2>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-3 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 'CREDENTIALS' && (
            <form onSubmit={handleCredentialSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Admin Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@campusnest.ng"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Security Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || isLocked}
                className={`w-full py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                  isLocked
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-900/50'
                }`}
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Authenticate Session</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {step === '2FA' && pendingAdmin && (
            <form onSubmit={handle2FASubmit} className="space-y-4">
              <div className="bg-brand-500/10 border border-brand-500/30 rounded-2xl p-4 text-xs space-y-1">
                <div className="font-bold text-brand-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  <span>Two-Factor Authentication Required</span>
                </div>
                <p className="text-slate-300">
                  Welcome, <strong>{pendingAdmin.name}</strong> ({pendingAdmin.role}). Enter the 6-digit TOTP security code generated by your Authenticator app.
                </p>
                <div className="text-[11px] text-brand-400 font-mono font-bold pt-1">
                  Demo 2FA Security Code: <strong>123456</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  6-Digit Authenticator Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl py-3 px-4 text-center text-xl font-mono font-bold tracking-widest text-brand-400 placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('CREDENTIALS')}
                  className="flex-1 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-xs font-bold text-white transition-all shadow-lg cursor-pointer"
                >
                  Verify & Enter Control Center
                </button>
              </div>
            </form>
          )}

          {/* Quick RBAC Test Persona Switcher */}
          <div className="border-t border-slate-800/80 pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Demo RBAC Role Presets
              </span>
              <span className="text-[10px] text-slate-500">Click to autofill</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {INITIAL_ADMIN_USERS.map((admin) => (
                <button
                  key={admin.id}
                  type="button"
                  onClick={() => selectPresetRole(admin)}
                  className={`p-2 rounded-xl text-left border transition-all text-[11px] cursor-pointer ${
                    email === admin.email
                      ? 'bg-brand-950/60 border-brand-500 text-brand-200'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold truncate">{admin.role.replace('_', ' ')}</div>
                  <div className="text-[9px] text-slate-500 truncate">{admin.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Security Notice */}
        <div className="bg-slate-950 p-4 border-t border-slate-800/80 text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          <span>Restricted CampusNest internal system. All actions are cryptographically audited.</span>
        </div>
      </div>
    </div>
  );
};
