import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'

import { useAuthStore } from './auth/useAuthStore'
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

export function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
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
