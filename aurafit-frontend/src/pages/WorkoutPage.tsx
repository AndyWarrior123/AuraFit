import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Mic, PenSquare, Calendar, Zap, Droplets, Moon, Dumbbell } from 'lucide-react'
import toast from 'react-hot-toast'
import { VoiceInput } from '../components/VoiceInput'
import { ActivityCard, ActivityCardSkeleton, EmptyQuestLog } from '../components/ActivityCard'
import { useTodaySummary } from '../hooks/useActivities'
import { useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api/client'
import type { ActivityLogRead, ExerciseType } from '../api/types'
import { EXERCISE_ICONS, getSeason } from '../lib/constants'

type LogMode = 'voice' | 'manual'
type LogCategory = 'exercise' | 'hydration' | 'sleep'

const ALL_EXERCISES: ExerciseType[] = [
  'RUN', 'WALK', 'CYCLE', 'SWIM', 'HIKE', 'LIFT',
  'YOGA', 'PILATES', 'HIIT', 'STRETCH', 'SPORT', 'OTHER',
]

interface FieldSet {
  duration: boolean
  distance: boolean
  heartRate: boolean
  setsReps: boolean
  weight: boolean
}

const FIELD_SETS: Record<ExerciseType, FieldSet> = {
  RUN:     { duration: true,  distance: true,  heartRate: true,  setsReps: false, weight: false },
  WALK:    { duration: true,  distance: true,  heartRate: true,  setsReps: false, weight: false },
  HIKE:    { duration: true,  distance: true,  heartRate: true,  setsReps: false, weight: false },
  CYCLE:   { duration: true,  distance: true,  heartRate: true,  setsReps: false, weight: false },
  SWIM:    { duration: true,  distance: true,  heartRate: false, setsReps: false, weight: false },
  LIFT:    { duration: false, distance: false, heartRate: false, setsReps: true,  weight: true  },
  YOGA:    { duration: true,  distance: false, heartRate: false, setsReps: false, weight: false },
  PILATES: { duration: true,  distance: false, heartRate: false, setsReps: false, weight: false },
  STRETCH: { duration: true,  distance: false, heartRate: false, setsReps: false, weight: false },
  HIIT:    { duration: true,  distance: false, heartRate: true,  setsReps: false, weight: false },
  SPORT:   { duration: true,  distance: false, heartRate: true,  setsReps: false, weight: false },
  OTHER:   { duration: true,  distance: false, heartRate: true,  setsReps: false, weight: false },
}

// Shared post-submit hook (called after each form submit)
function useSubmitActivity(onSuccess: (logged: ActivityLogRead) => void) {
  const qc = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(payload: Record<string, unknown>) {
    setError('')
    setLoading(true)
    const now = new Date()
    const fullPayload = {
      log_date: now.toISOString().split('T')[0],
      logged_at: now.toISOString(),
      source: 'MANUAL',
      ...payload,
    }
    try {
      const { data: logged } = await apiClient.post<ActivityLogRead>('/activities/', fullPayload)
      await apiClient.post('/character/recalculate')
      qc.invalidateQueries({ queryKey: ['activities'] })
      qc.invalidateQueries({ queryKey: ['character'] })
      onSuccess(logged)
    } catch {
      setError('Failed to log activity. Please fill in at least one field.')
    } finally {
      setLoading(false)
    }
  }

  return { submit, loading, error }
}

// ── Exercise Form ─────────────────────────────────────────────────────────────

function ExerciseForm({ onSuccess }: { onSuccess: () => void }) {
  const [exerciseType, setExerciseType] = useState<ExerciseType | ''>('')
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [sets, setSets] = useState('')
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [heartRate, setHeartRate] = useState('')

  const { submit, loading, error } = useSubmitActivity((logged) => {
    const label = logged.exercise_type
      ? logged.exercise_type.charAt(0) + logged.exercise_type.slice(1).toLowerCase()
      : 'Activity'
    toast.success(`+${logged.xp_awarded} XP · ${label}`, {
      icon: '⚡',
      style: { color: '#06b6d4', borderColor: 'rgba(6, 182, 212, 0.3)' },
    })
    setExerciseType('')
    setDuration('')
    setDistance('')
    setSets('')
    setReps('')
    setWeight('')
    setHeartRate('')
    onSuccess()
  })

  const fields = exerciseType ? FIELD_SETS[exerciseType] : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!exerciseType) {
      toast.error('Select an exercise type first')
      return
    }
    await submit({
      exercise_type: exerciseType,
      duration_minutes: fields?.duration && duration ? parseFloat(duration) : null,
      distance_km: fields?.distance && distance ? parseFloat(distance) : null,
      sets_count: fields?.setsReps && sets ? parseInt(sets) : null,
      reps_count: fields?.setsReps && reps ? parseInt(reps) : null,
      weight_lifted_kg: fields?.weight && weight ? parseFloat(weight) : null,
      heart_rate_bpm: fields?.heartRate && heartRate ? parseFloat(heartRate) : null,
      calories_burned: null,
      water_ml: null,
      sleep_duration_minutes: null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type selector */}
      <div>
        <label className="text-xs text-slate-400 mb-2 block">Exercise Type</label>
        <div className="grid grid-cols-4 gap-2">
          {ALL_EXERCISES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setExerciseType(exerciseType === type ? '' : type)}
              className="flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-medium transition-all duration-200"
              style={{
                background: exerciseType === type ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.04)',
                border: exerciseType === type ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(255,255,255,0.08)',
                color: exerciseType === type ? '#c084fc' : '#64748b',
              }}
            >
              <span className="text-lg">{EXERCISE_ICONS[type]}</span>
              <span>{type.charAt(0) + type.slice(1).toLowerCase()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Context-aware fields */}
      <AnimatePresence>
        {fields && (
          <motion.div
            key={exerciseType}
            className="grid grid-cols-2 gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {fields.duration && (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Duration (min)</label>
                <input
                  type="number" min="1" className="input-field"
                  placeholder="30"
                  value={duration} onChange={e => setDuration(e.target.value)}
                />
              </div>
            )}
            {fields.distance && (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  {exerciseType === 'SWIM' ? 'Distance (km)' : 'Distance (km)'}
                </label>
                <input
                  type="number" min="0" step="0.01" className="input-field"
                  placeholder="5.0"
                  value={distance} onChange={e => setDistance(e.target.value)}
                />
              </div>
            )}
            {fields.setsReps && (
              <>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Sets</label>
                  <input
                    type="number" min="1" className="input-field"
                    placeholder="4"
                    value={sets} onChange={e => setSets(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Reps</label>
                  <input
                    type="number" min="1" className="input-field"
                    placeholder="8"
                    value={reps} onChange={e => setReps(e.target.value)}
                  />
                </div>
              </>
            )}
            {fields.weight && (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Weight (kg)</label>
                <input
                  type="number" min="0" step="0.5" className="input-field"
                  placeholder="80"
                  value={weight} onChange={e => setWeight(e.target.value)}
                />
              </div>
            )}
            {fields.heartRate && (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Avg HR (bpm)</label>
                <input
                  type="number" min="40" max="220" className="input-field"
                  placeholder="145"
                  value={heartRate} onChange={e => setHeartRate(e.target.value)}
                />
              </div>
            )}

            {/* Calories note */}
            <div className="col-span-2">
              <p className="text-xs text-slate-600 flex items-center gap-1.5">
                <Zap size={11} className="text-cyan-600" />
                Calories auto-calculated by server
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>
      )}

      <button
        type="submit"
        className="btn-primary w-full flex items-center justify-center gap-2"
        disabled={loading || !exerciseType}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Zap size={16} />
        )}
        {loading ? 'Logging...' : 'Log Exercise'}
      </button>
    </form>
  )
}

