import axios from 'axios'

const RAW_API_URL = import.meta.env.VITE_API_URL
if (!RAW_API_URL) {
  console.error('VITE_API_URL não definida no .env')
}

function normalizeBaseUrl(url?: string) {
  if (!url) return ''
  return url.replace(/\/+$/, '')
}

export const API_URL = normalizeBaseUrl(RAW_API_URL) || 'http://localhost:3000/api'
console.log('[API_URL]', API_URL)

export const api = axios.create({
  baseURL: API_URL,
  timeout: 60000, // ↑ 60s para diagnosticar sem cortar cedo
})

function getToken() {
  return localStorage.getItem('token')
}

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('token')
      if (location.pathname !== '/login') location.href = '/login'
    }
    return Promise.reject(err)
  }
)
