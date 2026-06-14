import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Zap } from 'lucide-react'
import { useState } from 'react'
import type { ActivityLogRead } from '../api/types'
import { EXERCISE_ICONS } from '../lib/constants'
import { useDeleteActivity } from '../hooks/useActivities'

interface ActivityCardProps {
  activity: ActivityLogRead
  index?: number
}

function formatDetail(activity: ActivityLogRead): string {
  const parts: string[] = []
  if (activity.duration_minutes) parts.push(`${Math.round(activity.duration_minutes)}m`)
  if (activity.distance_km) parts.push(`${activity.distance_km.toFixed(1)}km`)
  if (activity.reps_count) {
    parts.push(activity.sets_count ? `${activity.sets_count}×${activity.reps_count}` : `${activity.reps_count} reps`)
  }
  if (activity.calories_burned) parts.push(`${activity.calories_burned} kcal`)
  if (activity.water_ml) parts.push(`${activity.water_ml}ml water`)
  if (activity.sleep_duration_minutes) parts.push(`${Math.round(activity.sleep_duration_minutes / 60 * 10) / 10}h sleep`)
  if (activity.steps_count) parts.push(`${activity.steps_count.toLocaleString()} steps`)
  return parts.join(' · ') || 'Logged'
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function ActivityCard({ activity, index = 0 }: ActivityCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deleteMutation = useDeleteActivity()

  const icon = activity.exercise_type
    ? EXERCISE_ICONS[activity.exercise_type]
    : activity.water_ml
    ? '💧'
    : activity.sleep_duration_minutes
    ? '😴'
    : '📊'

  const label = activity.exercise_type
    ? activity.exercise_type.charAt(0) + activity.exercise_type.slice(1).toLowerCase()
    : activity.water_ml
    ? 'Hydration'
    : activity.sleep_duration_minutes
    ? 'Sleep'
    : 'Activity'

  const sourceColor =
    activity.source === 'VOICE' ? '#a855f7'
    : activity.source === 'HEALTH_CONNECT' ? '#06b6d4'
    : '#64748b'

  return (
    <motion.div
      className="glow-card rounded-xl p-3.5 flex items-center gap-3 group"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      layout
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {icon}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{label}</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              background: sourceColor + '18',
              color: sourceColor,
              border: `1px solid ${sourceColor}33`,
            }}
          >
            {activity.source === 'VOICE' ? '🎤' : activity.source === 'HEALTH_CONNECT' ? '💚' : '✏️'}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{formatDetail(activity)}</p>
        {activity.raw_transcript && (
          <p className="text-xs text-slate-600 mt-0.5 italic truncate">"{activity.raw_transcript}"</p>
        )}
      </div>

      {/* Right side */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="xp-badge">+{activity.xp_awarded} XP</div>
        <span className="text-xs text-slate-600">{formatTime(activity.logged_at)}</span>
      </div>

      {/* Delete */}
      <AnimatePresence>
        {confirmDelete ? (
          <motion.div
            className="flex gap-1.5"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <button
              onClick={() => deleteMutation.mutate(activity.id)}
              className="text-xs text-red-400 border border-red-500/30 rounded-lg px-2 py-1 hover:bg-red-500/10 transition-colors"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '...' : 'Yes'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-slate-400 border border-white/10 rounded-lg px-2 py-1 hover:bg-white/5 transition-colors"
            >
              No
            </button>
          </motion.div>
        ) : (
          <button
            className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all ml-1"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={14} />
          </button>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function ActivityCardSkeleton() {
  return (
    <div className="glow-card rounded-xl p-3.5 flex items-center gap-3 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-white/5 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-white/5 rounded w-24" />
        <div className="h-2.5 bg-white/5 rounded w-40" />
      </div>
      <div className="w-14 h-5 bg-white/5 rounded-full" />
    </div>
  )
}

export function EmptyQuestLog() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-12 gap-3 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="text-5xl animate-float">⚔️</div>
      <p className="text-slate-400 font-medium">No quests completed today</p>
      <p className="text-slate-600 text-sm">Log your first activity to earn XP</p>
      <div className="flex items-center gap-1 mt-1">
        <Zap size={12} className="text-cyan-400" />
        <span className="text-xs text-cyan-400">Every rep counts</span>
      </div>
    </motion.div>
  )
}
