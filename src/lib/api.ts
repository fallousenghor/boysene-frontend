import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'

function normalizeBaseUrl(url?: string) {
  if (!url) return '/api/v1'
  // remove trailing slash
  return url.replace(/\/+$/, '')
}

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL ||
  (import.meta as any).env?.BASE_API_URL ||
  '/api/v1'

export const api = axios.create({
  baseURL: normalizeBaseUrl(API_BASE_URL),
  headers: { 'Content-Type': 'application/json' },
})



api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res.data?.data !== undefined ? { ...res, data: res.data } : res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = useAuthStore.getState().refreshToken
        if (!refreshToken) throw new Error('No refresh token')
        const res = await axios.post('/api/v1/auth/refresh', { refreshToken })
        const { accessToken, refreshToken: newRefresh } = res.data.data || res.data
        useAuthStore.getState().setTokens(accessToken, newRefresh)
        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Helpers to read the backend response envelope consistently.
export function extractData<T>(value: any): T {
  return value?.data?.data ?? value?.data ?? value
}

export function extractList<T>(value: any): T[] {
  const data = extractData<any>(value)
  return Array.isArray(data) ? data : []
}

export function extractMeta(value: any) {
  return value?.data?.meta ?? value?.meta ?? {}
}

export function extractSummary(value: any) {
  return value?.data?.summary ?? value?.summary ?? {}
}
