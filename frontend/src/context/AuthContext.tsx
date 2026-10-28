import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  RegisterRequest,
  RegisterResponse,
  GenericActionResponse,
} from '../types/auth';
import { authApi } from '../api/auth';
import { getAuthToken, setAuthTokens } from '../api/client';

interface AuthContextType {
  user: User | null;
  role: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (identifier: string, password?: string) => Promise<User>;
  loginWithOtp: (identifier: string, otp: string) => Promise<User>;
  signup: (req: RegisterRequest) => Promise<RegisterResponse>;
  verifyEmail: (email: string, otp: string) => Promise<GenericActionResponse>;
  verifyPhone: (phone: string, otp: string) => Promise<GenericActionResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUserDirectly: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get('auth_token');
      if (tokenParam) {
        setAuthTokens(tokenParam);
      }
    }
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const me = await authApi.getMe();
      setUser(me);
      setError(null);
    } catch {
      setUser(null);
      setAuthTokens(null, null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();

    const handleSessionExpired = () => {
      setUser(null);
      setAuthTokens(null, null);
    };

    window.addEventListener('finsure:session-expired', handleSessionExpired);
    return () => window.removeEventListener('finsure:session-expired', handleSessionExpired);
  }, [refreshUser]);

  const login = async (identifier: string, password?: string): Promise<User> => {
    setIsLoading(true);
    setError(null);
    try {
      if (password) {
        const res = await authApi.login({ identifier, password });
        if (res.user) {
          setUser(res.user);
          return res.user;
        }
      }
      // If no password or res didn't embed user, fetch user profile
      const me = await authApi.getMe();
      setUser(me);
      return me;
    } catch (err: unknown) {
      const message = (err as Error).message || 'Authentication failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOtp = async (identifier: string, otp: string): Promise<User> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.verifyOtp({ identifier, otp });
      if (res.user) {
        setUser(res.user);
        return res.user;
      }
      const me = await authApi.getMe();
      setUser(me);
      return me;
    } catch (err: unknown) {
      const message = (err as Error).message || 'OTP verification failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (req: RegisterRequest): Promise<RegisterResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.register(req);
      return res;
    } catch (err: unknown) {
      const message = (err as Error).message || 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmail = async (email: string, otp: string): Promise<GenericActionResponse> => {
    return authApi.verifyEmail({ email, otp });
  };

  const verifyPhone = async (phone: string, otp: string): Promise<GenericActionResponse> => {
    return authApi.verifyPhone({ phone, otp });
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const setUserDirectly = (u: User | null) => {
    setUser(u);
  };

  const value = {
    user,
    role: user?.role || null,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    loginWithOtp,
    signup,
    verifyEmail,
    verifyPhone,
    logout,
    refreshUser,
    setUserDirectly,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
