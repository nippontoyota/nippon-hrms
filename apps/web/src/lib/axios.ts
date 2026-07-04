import axios from 'axios';
import { refreshAccessToken } from '@/lib/authRefresh';
import { useAuthStore } from '@/stores/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://nippon-hrms.onrender.com/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  
  const vaultData = localStorage.getItem('vault-storage');
  if (vaultData) {
    try {
      const parsed = JSON.parse(vaultData);
      const state = parsed?.state;
      if (state?.vaultToken) {
        // Enforce 30-minute auto-lock timeout at the API level
        if (state.unlockedAt && Date.now() - state.unlockedAt > 30 * 60 * 1000) {
          // Token expired, do not attach
        } else {
          config.headers['X-Vault-Token'] = state.vaultToken;
        }
      }
    } catch(e) {}
  }

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    if (res.config.responseType === 'blob' || res.config.responseType === 'arraybuffer') {
      return res;
    }
    if (res.data && typeof res.data === 'object' && 'success' in res.data && 'data' in res.data) {
      res.data = res.data.data;
    }
    return res;
  },
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
      useAuthStore.getState().clearAuth();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export default api;

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
  }
}
