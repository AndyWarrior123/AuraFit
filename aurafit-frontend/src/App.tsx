import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'

import { useAuthStore } from './auth/useAuthStore'
import { apiClient } from './api/client'
import type { UserRead } from './api/types'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { DashboardPage } from './pages/DashboardPage'
import { WorkoutPage } from './pages/WorkoutPage'
import { HistoryPage } from './pages/HistoryPage'
import { ProfilePage } from './pages/ProfilePage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

function PrivateRoute({ element }: { element: React.ReactNode }) {
  const { accessToken, user } = useAuthStore()
  if (!accessToken) return <Navigate to="/login" replace />
  if (user && !user.profile_complete) return <Navigate to="/onboarding" replace />
  return <>{element}</>
}

function OnboardingRoute({ element }: { element: React.ReactNode }) {
  const { accessToken } = useAuthStore()
  if (!accessToken) return <Navigate to="/login" replace />
  return <>{element}</>
}

function PublicRoute({ element }: { element: React.ReactNode }) {
  const { accessToken, user } = useAuthStore()
  if (accessToken && user?.profile_complete) return <Navigate to="/dashboard" replace />
  if (accessToken && !user?.profile_complete) return <Navigate to="/onboarding" replace />
  return <>{element}</>
}

function AppBootstrap() {
  const { accessToken, setUser } = useAuthStore()

  // Re-fetch the current user on every app load so avatar_url and profile
  // data are always fresh — never stale from a previous localStorage snapshot.
  useEffect(() => {
    if (!accessToken) return
    apiClient.get<UserRead>('/auth/me')
      .then(({ data }) => {
        // Never overwrite a cached avatar_url with null from the server —
        // the JWT-sourced URL stored at login time is more reliable.
        const cached = useAuthStore.getState().user?.avatar_url
        setUser({ ...data, avatar_url: data.avatar_url ?? cached ?? null })
      })
      .catch(() => {/* 401 interceptor handles token expiry + logout */})
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

export function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <AppBootstrap />
        <BrowserRouter>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/login"      element={<PublicRoute element={<LoginPage />} />} />
              <Route path="/onboarding" element={<OnboardingRoute element={<OnboardingPage />} />} />
              <Route element={<PrivateRoute element={<Layout />} />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/workout"   element={<WorkoutPage />} />
                <Route path="/history"   element={<HistoryPage />} />
                <Route path="/profile"   element={<ProfilePage />} />
              </Route>
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </AnimatePresence>
        </BrowserRouter>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  )
}
