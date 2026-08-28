import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types/hostelEase';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string, role?: UserRole) => Promise<User>;
  register: (data: any) => Promise<User>;
  logout: () => void;
  updateProfile: (data: any) => Promise<void>;
  loginDemo: (role: UserRole) => Promise<User>;
  isAuthenticated: boolean;
  isStudent: boolean;
  isProvider: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('hostel_ease_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('hostel_ease_token'));
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    async function loadUser() {
      const savedToken = localStorage.getItem('hostel_ease_token');
      if (!savedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const { user: userData } = await api.auth.getMe();
        if (userData) {
          setUser(userData);
          localStorage.setItem('hostel_ease_user', JSON.stringify(userData));
        }
      } catch (err) {
        console.warn('Session check warning:', err);
        const stored = localStorage.getItem('hostel_ease_user');
        if (!stored) {
          localStorage.removeItem('hostel_ease_token');
          setToken(null);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email: string, password: string, role?: UserRole): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.auth.login({ email, password, role });
      localStorage.setItem('hostel_ease_token', res.token);
      localStorage.setItem('hostel_ease_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.auth.register(data);
      localStorage.setItem('hostel_ease_token', res.token);
      localStorage.setItem('hostel_ease_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('hostel_ease_token');
    localStorage.removeItem('hostel_ease_user');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data: any) => {
    await api.auth.updateProfile(data);
    const { user: updatedUser } = await api.auth.getMe();
    if (updatedUser) {
      setUser(updatedUser);
      localStorage.setItem('hostel_ease_user', JSON.stringify(updatedUser));
    }
  };

  const loginDemo = async (role: UserRole): Promise<User> => {
    if (role === 'STUDENT') {
      return await login('student@lautech.edu.ng', 'Student123!', 'STUDENT');
    } else if (role === 'PROVIDER') {
      return await login('provider@hostelease.ng', 'Provider123!', 'PROVIDER');
    } else {
      return await login('admin@hostelease.ng', 'Admin123!', 'ADMIN');
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    loginDemo,
    isAuthenticated: Boolean(user),
    isStudent: user?.role === 'STUDENT',
    isProvider: user?.role === 'PROVIDER' || (user as any)?.role === 'LANDLORD',
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
