import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import { useTheme } from './ThemeContext';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setTheme } = useTheme();

  const saveUserSession = (u) => {
    if (u && u.email) {
      const email = u.email.trim().toLowerCase();
      try {
        sessionStorage.setItem('smarthire_user_email', email);
        sessionStorage.setItem('smarthire_user', JSON.stringify(u));
        localStorage.setItem('smarthire_user_email', email);
        localStorage.setItem('smarthire_user', JSON.stringify(u));
      } catch (_) {}
    }
  };

  const clearUserSession = () => {
    try {
      sessionStorage.removeItem('smarthire_user_email');
      sessionStorage.removeItem('smarthire_user');
      localStorage.removeItem('smarthire_user_email');
      localStorage.removeItem('smarthire_user');
    } catch (_) {}
  };

  const fetchCurrentUser = async () => {
    try {
      const cachedEmail = typeof window !== 'undefined'
        ? (sessionStorage.getItem('smarthire_user_email') || localStorage.getItem('smarthire_user_email'))
        : null;

      const response = await api.get('/auth/me', {
        headers: cachedEmail ? { 'X-User-Email': cachedEmail } : {},
      });

      if (response.data && response.data.authenticated && response.data.user) {
        const u = response.data.user;
        setUser(u);
        saveUserSession(u);
        if (u.themePreference) {
          setTheme(u.themePreference, false);
        }
      } else {
        setUser(null);
        clearUserSession();
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email, password, role) => {
    const response = await api.post('/auth/login', { email, password, role });
    if (response.data && response.data.success && response.data.user) {
      const u = response.data.user;
      setUser(u);
      saveUserSession(u);
      if (u.themePreference) {
        setTheme(u.themePreference, false);
      }
      return response.data;
    }
    throw new Error(response.data?.message || 'Login failed');
  };

  const register = async (registerData) => {
    const response = await api.post('/auth/register', registerData);
    if (response.data && response.data.success && response.data.user) {
      const u = response.data.user;
      setUser(u);
      saveUserSession(u);
      if (u.themePreference) {
        setTheme(u.themePreference, false);
      }
      return response.data;
    }
    throw new Error(response.data?.message || 'Registration failed');
  };

  const loginWithGoogle = async (googleData) => {
    const response = await api.post('/auth/google', googleData);
    if (response.data && response.data.success && response.data.user) {
      const u = response.data.user;
      setUser(u);
      saveUserSession(u);
      if (u.themePreference) {
        setTheme(u.themePreference, false);
      }
      return response.data;
    }
    throw new Error(response.data?.message || 'Google authentication failed');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {}
    setUser(null);
    clearUserSession();
    setTheme('light', false);
  };

  const updateUser = (updatedData) => {
    setUser((prev) => {
      const merged = prev ? { ...prev, ...updatedData } : null;
      if (merged) saveUserSession(merged);
      return merged;
    });
    if (updatedData.themePreference) {
      setTheme(updatedData.themePreference, false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'USER',
        isHr: user?.role === 'HR' || user?.role === 'RECRUITER',
        isAuthenticated: !!user,
        loading,
        login,
        register,
        loginWithGoogle,
        logout,
        updateUser,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
