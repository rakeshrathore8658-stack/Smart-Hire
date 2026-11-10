import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import { useTheme } from './ThemeContext';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setTheme } = useTheme();

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data && response.data.authenticated && response.data.user) {
        const u = response.data.user;
        setUser(u);
        if (u.themePreference) {
          setTheme(u.themePreference, false);
        }
      } else {
        setUser(null);
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
      if (u.themePreference) {
        setTheme(u.themePreference, false);
      }
      return response.data;
    }
    throw new Error(response.data?.message || 'Registration failed');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {}
    setUser(null);
  };

  const updateUser = (updatedData) => {
    setUser((prev) => (prev ? { ...prev, ...updatedData } : null));
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
