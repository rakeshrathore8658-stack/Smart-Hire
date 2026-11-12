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
        const stored = typeof window !== 'undefined'
          ? (sessionStorage.getItem('smarthire_user') || localStorage.getItem('smarthire_user'))
          : null;
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch (_) {
            setUser(null);
            clearUserSession();
          }
        } else {
          setUser(null);
          clearUserSession();
        }
      }
    } catch (err) {
      const stored = typeof window !== 'undefined'
        ? (sessionStorage.getItem('smarthire_user') || localStorage.getItem('smarthire_user'))
        : null;
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (_) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const emailParam = params.get('email');
        const roleParam = params.get('role');
        const nameParam = params.get('name');
        const oauthSuccess = params.get('oauth') === 'success' || params.get('oauth_success') === 'true';

        if (oauthSuccess && emailParam) {
          const u = {
            email: emailParam.trim().toLowerCase(),
            role: (roleParam || 'USER').toUpperCase(),
            fullName: nameParam ? decodeURIComponent(nameParam) : emailParam.split('@')[0],
          };
          setUser(u);
          saveUserSession(u);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (_) {}
    }
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
        fetchCurrentUser,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
