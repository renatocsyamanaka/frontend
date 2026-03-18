import axios from 'axios';

const RAW_API_URL = import.meta.env.VITE_API_URL?.trim();

function normalizeBaseUrl(url?: string) {
  if (!url) return '';
  return url.replace(/\/+$/, '');
}

if (!RAW_API_URL) {
  throw new Error('VITE_API_URL não definida no arquivo .env');
}

export const API_URL = normalizeBaseUrl(RAW_API_URL);

export const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
});

function getToken() {
  return localStorage.getItem('token');
}

api.interceptors.request.use(
  (config) => {
    const token = getToken();

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = token.startsWith('Bearer ')
        ? token
        : `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('token');

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);