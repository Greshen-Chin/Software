import axios from 'axios';

const fallbackBaseUrl =
  typeof window !== 'undefined'
    ? window.location.origin.replace(/:\d+$/, ':3000')
    : 'http://localhost:3000';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || fallbackBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