// ── Hydration Form ────────────────────────────────────────────────────────────

function HydrationForm({ onSuccess }: { onSuccess: () => void }) {
  const season = getSeason()
  const [waterMl, setWaterMl] = useState(String(season.waterMl))

  const { submit, loading, error } = useSubmitActivity((logged) => {
    toast.success(`+${logged.xp_awarded} XP · ${waterMl}ml water`, {
      icon: '💧',
      style: { color: '#06b6d4', borderColor: 'rgba(6, 182, 212, 0.3)' },
    })
    setWaterMl(String(season.waterMl))
    onSuccess()
  })

  function addWater(ml: number) {
    setWaterMl(v => String(Math.max(0, (parseInt(v) || 0) + ml)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!waterMl || parseInt(waterMl) <= 0) {
      toast.error('Enter water amount')
      return
    }
    await submit({ water_ml: parseInt(waterMl), exercise_type: null, sleep_duration_minutes: null })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div
        className="rounded-xl p-3 flex items-center gap-2 text-xs"
        style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.2)' }}
      >
        <span>🌏</span>
        <span className="text-cyan-400 font-medium">{season.label} default</span>
        <span className="text-slate-500">— {(season.waterMl / 1000).toFixed(1)}L / day goal</span>
      </div>

      <div>
        <label className="text-xs text-slate-400 mb-1 block">Water (ml)</label>
        <input
          type="number" min="0" step="50" className="input-field"
          placeholder={String(season.waterMl)}
          value={waterMl} onChange={e => setWaterMl(e.target.value)}
        />
      </div>

      {/* Quick-add buttons */}
      <div>
        <label className="text-xs text-slate-400 mb-2 block">Quick add</label>
        <div className="grid grid-cols-4 gap-2">
          {[250, 500, 750, 1000].map(ml => (
            <button
              key={ml}
              type="button"
              onClick={() => addWater(ml)}
              className="py-2 rounded-xl text-xs font-medium text-cyan-400 transition-all duration-200"
              style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.2)' }}
            >
              +{ml}ml
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>
      )}

      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all duration-200"
        style={{
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.6), rgba(6, 182, 212, 0.4))',
          boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)',
          border: '1px solid rgba(6, 182, 212, 0.4)',
        }}
        disabled={loading}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Droplets size={16} />
        )}
        {loading ? 'Logging...' : 'Log Hydration'}
      </button>
    </form>
  )
}

