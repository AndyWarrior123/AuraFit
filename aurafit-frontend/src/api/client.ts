import axios, { type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../auth/useAuthStore'
import type { TokenResponse } from './types'

const BASE_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`

export const apiClient = axios.create({ baseURL: BASE_URL })

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

function drainQueue(token: string) {
  refreshQueue.forEach(cb => cb(token))
  refreshQueue = []
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }
    original._retry = true

    const { refreshToken, setAccessToken, logout } = useAuthStore.getState()
    if (!refreshToken) {
      logout()
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise(resolve => {
        refreshQueue.push(token => {
          original.headers.Authorization = `Bearer ${token}`
          resolve(apiClient(original))
        })
      })
    }

    isRefreshing = true
    try {
      const { data } = await axios.post<TokenResponse>(`${BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      })
      setAccessToken(data.access_token)
      drainQueue(data.access_token)
      original.headers.Authorization = `Bearer ${data.access_token}`
      return apiClient(original)
    } catch {
      logout()
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  }
)

export const authApi = {
  loginWithGoogle: (idToken: string) =>
    apiClient.post<TokenResponse>('/auth/google', { id_token: idToken, client_type: 'web' }),
}
