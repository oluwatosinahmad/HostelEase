import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  AlertTriangle, 
  ArrowRight, 
  X, 
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import { AdminSession } from '../types';
import { api } from '../services/api';

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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await api.auth.login(username.trim(), password, 'ADMIN');
      if (res && res.user && res.token) {
        const session: AdminSession = {
          token: res.token,
          admin: {
            id: res.user.id,
            name: res.user.fullName,
            email: res.user.email,
            role: 'SUPER_ADMIN',
            department: 'Operations & Platform Management',
            is2FAEnabled: false,
            status: 'ACTIVE',
            lastLoginAt: new Date().toISOString(),
            createdAt: '2026-01-01T08:00:00Z',
          },
          role: 'SUPER_ADMIN',
          authenticatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
          is2FAVerified: true,
        };
        onLoginSuccess(session);
        onClose();
      } else {
        throw new Error('Authentication failed');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid Admin credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden text-white my-8">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-purple-950/60 to-slate-900 p-6 border-b border-slate-800 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-400 flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Admin Login</h2>
              <p className="text-xs text-slate-400">Sign in with administrator credentials</p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-3 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCredentialSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/50 disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Log In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Security Notice */}
        <div className="bg-slate-950 p-4 border-t border-slate-800/80 text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
          <span>Restricted Hostel Ease platform administration system.</span>
        </div>
      </div>
    </div>
  );
};
