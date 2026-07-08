import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (credentials: any) => Promise<any>;
  register: (userData: any) => Promise<any>;
  verifyOtp: (verifyData: any) => Promise<any>;
  resendOtp: (email: string) => Promise<any>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<any>;
  resetPassword: (resetData: any) => Promise<any>;
  updateUserInState: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getErrorMessage = (error: any, defaultMsg: string): string => {
  const detail = error.response?.data?.detail;
  if (detail) {
    if (typeof detail === 'string') {
      return detail;
    }
    if (Array.isArray(detail)) {
      return detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
    }
    if (typeof detail === 'object') {
      return detail.message || JSON.stringify(detail);
    }
  }
  return error.message || defaultMsg;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadStoredAuth = () => {
      const storedToken = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error("Failed to parse stored user", e);
        }
      }
      setLoading(false);
    };

    loadStoredAuth();
  }, []);

  const login = async (credentials: any) => {
    try {
      const res = await api.post('/auth/login', credentials);
      const { access_token, refresh_token, user: loggedUser } = res.data;
      
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(loggedUser));
      
      setToken(access_token);
      setUser(loggedUser);
      return loggedUser;
    } catch (error: any) {
      throw getErrorMessage(error, 'Login failed');
    }
  };

  const register = async (userData: any) => {
    try {
      const res = await api.post('/auth/register', userData);
      return res.data;
    } catch (error: any) {
      throw getErrorMessage(error, 'Registration failed');
    }
  };

  const verifyOtp = async (verifyData: any) => {
    try {
      const res = await api.post('/auth/verify-otp', verifyData);
      const { access_token, refresh_token, user: verifiedUser } = res.data;
      
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(verifiedUser));
      
      setToken(access_token);
      setUser(verifiedUser);
      return verifiedUser;
    } catch (error: any) {
      throw getErrorMessage(error, 'OTP verification failed');
    }
  };

  const resendOtp = async (email: string) => {
    try {
      const res = await api.post('/auth/resend-otp', { email });
      return res.data;
    } catch (error: any) {
      throw getErrorMessage(error, 'Failed to resend OTP');
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const forgotPassword = async (email: string) => {
    try {
      const res = await api.post('/auth/forgot-password', { email });
      return res.data;
    } catch (error: any) {
      throw getErrorMessage(error, 'Request failed');
    }
  };

  const resetPassword = async (resetData: any) => {
    try {
      const res = await api.post('/auth/reset-password', resetData);
      return res.data;
    } catch (error: any) {
      throw getErrorMessage(error, 'Password reset failed');
    }
  };

  const updateUserInState = (updatedUser: User) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        verifyOtp,
        resendOtp,
        logout,
        forgotPassword,
        resetPassword,
        updateUserInState
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