// ── Sleep Form ────────────────────────────────────────────────────────────────

function SleepForm({ onSuccess }: { onSuccess: () => void }) {
  const season = getSeason()
  const defaultHours = (season.sleepMin / 60).toFixed(1)
  const [hours, setHours] = useState(defaultHours)
  const [quality, setQuality] = useState('7')

  const { submit, loading, error } = useSubmitActivity((logged) => {
    toast.success(`+${logged.xp_awarded} XP · ${hours}h sleep`, {
      icon: '😴',
      style: { color: '#a855f7', borderColor: 'rgba(168, 85, 247, 0.3)' },
    })
    setHours(defaultHours)
    setQuality('7')
    onSuccess()
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const h = parseFloat(hours)
    if (!h || h <= 0) {
      toast.error('Enter sleep duration')
      return
    }
    await submit({
      sleep_duration_minutes: Math.round(h * 60),
      sleep_quality_score: quality ? parseInt(quality) : null,
      exercise_type: null,
      water_ml: null,
    })
  }

  const qualityLabel = ['', 'Terrible', 'Bad', 'Poor', 'Below avg', 'Average', 'Decent', 'Good', 'Great', 'Excellent', 'Perfect'][parseInt(quality) || 0]

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div
        className="rounded-xl p-3 flex items-center gap-2 text-xs"
        style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)' }}
      >
        <span>🌏</span>
        <span className="text-purple-400 font-medium">{season.label} default</span>
        <span className="text-slate-500">— {(season.sleepMin / 60).toFixed(1)}h goal</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Duration (hours)</label>
          <input
            type="number" min="0" max="24" step="0.25" className="input-field"
            placeholder={defaultHours}
            value={hours} onChange={e => setHours(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 flex items-center justify-between">
            <span>Quality (1–10)</span>
            {quality && <span className="text-purple-400">{qualityLabel}</span>}
          </label>
          <input
            type="number" min="1" max="10" className="input-field"
            placeholder="7"
            value={quality} onChange={e => setQuality(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>
      )}

      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all duration-200"
        style={{
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.6), rgba(168, 85, 247, 0.4))',
          boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)',
          border: '1px solid rgba(168, 85, 247, 0.4)',
        }}
        disabled={loading}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Moon size={16} />
        )}
        {loading ? 'Logging...' : 'Log Sleep'}
      </button>
    </form>
  )
}

