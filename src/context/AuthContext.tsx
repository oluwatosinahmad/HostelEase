import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types/hostelEase';
import { api } from '../services/api';
import { safeStorage } from '../utils/safeStorage';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string, role?: UserRole) => Promise<User>;
  register: (data: any) => Promise<User>;
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
  const [token, setToken] = useState<string | null>(() => safeStorage.getItem('hostel_ease_token'));
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
          safeStorage.setJSON('hostel_ease_user', userData, true);
        }
      } catch (err) {
        console.warn('Session check warning:', err);
        const stored = safeStorage.getItem('hostel_ease_user');
        if (!stored) {
          safeStorage.removeItem('hostel_ease_token');
          setToken(null);
          setUser(null);
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
      const res = await api.auth.login({ username: usernameOrEmail, email: usernameOrEmail, password, role });
      safeStorage.setItem('hostel_ease_token', res.token, true);
      safeStorage.setJSON('hostel_ease_user', res.user, true);
      setToken(res.token);
      setUser(res.user);
      console.log(`[AUTH_SUCCESS] Logged in successfully: ${res.user.email} (${res.user.role})`);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.auth.register(data);
      safeStorage.setItem('hostel_ease_token', res.token, true);
      safeStorage.setJSON('hostel_ease_user', res.user, true);
      setToken(res.token);
      setUser(res.user);
      console.log(`[AUTH_SUCCESS] Registered and logged in: ${res.user.email} (${res.user.role})`);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.presence.setOffline().catch(() => {});
    safeStorage.removeItem('hostel_ease_token');
    safeStorage.removeItem('hostel_ease_user');
    setToken(null);
    setUser(null);
    window.dispatchEvent(new CustomEvent('hostel_ease_user_logged_out'));
  };

  const updateProfile = async (data: any) => {
    try {
      await api.student.updateProfile(data);
    } catch {}
    const stored = localStorage.getItem('hostel_ease_user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        setUser(u);
      } catch {}
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
