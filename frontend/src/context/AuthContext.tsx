/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { type User } from '../types';
import api, { clearTokens, getToken, saveToken } from '../lib/axios';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // Listen for forced logout events dispatched by the axios interceptor.
  // This avoids window.location.href (which causes full reload -> infinite loop).
  useEffect(() => {
    const handleForceLogout = () => {
      clearTokens();
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login');
    };

    window.addEventListener('auth:force-logout', handleForceLogout);
    return () => window.removeEventListener('auth:force-logout', handleForceLogout);
  }, [navigate]);

  // On mount: check if we have a valid session and hydrate user state.
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getToken();

      // FIX #3: Don't bail early when there's no AT in localStorage.
      // The user may have refreshed the page after the AT expired but while
      // a valid RT cookie still exists. Attempt a silent refresh first before
      // giving up and showing the login screen.
      if (!token) {
        try {
          const { data } = await axios.post<{ access_token: string }>(
            `${import.meta.env.VITE_API_URL}/auth/refresh`,
            null,
            { withCredentials: true },
          );
          saveToken(data.access_token);

          const response = await api.get<User>('/users/me');
          setUser(response.data);
          setIsAuthenticated(true);
        } catch {
          // Both AT and RT are gone — correct to stay logged out.
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // AT exists. Fetch current user. If token expired, the axios interceptor handles:
      //   1. Catches 401 from /users/me
      //   2. POSTs /auth/refresh via bare axios (cookie-only, no Bearer needed)
      //   3. Saves new access token and retries /users/me
      //   4. If refresh fails -> dispatches 'auth:force-logout' (handled above)
      try {
        const response = await api.get<User>('/users/me');
        setUser(response.data);
        setIsAuthenticated(true);
      } catch {
        clearTokens();
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = (userData: User, token: string) => {
    saveToken(token);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Best-effort logout, ignore server errors
    } finally {
      clearTokens();
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};