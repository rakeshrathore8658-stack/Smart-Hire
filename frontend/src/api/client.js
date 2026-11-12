import axios from 'axios';

// In production (Vercel), VITE_API_BASE_URL points to Render backend (e.g. https://smarthire.onrender.com)
// In local development, defaults to '/api' which Vite proxies to http://localhost:8080
const getBaseURL = () => {
  const rawBase = import.meta.env.VITE_API_BASE_URL;
  if (!rawBase || !rawBase.trim()) {
    return '/api';
  }
  const clean = rawBase.trim().replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('smarthire:loading-start'));
    }

    // Attach JWT token if present in localStorage or sessionStorage
    let token = null;
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('token') || sessionStorage.getItem('token')
        || localStorage.getItem('smarthire_token') || sessionStorage.getItem('smarthire_token');
    }
    if (token && token.trim()) {
      config.headers['Authorization'] = `Bearer ${token.trim()}`;
    }

    // Attach user email header for session fallback compatibility
    let email = null;
    if (typeof window !== 'undefined') {
      email = sessionStorage.getItem('smarthire_user_email') || localStorage.getItem('smarthire_user_email');
      if (!email) {
        const stored = sessionStorage.getItem('smarthire_user') || localStorage.getItem('smarthire_user');
        if (stored) {
          try {
            const u = JSON.parse(stored);
            if (u?.email) email = u.email;
          } catch (_) {}
        }
      }
    }
    if (email && email.trim()) {
      config.headers['X-User-Email'] = email.trim().toLowerCase();
    }
  } catch (_) {}
  return config;
}, (error) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('smarthire:loading-end'));
  }
  return Promise.reject(error);
});

api.interceptors.response.use((response) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('smarthire:loading-end'));
  }
  return response;
}, (error) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('smarthire:loading-end'));
  }
  return Promise.reject(error);
});

export default api;
