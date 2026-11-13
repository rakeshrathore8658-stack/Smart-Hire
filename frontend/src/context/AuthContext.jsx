import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import { useTheme } from './ThemeContext';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setTheme } = useTheme();

  const saveUserSession = (u, token) => {
    if (u && u.email) {
      const email = u.email.trim().toLowerCase();
      try {
        const prevEmail = sessionStorage.getItem('smarthire_user_email') || localStorage.getItem('smarthire_user_email');
        if (prevEmail && prevEmail.trim().toLowerCase() !== email) {
          clearUserSession();
        }
        sessionStorage.setItem('smarthire_user_email', email);
        sessionStorage.setItem('smarthire_user', JSON.stringify(u));
        sessionStorage.setItem('smarthire_user_role', u.role || 'USER');
        localStorage.setItem('smarthire_user_email', email);
        localStorage.setItem('smarthire_user', JSON.stringify(u));
        localStorage.setItem('smarthire_user_role', u.role || 'USER');
        if (token && typeof token === 'string' && token.trim()) {
          sessionStorage.setItem('token', token.trim());
          sessionStorage.setItem('smarthire_token', token.trim());
          localStorage.setItem('token', token.trim());
          localStorage.setItem('smarthire_token', token.trim());
        }
      } catch (_) {}
    }
  };

  const clearUserSession = () => {
    try {
      sessionStorage.removeItem('smarthire_user_email');
      sessionStorage.removeItem('smarthire_user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('smarthire_token');
      localStorage.removeItem('smarthire_user_email');
      localStorage.removeItem('smarthire_user');
      localStorage.removeItem('token');
      localStorage.removeItem('smarthire_token');
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
        const tokenParam = params.get('token') || params.get('access_token');
        const oauthSuccess = params.get('oauth') === 'success' || params.get('oauth_success') === 'true';
        const isNewUser = params.get('new_user') === 'true' || params.get('first_time') === 'true';

        if (tokenParam && tokenParam.trim()) {
          try {
            sessionStorage.setItem('token', tokenParam.trim());
            sessionStorage.setItem('smarthire_token', tokenParam.trim());
            localStorage.setItem('token', tokenParam.trim());
            localStorage.setItem('smarthire_token', tokenParam.trim());
          } catch (_) {}
        }

        if (isNewUser) {
          try {
            sessionStorage.setItem('smarthire_first_login', 'true');
          } catch (_) {}
        }

        if (oauthSuccess && emailParam) {
          const u = {
            email: emailParam.trim().toLowerCase(),
            role: (roleParam || 'USER').toUpperCase(),
            fullName: nameParam ? decodeURIComponent(nameParam) : emailParam.split('@')[0],
          };
          setUser(u);
          saveUserSession(u, tokenParam);
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
      const token = response.data.token;
      setUser(u);
      saveUserSession(u, token);
      try {
        sessionStorage.removeItem('smarthire_first_login');
      } catch (_) {}
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
      const token = response.data.token;
      setUser(u);
      saveUserSession(u, token);
      try {
        sessionStorage.setItem('smarthire_first_login', 'true');
      } catch (_) {}
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
      const token = response.data.token;
      setUser(u);
      saveUserSession(u, token);
      try {
        if (response.data.isNewUser) {
          sessionStorage.setItem('smarthire_first_login', 'true');
        } else {
          sessionStorage.removeItem('smarthire_first_login');
        }
      } catch (_) {}
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
