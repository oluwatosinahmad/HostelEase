import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types/hostelEase';
import { api, setActiveAuthToken } from '../services/api';
import { safeStorage } from '../utils/safeStorage';
import { realtimeClient } from '../services/realtime';
import { supabase, isSupabaseConfigured } from '../services/supabase';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string, role?: UserRole) => Promise<User>;
  register: (data: any) => Promise<any>;
  verifyEmail: (email: string, code: string) => Promise<User>;
  resendVerification: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string; email?: string }>;
  resetPassword: (email: string, newPassword: string, code?: string, token?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: any) => Promise<void>;
  loginDemo: (role: UserRole) => Promise<User>;
  impersonateUser: (targetUser: User) => void;
  exitImpersonation: () => void;
  isImpersonating: boolean;
  impersonatorAdmin: User | null;
  isAuthenticated: boolean;
  isStudent: boolean;
  isProvider: boolean;
  isAgent: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    return safeStorage.getJSON<User | null>('hostel_ease_user', null);
  });
  const [token, setToken] = useState<string | null>(() => {
    const saved = safeStorage.getItem('hostel_ease_token');
    if (saved) setActiveAuthToken(saved);
    return saved;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(safeStorage.getItem('hostel_ease_token')));
  const [impersonatorAdmin, setImpersonatorAdmin] = useState<User | null>(() => {
    return safeStorage.getJSON<User | null>('hostel_ease_impersonator_admin', null);
  });

  useEffect(() => {
    async function loadUser() {
      const savedToken = safeStorage.getItem('hostel_ease_token');
      if (!savedToken) {
        setIsLoading(false);
        return;
      }
      try {
        console.log(`[PROFILE_REQUEST] Fetching current session user profile...`);
        const { user: userData } = await api.auth.getMe();
        if (userData) {
          console.log(`[PROFILE_SUCCESS] Profile loaded for: ${userData.email} (${userData.role})`);
          setUser(userData);
          setToken(savedToken);
          setActiveAuthToken(savedToken);
          safeStorage.setJSON('hostel_ease_user', userData, true);
          realtimeClient.connect(savedToken);
        } else {
          const storedUser = safeStorage.getJSON<User | null>('hostel_ease_user', null);
          if (storedUser) {
            console.log(`[SESSION_RESILIENCE] Maintaining authenticated session from cache: ${storedUser.email} (${storedUser.role})`);
            setUser(storedUser);
            setToken(savedToken);
            setActiveAuthToken(savedToken);
            realtimeClient.connect(savedToken);
          } else {
            console.warn('[SESSION_SYNC] No valid user profile found for session token. Resetting state.');
            safeStorage.removeItem('hostel_ease_token');
            safeStorage.removeItem('hostel_ease_user');
            setActiveAuthToken(null);
            setToken(null);
            setUser(null);
            realtimeClient.disconnect();
          }
        }
      } catch (err) {
        console.warn('Session check warning:', err);
        const storedUser = safeStorage.getJSON<User | null>('hostel_ease_user', null);
        if (storedUser) {
          setUser(storedUser);
          setToken(savedToken);
          setActiveAuthToken(savedToken);
          realtimeClient.connect(savedToken);
        } else {
          safeStorage.removeItem('hostel_ease_token');
          setActiveAuthToken(null);
          setToken(null);
          setUser(null);
          realtimeClient.disconnect();
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();

    const handleUserUpdate = (e: any) => {
      const savedToken = safeStorage.getItem('hostel_ease_token');
      if (savedToken) setToken(savedToken);
      if (e.detail) {
        setUser(e.detail);
      } else {
        const stored = safeStorage.getJSON<User | null>('hostel_ease_user', null);
        if (stored) {
          setUser(stored);
        }
      }
    };
    window.addEventListener('hostel_ease_user_updated', handleUserUpdate);
    return () => window.removeEventListener('hostel_ease_user_updated', handleUserUpdate);
  }, []);

  const login = async (usernameOrEmail: string, password: string, role?: UserRole): Promise<User> => {
    setIsLoading(true);
    try {
      const cleanEmail = (usernameOrEmail || '').trim().toLowerCase();

      // If Supabase is configured and input is an email, attempt Supabase authentication
      if (isSupabaseConfigured() && cleanEmail.includes('@') && role !== 'ADMIN') {
        try {
          const { error: sbError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password
          });
          if (sbError) {
            if (sbError.message.toLowerCase().includes('email not confirmed')) {
              const err: any = new Error('Your email address has not been verified yet. Please enter the verification code sent to your email.');
              err.code = 'EMAIL_NOT_VERIFIED';
              throw err;
            }
            console.warn('Supabase auth sign-in notice:', sbError.message);
          }
        } catch (sbErr: any) {
          if (sbErr.code === 'EMAIL_NOT_VERIFIED') throw sbErr;
          console.warn('Supabase auth sign-in notice:', sbErr.message);
        }
      }

      const res = await api.auth.login({ username: usernameOrEmail, email: usernameOrEmail, password, role });
      safeStorage.setItem('hostel_ease_token', res.token, true);
      safeStorage.setJSON('hostel_ease_user', res.user, true);
      setActiveAuthToken(res.token);
      setToken(res.token);
      setUser(res.user);
      realtimeClient.connect(res.token);

      if (res.welcomeNotification) {
        window.dispatchEvent(new CustomEvent('hostel_ease_notification_updated', {
          detail: { action: 'CREATED', notification: res.welcomeNotification }
        }));
      }

      console.log(`[AUTH_SUCCESS] Logged in successfully: ${res.user.email} (${res.user.role})`);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any): Promise<any> => {
    setIsLoading(true);
    try {
      const cleanEmail = (data.email || '').trim().toLowerCase();

      // If Supabase is configured, trigger Supabase Auth signUp to send official OTP email
      if (isSupabaseConfigured()) {
        try {
          const { error: sbError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: data.password,
            options: {
              data: {
                fullName: data.fullName,
                role: data.role,
                phone: data.phone,
                avatarUrl: data.avatarUrl,
                businessName: data.providerDetails?.businessName
              }
            }
          });

          if (sbError) {
            if (sbError.message.toLowerCase().includes('already registered')) {
              const err: any = new Error('This email address is already registered. Please log in or use Forgot Password if you cannot access your account.');
              err.code = 'EMAIL_ALREADY_REGISTERED';
              err.status = 409;
              throw err;
            }
            console.warn('Supabase signUp notice:', sbError.message);
          }
        } catch (sbErr: any) {
          if (sbErr.code === 'EMAIL_ALREADY_REGISTERED') throw sbErr;
          console.warn('Supabase signUp error caught:', sbErr);
        }
      }

      const res = await api.auth.register(data);
      if (res.token && res.user) {
        safeStorage.setItem('hostel_ease_token', res.token, true);
        safeStorage.setJSON('hostel_ease_user', res.user, true);
        setActiveAuthToken(res.token);
        setToken(res.token);
        setUser(res.user);
        realtimeClient.connect(res.token);

        if (res.welcomeNotification) {
          window.dispatchEvent(new CustomEvent('hostel_ease_notification_updated', {
            detail: { action: 'CREATED', notification: res.welcomeNotification }
          }));
        }
      }

      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmail = async (email: string, code: string): Promise<User> => {
    setIsLoading(true);
    try {
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanCode = (code || '').trim();

      // If Supabase is configured, verify OTP with Supabase Auth
      if (isSupabaseConfigured()) {
        try {
          const { error: sbError } = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: cleanCode,
            type: 'signup'
          });
          if (sbError) {
            console.warn('Supabase verifyOtp signup notice:', sbError.message);
          }
        } catch (sbErr) {
          console.warn('Supabase verifyOtp error caught:', sbErr);
        }
      }

      const res = await api.auth.verifyEmail({ email: cleanEmail, code: cleanCode });
      if (res.token && res.user) {
        safeStorage.setItem('hostel_ease_token', res.token, true);
        safeStorage.setJSON('hostel_ease_user', res.user, true);
        setActiveAuthToken(res.token);
        setToken(res.token);
        setUser(res.user);
        realtimeClient.connect(res.token);
        return res.user;
      }
      throw new Error('Verification completed but user profile was not returned');
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerification = async (email: string): Promise<void> => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.resend({
          type: 'signup',
          email: cleanEmail
        });
      } catch (sbErr) {
        console.warn('Supabase resend notice:', sbErr);
      }
    }
    await api.auth.resendVerification({ email: cleanEmail });
  };

  const forgotPassword = async (email: string): Promise<{ success: boolean; message: string; email?: string }> => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.resetPasswordForEmail(cleanEmail);
      } catch (sbErr) {
        console.warn('Supabase resetPasswordForEmail notice:', sbErr);
      }
    }
    return await api.auth.forgotPassword({ email: cleanEmail });
  };

  const resetPassword = async (email: string, newPassword: string, code?: string, token?: string): Promise<void> => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();

    // If Supabase is configured and 6-digit recovery code provided, verify OTP recovery in Supabase
    if (isSupabaseConfigured() && cleanCode) {
      try {
        const { error: sbError } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: 'recovery'
        });
        if (!sbError) {
          // Update password in Supabase Auth recovery session
          await supabase.auth.updateUser({ password: newPassword });
        } else {
          console.warn('Supabase recovery verifyOtp notice:', sbError.message);
        }
      } catch (sbErr) {
        console.warn('Supabase recovery error caught:', sbErr);
      }
    }

    await api.auth.resetPassword({ email: cleanEmail, newPassword, code: cleanCode, token });
  };

  const logout = () => {
    if (isSupabaseConfigured()) {
      supabase.auth.signOut().catch(() => {});
    }
    api.presence.setOffline().catch(() => {});
    realtimeClient.disconnect();
    safeStorage.purgeUserSessionData();
    setActiveAuthToken(null);
    setToken(null);
    setUser(null);
    window.dispatchEvent(new CustomEvent('hostel_ease_user_logged_out'));
  };

  const updateProfile = async (data: any) => {
    try {
      await api.student.updateProfile(data);
    } catch {}
    const stored = safeStorage.getJSON<User | null>('hostel_ease_user', null);
    if (stored) {
      setUser(stored);
    }
  };

  const loginDemo = async (role: UserRole): Promise<User> => {
    if (role === 'STUDENT') {
      return await login('student@lautech.edu.ng', 'Student123!', 'STUDENT');
    } else if (role === 'PROVIDER' || (role as string) === 'AGENT' || (role as string) === 'LANDLORD') {
      return await login('landlord@hostelease.ng', 'Provider123!', 'PROVIDER');
    } else {
      throw new Error('Administrator access requires manual authentication with username and password.');
    }
  };

  const impersonateUser = (targetUser: User) => {
    if (user && (user.role === 'ADMIN' || (user as any)?.role === 'SUPER_ADMIN') && !impersonatorAdmin) {
      setImpersonatorAdmin(user);
      safeStorage.setJSON('hostel_ease_impersonator_admin', user, true);
    }
    setUser(targetUser);
    safeStorage.setJSON('hostel_ease_user', targetUser, true);
    window.dispatchEvent(new CustomEvent('hostel_ease_impersonation_started', { detail: targetUser }));
  };

  const exitImpersonation = () => {
    const realAdmin = safeStorage.getJSON<User | null>('hostel_ease_impersonator_admin', null);
    if (realAdmin) {
      setUser(realAdmin);
      safeStorage.setJSON('hostel_ease_user', realAdmin, true);
      safeStorage.removeItem('hostel_ease_impersonator_admin');
      setImpersonatorAdmin(null);
      window.dispatchEvent(new CustomEvent('hostel_ease_impersonation_ended'));
      return;
    }
    setImpersonatorAdmin(null);
  };

  const isAgentOrProvider = user?.role === 'PROVIDER' || (user as any)?.role === 'LANDLORD' || (user as any)?.role === 'AGENT' || (user as any)?.role === 'agent';

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    register,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    logout,
    updateProfile,
    loginDemo,
    impersonateUser,
    exitImpersonation,
    isImpersonating: Boolean(impersonatorAdmin),
    impersonatorAdmin,
    isAuthenticated: Boolean(user),
    isStudent: user?.role === 'STUDENT',
    isProvider: isAgentOrProvider,
    isAgent: isAgentOrProvider,
    isAdmin: user?.role === 'ADMIN' || (user as any)?.role === 'SUPER_ADMIN' || (user as any)?.role === 'OWNER' || (user as any)?.isSuperAdmin === true
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