// ── Manual Entry (tabs: exercise / hydration / sleep) ─────────────────────────

function ManualEntry({ onSuccess }: { onSuccess: () => void }) {
  const [category, setCategory] = useState<LogCategory>('exercise')

  function handleChildSuccess() {
    setCategory('exercise')
    onSuccess()
  }

  const tabs: { id: LogCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'exercise', label: 'Exercise', icon: <Dumbbell size={13} /> },
    { id: 'hydration', label: 'Hydration', icon: <Droplets size={13} /> },
    { id: 'sleep', label: 'Sleep', icon: <Moon size={13} /> },
  ]

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div
        className="flex rounded-xl p-1 gap-1"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCategory(tab.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all duration-200"
            style={{
              background: category === tab.id ? 'rgba(255,255,255,0.07)' : 'transparent',
              color: category === tab.id ? 'white' : '#64748b',
              border: category === tab.id ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={category}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {category === 'exercise' && <ExerciseForm onSuccess={handleChildSuccess} />}
          {category === 'hydration' && <HydrationForm onSuccess={handleChildSuccess} />}
          {category === 'sleep' && <SleepForm onSuccess={handleChildSuccess} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function WorkoutPage() {
  const [mode, setMode] = useState<LogMode>('voice')
  const { data: today, isLoading } = useTodaySummary()

  return (
    <div className="min-h-screen p-4 md:p-6 pb-24 md:pb-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="neon-text-purple">⚔️</span> Log Workout
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Every activity earns XP and levels your attributes</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Log panel */}
        <div className="space-y-4">
          {/* Voice / Manual toggle */}
          <div
            className="flex rounded-xl p-1"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {(['voice', 'manual'] as LogMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  background: mode === m ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.6), rgba(168, 85, 247, 0.4))' : 'transparent',
                  color: mode === m ? 'white' : '#64748b',
                  border: mode === m ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid transparent',
                }}
              >
                {m === 'voice' ? <Mic size={15} /> : <PenSquare size={15} />}
                {m === 'voice' ? 'Voice' : 'Manual'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {mode === 'voice' ? (
              <motion.div
                key="voice"
                className="glow-card rounded-2xl p-8 flex flex-col items-center gap-6"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
              >
                <div className="text-center">
                  <h2 className="text-base font-semibold text-white">AI Voice Logger</h2>
                  <p className="text-xs text-slate-500 mt-1">Powered by Gemini — just describe your workout</p>
                </div>
                <VoiceInput size="lg" onSuccess={() => {}} />
                <div
                  className="w-full rounded-xl p-3 text-xs text-slate-500 text-center"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  Try: <span className="text-cyan-400">"I lifted 80kg for 4 sets of 8 reps"</span>{' '}
                  or <span className="text-purple-400">"Ran 5km in 28 minutes this morning"</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="manual"
                className="glow-card rounded-2xl p-5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Manual Entry
                </h2>
                <ManualEntry onSuccess={() => {}} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Today's log */}
        <div className="glow-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={14} /> Today's Log
            </h2>
            {today && <span className="xp-badge">+{today.xp_earned_today} XP</span>}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <ActivityCardSkeleton key={i} />)}
            </div>
          ) : today?.logs.length ? (
            <AnimatePresence>
              <div className="space-y-2">
                {today.logs.map((a, i) => (
                  <ActivityCard key={a.id} activity={a} index={i} />
                ))}
              </div>
            </AnimatePresence>
          ) : (
            <EmptyQuestLog />
          )}
        </div>
      </div>
    </div>
  )
}
