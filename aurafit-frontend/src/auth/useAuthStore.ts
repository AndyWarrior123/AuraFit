import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRead } from '../api/types'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: UserRead | null
  login: (accessToken: string, refreshToken: string, user: UserRead) => void
  logout: () => void
  setAccessToken: (token: string) => void
  setUser: (user: UserRead) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,

      login: (accessToken, refreshToken, user) =>
        set({ accessToken, refreshToken, user }),

      logout: () =>
        set({ accessToken: null, refreshToken: null, user: null }),

      setAccessToken: (accessToken) =>
        set({ accessToken }),

      setUser: (user) =>
        set({ user }),
    }),
    {
      name: 'aurafit-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
)
