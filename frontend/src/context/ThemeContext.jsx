import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('smarthire-theme') || 'light';
  });

  const applyThemeToDOM = (newTheme) => {
    document.documentElement.setAttribute('data-theme', newTheme);
    document.documentElement.style.colorScheme = newTheme;
    localStorage.setItem('smarthire-theme', newTheme);
  };

  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  const setTheme = (newTheme, syncWithBackend = true) => {
    const validTheme = newTheme === 'dark' ? 'dark' : 'light';
    setThemeState(validTheme);
    applyThemeToDOM(validTheme);

    if (syncWithBackend) {
      api.post('/settings/theme', { theme: validTheme }).catch(() => {});
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme, true);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
