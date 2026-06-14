import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Mic, PenSquare, Calendar, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { VoiceInput } from '../components/VoiceInput'
import { ActivityCard, ActivityCardSkeleton, EmptyQuestLog } from '../components/ActivityCard'
import { useTodaySummary } from '../hooks/useActivities'
import { useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api/client'
import type { ActivityLogRead, ExerciseType } from '../api/types'
import { EXERCISE_ICONS } from '../lib/constants'

type LogMode = 'voice' | 'manual'

const QUICK_EXERCISES: ExerciseType[] = ['RUN', 'WALK', 'LIFT', 'CYCLE', 'SWIM', 'HIIT', 'YOGA', 'STRETCH']

function ManualForm({ onSuccess }: { onSuccess: () => void }) {
  const qc = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    exercise_type: '' as ExerciseType | '',
    duration_minutes: '',
    distance_km: '',
    reps_count: '',
    sets_count: '',
    weight_lifted_kg: '',
    calories_burned: '',
    water_ml: '',
    sleep_duration_minutes: '',
  })

  function setField(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const now = new Date()
    const payload = {
      log_date: now.toISOString().split('T')[0],
      logged_at: now.toISOString(),
      source: 'MANUAL',
      exercise_type: form.exercise_type || null,
      duration_minutes: form.duration_minutes ? parseFloat(form.duration_minutes) : null,
      distance_km: form.distance_km ? parseFloat(form.distance_km) : null,
      reps_count: form.reps_count ? parseInt(form.reps_count) : null,
      sets_count: form.sets_count ? parseInt(form.sets_count) : null,
      weight_lifted_kg: form.weight_lifted_kg ? parseFloat(form.weight_lifted_kg) : null,
      calories_burned: form.calories_burned ? parseInt(form.calories_burned) : null,
      water_ml: form.water_ml ? parseInt(form.water_ml) : null,
      sleep_duration_minutes: form.sleep_duration_minutes ? parseInt(form.sleep_duration_minutes) : null,
    }
    try {
      const { data: logged } = await apiClient.post<ActivityLogRead>('/activities/', payload)
      await apiClient.post('/character/recalculate')
      qc.invalidateQueries({ queryKey: ['activities'] })
      qc.invalidateQueries({ queryKey: ['character'] })
      toast.success(`+${logged.xp_awarded} XP · ${logged.exercise_type ? logged.exercise_type.charAt(0) + logged.exercise_type.slice(1).toLowerCase() : 'Activity'}`, {
        icon: '⚡',
        style: { color: '#06b6d4', borderColor: 'rgba(6, 182, 212, 0.3)' },
      })
      onSuccess()
    } catch {
      setError('Failed to log activity. Make sure at least one field is filled.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Exercise type */}
      <div>
        <label className="text-xs text-slate-400 mb-2 block">Exercise Type</label>
        <div className="grid grid-cols-4 gap-2">
          {QUICK_EXERCISES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setField('exercise_type', form.exercise_type === type ? '' : type)}
              className="flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-medium transition-all duration-200"
              style={{
                background: form.exercise_type === type ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.04)',
                border: form.exercise_type === type ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(255,255,255,0.08)',
                color: form.exercise_type === type ? '#c084fc' : '#64748b',
              }}
            >
              <span className="text-lg">{EXERCISE_ICONS[type]}</span>
              <span>{type.charAt(0) + type.slice(1).toLowerCase()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Duration (min)</label>
          <input type="number" className="input-field" placeholder="30" value={form.duration_minutes} onChange={e => setField('duration_minutes', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Distance (km)</label>
          <input type="number" step="0.1" className="input-field" placeholder="5.0" value={form.distance_km} onChange={e => setField('distance_km', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Sets × Reps</label>
          <div className="flex gap-2">
            <input type="number" className="input-field" placeholder="Sets" value={form.sets_count} onChange={e => setField('sets_count', e.target.value)} />
            <input type="number" className="input-field" placeholder="Reps" value={form.reps_count} onChange={e => setField('reps_count', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Calories burned</label>
          <input type="number" className="input-field" placeholder="250" value={form.calories_burned} onChange={e => setField('calories_burned', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Water (ml)</label>
          <input type="number" className="input-field" placeholder="500" value={form.water_ml} onChange={e => setField('water_ml', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Sleep (min)</label>
          <input type="number" className="input-field" placeholder="480" value={form.sleep_duration_minutes} onChange={e => setField('sleep_duration_minutes', e.target.value)} />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>
      )}

      <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
        {loading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Zap size={16} />
        )}
        {loading ? 'Logging...' : 'Log Activity'}
      </button>
    </form>
  )
}

export function WorkoutPage() {
  const [mode, setMode] = useState<LogMode>('voice')
  const [successMsg, setSuccessMsg] = useState('')
  const { data: today, isLoading } = useTodaySummary()

  function handleSuccess() {
    setSuccessMsg('Activity logged! XP earned.')
    setTimeout(() => setSuccessMsg(''), 3000)
  }

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
          {/* Mode switcher */}
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
            {successMsg && (
              <motion.div
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-cyan-300"
                style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)' }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <Zap size={14} /> {successMsg}
              </motion.div>
            )}
          </AnimatePresence>

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
                <VoiceInput size="lg" onSuccess={handleSuccess} />
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
                <ManualForm onSuccess={handleSuccess} />
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

