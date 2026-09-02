import React, { useState, useRef } from 'react';
import { 
  X, 
  Building2, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Phone, 
  ShieldCheck, 
  GraduationCap, 
  Home, 
  AlertCircle,
  ShieldAlert,
  ArrowLeft,
  KeyRound,
  Camera,
  Check,
  Upload,
  Trash2,
  Image as ImageIcon
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

const PRESET_LANDLORD_AVATARS = [
  { id: 'l-1', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', label: 'Landlord 1' },
  { id: 'l-2', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80', label: 'Landlord 2' },
  { id: 'l-3', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80', label: 'Landlord 3' },
  { id: 'l-4', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80', label: 'Landlady 1' }
];

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
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<UserRole>(defaultRole);

  // Form fields
  const [email, setEmail] = useState('');
  const [emailManuallyEdited, setEmailManuallyEdited] = useState(false);
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [matricNo, setMatricNo] = useState('');
  const [level, setLevel] = useState('100L');
  const [avatarUrl, setAvatarUrl] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80');
  const [customAvatarInput, setCustomAvatarInput] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessRestricted, setAccessRestricted] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError('Image file is too large (max 8MB). Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (result) {
        setAvatarUrl(result);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  const formatEmailFromName = (name: string, targetRole: UserRole): string => {
    const clean = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
    if (!clean) return '';
    if (targetRole === 'STUDENT') return `${clean}@lautech.edu.ng`;
    if (targetRole === 'PROVIDER') return `${clean}@hostelease.ng`;
    if (targetRole === 'ADMIN') return `${clean}@hostelease.ng`;
    return `${clean}@lautech.edu.ng`;
  };

  const getCleanUsernamePrefix = (inputEmail: string): string => {
    return inputEmail.toLowerCase().trim().split('@')[0].replace(/[^a-z0-9.]/g, '');
  };

  const handleFullNameChange = (val: string) => {
    setFullName(val);
    setError(null);
    if (!emailManuallyEdited || !email || email.endsWith('@lautech.edu.ng') || email.endsWith('@hostelease.ng')) {
      setEmail(formatEmailFromName(val, role));
    }
  };

  const handleRoleSelect = (newRole: UserRole) => {
    setRole(newRole);
    setError(null);
    setAccessRestricted(false);
    
    // Switch default avatar if needed
    if (newRole === 'PROVIDER' && avatarUrl === PRESET_STUDENT_AVATARS[0].url) {
      setAvatarUrl(PRESET_LANDLORD_AVATARS[0].url);
    } else if (newRole === 'STUDENT' && avatarUrl === PRESET_LANDLORD_AVATARS[0].url) {
      setAvatarUrl(PRESET_STUDENT_AVATARS[0].url);
    }

    if (fullName && (!emailManuallyEdited || email.endsWith('@lautech.edu.ng') || email.endsWith('@hostelease.ng'))) {
      setEmail(formatEmailFromName(fullName, newRole));
    } else if (newRole === 'ADMIN') {
      setMode('login');
      if (!email || email.includes('lautech.edu.ng') || email.includes('example.com')) {
        setEmail('admin@hostelease.ng');
      }
    }
  };

  const handleResetToLogin = () => {
    setError(null);
    setAccessRestricted(false);
    setRole('STUDENT');
    setMode('login');
    setEmail('');
    setEmailManuallyEdited(false);
    setPassword('');
    setFullName('');
  };

  const normalizeEmailBeforeSubmit = (rawEmail: string, targetRole: UserRole): string => {
    const trimmed = rawEmail.toLowerCase().trim();
    if (!trimmed) return '';
    if (!trimmed.includes('@')) {
      if (targetRole === 'STUDENT') return `${trimmed}@lautech.edu.ng`;
      if (targetRole === 'PROVIDER' || targetRole === 'ADMIN') return `${trimmed}@hostelease.ng`;
    }
    return trimmed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAccessRestricted(false);
    setSubmitting(true);

    const resolvedEmail = normalizeEmailBeforeSubmit(email, role);

    try {
      let authedUser: any = null;
      if (mode === 'login') {
        // Pass requested role context to backend for strict authorization
        authedUser = await login(resolvedEmail, password, role);
      } else {
        authedUser = await register({
          email: resolvedEmail,
          password,
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
          role,
          avatarUrl: avatarUrl || undefined,
          studentDetails: role === 'STUDENT' ? { 
            matricNo: matricNo.trim() || undefined,
            matricNumber: matricNo.trim() || undefined,
            department: department.trim(),
            level,
            avatarUrl
          } : undefined,
          providerDetails: role === 'PROVIDER' ? { 
            businessName: businessName.trim() || undefined,
            avatarUrl 
          } : undefined
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
      const errMsg = err.message || 'Authentication failed. Please check your credentials.';
      setError(errMsg);
      setSubmitting(false);
      setIsLoggingIn(false);

      // Check if this was an unauthorized admin or role access attempt
      if (
        errMsg.toLowerCase().includes('not authorized to access the admin portal') ||
        err.code === 'UNAUTHORIZED_ADMIN_ACCESS' ||
        (role === 'ADMIN' && (errMsg.includes('403') || errMsg.toLowerCase().includes('restricted') || errMsg.toLowerCase().includes('authorized')))
      ) {
        setAccessRestricted(true);
      }
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
                {mode === 'login' ? 'Authenticating & Verifying Role...' : 'Account Created Successfully!'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verifying authorization with database security...
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

          {/* Role selector pills (Student | Landlord | Admin) */}
          <div className="grid grid-cols-3 gap-1.5 bg-white/10 p-1 rounded-xl mt-4 text-xs">
            <button
              type="button"
              onClick={() => handleRoleSelect('STUDENT')}
              className={`py-2 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                role === 'STUDENT' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              👨‍🎓 Student
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect('PROVIDER')}
              className={`py-2 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                role === 'PROVIDER' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              🏠 Landlord
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect('ADMIN')}
              className={`py-2 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                role === 'ADMIN' ? 'bg-purple-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              👑 Admin
            </button>
          </div>
        </div>

        {/* Form Body or Access Restricted View */}
        {accessRestricted ? (
          <div className="p-8 text-center space-y-5 animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-inner border border-rose-200 dark:border-rose-800">
              <ShieldAlert className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
                <span>🔒 Access Restricted</span>
              </h3>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                This account is not authorized to access the Admin Portal.
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Administrative privileges are managed strictly in the backend database. Public accounts cannot access the administrative command console.
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetToLogin}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Login</span>
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* Mode toggle (Login / Register) */}
            {role === 'ADMIN' ? (
              <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-purple-900 dark:text-purple-300 text-xs font-medium flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Administrator Portal Authentication
                </span>
                <span className="text-[10px] uppercase font-bold bg-purple-200 dark:bg-purple-900/60 px-2 py-0.5 rounded text-purple-900 dark:text-purple-200">
                  Strict RBAC
                </span>
              </div>
            ) : (
              <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className={`flex-1 pb-2 text-xs font-bold transition-all border-b-2 text-center ${
                    mode === 'login'
                      ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); }}
                  className={`flex-1 pb-2 text-xs font-bold transition-all border-b-2 text-center ${
                    mode === 'register'
                      ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  Register Account
                </button>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
                {error.toLowerCase().includes('already exists') && (
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(null); }}
                    className="self-start text-xs font-bold text-emerald-700 dark:text-emerald-400 underline hover:text-emerald-800"
                  >
                    Click here to Log In instead →
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'register' && role !== 'ADMIN' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                      Full Name {role === 'PROVIDER' ? '(Landlord)' : '(Student)'}
                    </label>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      ✨ Auto-generates email
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3" />
                    <input
                      type="text"
                      placeholder={role === 'PROVIDER' ? 'e.g. Ahmad Oladimeji' : 'e.g. Adelopo Ahmad'}
                      value={fullName}
                      onChange={(e) => handleFullNameChange(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                    {role === 'ADMIN' ? 'Admin Email / Username' : 'Email Address'}
                  </label>
                  {email && !email.includes('@') && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                      Domain required
                    </span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3" />
                  <input
                    type="text"
                    placeholder={
                      role === 'STUDENT' 
                        ? 'adelopo@lautech.edu.ng' 
                        : role === 'ADMIN' 
                        ? 'admin@hostelease.ng' 
                        : 'ahmad@hostelease.ng'
                    }
                    value={email}
                    onChange={(e) => { 
                      setEmail(e.target.value); 
                      setEmailManuallyEdited(true); 
                      setError(null); 
                    }}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Smart Auto-Complete Domain Chip */}
                {email && !email.includes('@') && (
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Click to complete:</span>
                    {role === 'STUDENT' && (
                      <button
                        type="button"
                        onClick={() => {
                          const clean = getCleanUsernamePrefix(email);
                          setEmail(`${clean || 'student'}@lautech.edu.ng`);
                          setError(null);
                        }}
                        className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 border border-emerald-300 dark:border-emerald-700"
                      >
                        <span>⚡ @lautech.edu.ng</span>
                      </button>
                    )}
                    {role === 'PROVIDER' && (
                      <button
                        type="button"
                        onClick={() => {
                          const clean = getCleanUsernamePrefix(email);
                          setEmail(`${clean || 'landlord'}@hostelease.ng`);
                          setError(null);
                        }}
                        className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 border border-emerald-300 dark:border-emerald-700"
                      >
                        <span>⚡ @hostelease.ng</span>
                      </button>
                    )}
                    {role === 'ADMIN' && (
                      <button
                        type="button"
                        onClick={() => {
                          const clean = getCleanUsernamePrefix(email);
                          setEmail(`${clean || 'admin'}@hostelease.ng`);
                          setError(null);
                        }}
                        className="px-2 py-0.5 bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/60 dark:hover:bg-purple-900/80 text-purple-800 dark:text-purple-200 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 border border-purple-300 dark:border-purple-700"
                      >
                        <span>👑 @hostelease.ng</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">Password</label>
                  {mode === 'register' && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Min. 6 characters</span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    minLength={6}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {mode === 'register' && role !== 'ADMIN' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Phone / WhatsApp Number</label>
                  <div className="relative flex items-center">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3" />
                    <input
                      type="tel"
                      placeholder="e.g. +234 803 000 0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {mode === 'register' && role === 'STUDENT' && (
                <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Matriculation No. <span className="text-emerald-600 dark:text-emerald-400">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3" />
                        <input
                          type="text"
                          placeholder="e.g. 2024/09876"
                          value={matricNo}
                          onChange={(e) => setMatricNo(e.target.value)}
                          className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase font-mono font-bold"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Academic Level
                      </label>
                      <select
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                        className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
                      >
                        <option value="100L">100 Level (Fresher)</option>
                        <option value="200L">200 Level</option>
                        <option value="300L">300 Level</option>
                        <option value="400L">400 Level (Finalist / Clinical)</option>
                        <option value="500L">500 Level (Engineering / Agri)</option>
                        <option value="Postgraduate">Postgraduate / Masters</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      LAUTECH Department
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Computer Science, Accounting, Med Lab, Mechanical Eng"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {mode === 'register' && role === 'PROVIDER' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Business / Housing Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Adeleke Student Lodges"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Profile Picture Upload for Both Students and Landlords */}
              {mode === 'register' && role !== 'ADMIN' && (
                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{role === 'PROVIDER' ? 'Landlord Display Picture' : 'Student Profile Photo'}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomAvatarInput(!customAvatarInput)}
                      className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      {customAvatarInput ? 'Use file/presets' : 'Paste web URL'}
                    </button>
                  </div>

                  {/* Hidden File Input for Device / Camera Upload */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {customAvatarInput ? (
                    <input
                      type="url"
                      placeholder="Paste image URL (https://...)"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  ) : (
                    <div className="flex items-center gap-3.5">
                      {/* Avatar Preview */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={avatarUrl || (role === 'PROVIDER' ? PRESET_LANDLORD_AVATARS[0].url : PRESET_STUDENT_AVATARS[0].url)}
                          alt="Profile Preview"
                          className="w-14 h-14 rounded-full object-cover ring-2 ring-emerald-500 shadow-md"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-1 shadow">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      </div>

                      {/* Upload CTA and Actions */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer hover:scale-105"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Your Photo</span>
                          </button>

                          {avatarUrl && (
                            <button
                              type="button"
                              onClick={() => setAvatarUrl(role === 'PROVIDER' ? PRESET_LANDLORD_AVATARS[0].url : PRESET_STUDENT_AVATARS[0].url)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              title="Reset to default avatar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Supports camera selfies, JPG, PNG & WebP (Max 8MB)
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Preset Avatars Bar */}
                  {!customAvatarInput && (
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
                        Or select quick preset avatar:
                      </span>
                      <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
                        {(role === 'PROVIDER' ? PRESET_LANDLORD_AVATARS : PRESET_STUDENT_AVATARS).map((av) => (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => setAvatarUrl(av.url)}
                            className={`relative rounded-full p-0.5 transition-all flex-shrink-0 cursor-pointer ${
                              avatarUrl === av.url
                                ? 'ring-2 ring-emerald-500 scale-110 shadow-sm'
                                : 'opacity-70 hover:opacity-100'
                            }`}
                            title={av.label}
                          >
                            <img
                              src={av.url}
                              alt={av.label}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            {avatarUrl === av.url && (
                              <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-600 text-white rounded-full p-0.5">
                                <Check className="w-2 h-2" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 ${
                  role === 'ADMIN' 
                    ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30' 
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                }`}
              >
                {submitting 
                  ? 'Authenticating...' 
                  : mode === 'login' 
                  ? (role === 'PROVIDER' ? 'Log in as Landlord' : role === 'ADMIN' ? '👑 Authenticate Admin Credentials' : 'Log in as Student') 
                  : `Create ${role === 'PROVIDER' ? 'Landlord' : 'Student'} Account`}
              </button>

              {/* Only Admin / Platform Owner has 1-Click Demo Login */}
              {role === 'ADMIN' && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-2 space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center">
                    Authorized Platform Owner Access
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setEmail('admin@hostelease.ng');
                      setPassword('Admin123!');
                      setError(null);
                      setSubmitting(true);
                      try {
                        const authed = await login('admin@hostelease.ng', 'Admin123!', 'ADMIN');
                        setIsLoggingIn(true);
                        setTimeout(() => {
                          setIsLoggingIn(false);
                          setSubmitting(false);
                          if (onSuccess) onSuccess(authed);
                          onClose();
                        }, 700);
                      } catch (err: any) {
                        setError(err.message || 'Demo Admin authentication failed');
                        setSubmitting(false);
                      }
                    }}
                    disabled={submitting}
                    className="w-full py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 font-bold text-[11px] rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>👑 1-Click Owner Demo Login (admin@hostelease.ng)</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
