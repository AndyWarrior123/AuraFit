import { motion } from 'framer-motion'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { Zap, Shield, Flame, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/client'
import { apiClient } from '../api/client'
import { useAuthStore } from '../auth/useAuthStore'
import type { UserRead } from '../api/types'
import { useState } from 'react'

const FLOATING_ICONS = [
  { icon: '⚔️', x: '10%', y: '20%', delay: 0 },
  { icon: '🏹', x: '85%', y: '15%', delay: 0.5 },
  { icon: '🛡️', x: '75%', y: '70%', delay: 1 },
  { icon: '✨', x: '15%', y: '75%', delay: 0.8 },
  { icon: '🔥', x: '50%', y: '85%', delay: 0.3 },
  { icon: '💎', x: '90%', y: '45%', delay: 1.2 },
]

const FEATURES = [
  { icon: Zap, text: 'XP for every rep', color: '#06b6d4' },
  { icon: Flame, text: 'Daily streak rewards', color: '#f97316' },
  { icon: Shield, text: 'RPG character stats', color: '#a855f7' },
  { icon: Star, text: 'Voice-powered logging', color: '#f59e0b' },
]

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore(s => s.login)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCredential(credentialResponse: CredentialResponse) {
    if (!credentialResponse.credential) return
    setLoading(true)
    setError('')
    try {
      const { data: tokens } = await authApi.loginWithGoogle(credentialResponse.credential)
      const { data: user } = await apiClient.get<UserRead>('/auth/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      login(tokens.access_token, tokens.refresh_token, user)
      navigate(user.profile_complete ? '/dashboard' : '/onboarding')
    } catch {
      setError('Sign-in failed. Make sure the backend is running and Google credentials are configured.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(124, 58, 237, 0.2) 0%, #080818 60%)' }}
    >
      {/* Floating background icons */}
      {FLOATING_ICONS.map(({ icon, x, y, delay }) => (
        <motion.div
          key={icon}
          className="absolute text-3xl select-none pointer-events-none opacity-10"
          style={{ left: x, top: y }}
          animate={{ y: [0, -12, 0], rotate: [-3, 3, -3] }}
          transition={{ duration: 4 + delay, delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          {icon}
        </motion.div>
      ))}

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(168, 85, 247, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 85, 247, 0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Center card */}
      <motion.div
        className="relative w-full max-w-sm mx-4"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Glow behind card */}
        <div
          className="absolute inset-0 rounded-3xl blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(124, 58, 237, 0.3) 0%, transparent 70%)' }}
        />

        <div
          className="relative rounded-2xl p-8 space-y-8"
          style={{
            background: 'linear-gradient(135deg, rgba(18, 18, 45, 0.95), rgba(12, 12, 30, 0.98))',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 80px rgba(124, 58, 237, 0.15)',
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <motion.div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                boxShadow: '0 0 40px rgba(124, 58, 237, 0.5)',
              }}
              animate={{ boxShadow: ['0 0 30px rgba(124, 58, 237, 0.4)', '0 0 60px rgba(124, 58, 237, 0.7)', '0 0 30px rgba(124, 58, 237, 0.4)'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Zap size={32} color="white" />
            </motion.div>

            <div className="text-center">
              <h1
                className="text-3xl font-black tracking-tight"
                style={{ fontFamily: 'Orbitron, system-ui', color: 'white' }}
              >
                AURA<span className="shimmer-text">FIT</span>
              </h1>
              <p className="text-slate-400 text-sm mt-1">Level up your real life</p>
            </div>
          </div>

          {/* Feature list */}
          <div className="grid grid-cols-2 gap-2.5">
            {FEATURES.map(({ icon: Icon, text, color }) => (
              <div
                key={text}
                className="flex items-center gap-2 p-2.5 rounded-xl"
                style={{ background: `${color}0d`, border: `1px solid ${color}22` }}
              >
                <Icon size={14} style={{ color }} />
                <span className="text-xs text-slate-300 font-medium">{text}</span>
              </div>
            ))}
          </div>

          {/* Auth */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-4 gap-3 text-slate-400">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Connecting...</span>
              </div>
            ) : (
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleCredential}
                  onError={() => setError('Google sign-in cancelled.')}
                  theme="filled_black"
                  shape="rectangular"
                  size="large"
                  text="continue_with"
                  width={280}
                />
              </div>
            )}

            {error && (
              <motion.p
                className="text-xs text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-xl p-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {error}
              </motion.p>
            )}
          </div>

          <p className="text-xs text-slate-600 text-center">
            By signing in you agree to our Terms of Service
          </p>
        </div>
      </motion.div>
    </div>
  )
}
