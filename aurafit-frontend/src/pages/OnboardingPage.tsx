import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Zap, User, Ruler, Weight, Calendar } from 'lucide-react'
import { useSetupProfile } from '../hooks/useProfile'
import { useAuthStore } from '../auth/useAuthStore'
import type { Gender, ProfileSetupRequest } from '../api/types'

const STEPS = [
  { id: 'name',   label: 'Your Name',   icon: User },
  { id: 'body',   label: 'Your Stats',  icon: Ruler },
  { id: 'age',    label: 'Age',         icon: Calendar },
  { id: 'gender', label: 'Gender',      icon: User },
]

export function OnboardingPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const setupMutation = useSetupProfile()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Partial<ProfileSetupRequest>>({
    display_name: user?.display_name ?? '',
    height_cm: undefined,
    weight_kg: undefined,
    age_years: undefined,
    gender: undefined,
  })
  const [error, setError] = useState('')

  function set<K extends keyof ProfileSetupRequest>(key: K, value: ProfileSetupRequest[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setError('')
  }

  function canAdvance(): boolean {
    if (step === 0) return !!form.display_name?.trim()
    if (step === 1) return !!form.height_cm && !!form.weight_kg
    if (step === 2) return !!form.age_years
    if (step === 3) return !!form.gender
    return false
  }

  async function handleFinish() {
    try {
      await setupMutation.mutateAsync(form as ProfileSetupRequest)
      navigate('/dashboard')
    } catch {
      setError('Failed to save profile. Check your inputs and try again.')
    }
  }

  const isLast = step === STEPS.length - 1

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(124, 58, 237, 0.15) 0%, #080818 60%)' }}
    >
      {/* Progress bar */}
      <div className="w-full max-w-md mb-8">
        <div className="flex justify-between mb-3">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                style={{
                  background: i <= step ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'rgba(255,255,255,0.06)',
                  border: i === step ? '2px solid rgba(168, 85, 247, 0.6)' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: i === step ? '0 0 15px rgba(168, 85, 247, 0.4)' : 'none',
                  color: i <= step ? 'white' : '#64748b',
                }}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span className="text-xs text-slate-500 hidden sm:block">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #7c3aed, #06b6d4)' }}
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(18, 18, 45, 0.95), rgba(12, 12, 30, 0.98))',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Zap logo */}
        <div className="flex justify-center mb-6">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)' }}
          >
            <Zap size={24} color="white" />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-white">What's your hero name?</h2>
                  <p className="text-sm text-slate-400 mt-1">This is how you'll appear on your character sheet</p>
                </div>
                <input
                  className="input-field"
                  placeholder="Enter your display name"
                  value={form.display_name ?? ''}
                  onChange={e => set('display_name', e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Your physical stats</h2>
                  <p className="text-sm text-slate-400 mt-1">Used to calculate BMR and activity XP</p>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                    <Ruler size={12} /> Height (cm)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 175"
                    value={form.height_cm ?? ''}
                    onChange={e => set('height_cm', parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                    <Weight size={12} /> Weight (kg)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 70"
                    value={form.weight_kg ?? ''}
                    onChange={e => set('weight_kg', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-white">How old are you?</h2>
                  <p className="text-sm text-slate-400 mt-1">Age affects your BMR calculation</p>
                </div>
                <input
                  type="number"
                  className="input-field"
                  placeholder="e.g. 25"
                  value={form.age_years ?? ''}
                  onChange={e => set('age_years', parseInt(e.target.value))}
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Your gender</h2>
                  <p className="text-sm text-slate-400 mt-1">Used for accurate BMR estimation</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(['MALE', 'FEMALE', 'OTHER'] as Gender[]).map(g => (
                    <button
                      key={g}
                      onClick={() => set('gender', g)}
                      className="py-3 rounded-xl text-sm font-medium transition-all duration-200"
                      style={{
                        background: form.gender === g ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255,255,255,0.04)',
                        border: form.gender === g ? '2px solid rgba(168, 85, 247, 0.6)' : '1px solid rgba(255,255,255,0.1)',
                        color: form.gender === g ? '#c084fc' : '#94a3b8',
                        boxShadow: form.gender === g ? '0 0 15px rgba(168, 85, 247, 0.2)' : 'none',
                      }}
                    >
                      {g === 'MALE' ? '♂ Male' : g === 'FEMALE' ? '♀ Female' : '⚧ Other'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <motion.p
            className="mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {error}
          </motion.p>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              className="btn-secondary flex items-center gap-2"
              onClick={() => setStep(s => s - 1)}
            >
              <ChevronLeft size={16} /> Back
            </button>
          )}
          <button
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            onClick={isLast ? handleFinish : () => setStep(s => s + 1)}
            disabled={!canAdvance() || setupMutation.isPending}
          >
            {setupMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : isLast ? (
              <>Start Journey <Zap size={16} /></>
            ) : (
              <>Next <ChevronRight size={16} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
