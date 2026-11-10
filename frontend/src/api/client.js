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

export default api;
