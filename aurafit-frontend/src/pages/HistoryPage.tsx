import { motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import { useRecentActivities } from '../hooks/useActivities'
import { ActivityCard, ActivityCardSkeleton, EmptyQuestLog } from '../components/ActivityCard'
import type { ActivityLogRead, ExerciseType } from '../api/types'

const TYPE_LABELS: Record<ExerciseType, string> = {
  RUN: 'Run', WALK: 'Walk', CYCLE: 'Cycle', SWIM: 'Swim', HIKE: 'Hike',
  LIFT: 'Lift', YOGA: 'Yoga', PILATES: 'Pilates', HIIT: 'HIIT', STRETCH: 'Stretch',
  SPORT: 'Sport', OTHER: 'Other',
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-AU', { weekday: 'long', month: 'short', day: 'numeric' })
}

function StreakCalendar({ activities }: { activities: ActivityLogRead[] }) {
  const todayStr = new Date().toISOString().split('T')[0]
  const days = useMemo(() => {
    const result: { date: string; xp: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const xp = activities.filter(a => a.log_date === key).reduce((s, a) => s + a.xp_awarded, 0)
      result.push({ date: key, xp })
    }
    return result
  }, [activities])

  const maxXp = Math.max(...days.map(d => d.xp), 1)
  const activeDays = days.filter(d => d.xp > 0).length

  return (
    <div className="glow-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-300">30-Day Activity</h2>
        <span className="text-xs text-violet-400 font-mono">{activeDays} / 30 days active</span>
      </div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
        {days.map(day => {
          const intensity = day.xp > 0 ? Math.min(1, day.xp / maxXp) : 0
          const isToday = day.date === todayStr
          return (
            <div
              key={day.date}
              className="relative aspect-square rounded-sm group"
              style={{
                background: day.xp > 0
                  ? `rgba(139, 92, 246, ${0.2 + intensity * 0.8})`
                  : 'rgba(255,255,255,0.04)',
                outline: isToday ? '1.5px solid rgba(139, 92, 246, 0.7)' : 'none',
              }}
            >
              {day.xp > 0 && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-20 pointer-events-none hidden group-hover:block">
                  <div className="text-xs whitespace-nowrap px-2 py-1 rounded bg-[#0d0d23] border border-purple-500/30 text-slate-300">
                    {day.date}: +{day.xp} XP
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-xs text-slate-600 mr-0.5">Less</span>
        {[0.1, 0.3, 0.55, 0.8, 1].map((v, i) => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{ background: `rgba(139,92,246,${v})` }} />
        ))}
        <span className="text-xs text-slate-600 ml-0.5">More</span>
      </div>
    </div>
  )
}

export function HistoryPage() {
  const { data: activities = [], isLoading } = useRecentActivities()
  const [typeFilter, setTypeFilter] = useState<ExerciseType | null>(null)

  const availableTypes = useMemo(() => {
    const types = new Set<ExerciseType>()
    activities.forEach(a => { if (a.exercise_type) types.add(a.exercise_type) })
    return Array.from(types)
  }, [activities])

  const grouped = useMemo(() => {
    const filtered = typeFilter ? activities.filter(a => a.exercise_type === typeFilter) : activities
    const map = new Map<string, ActivityLogRead[]>()
    filtered.forEach(a => {
      if (!map.has(a.log_date)) map.set(a.log_date, [])
      map.get(a.log_date)!.push(a)
    })
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [activities, typeFilter])

  return (
    <div className="min-h-screen p-4 md:p-6 pb-24 md:pb-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="neon-text-purple">📊</span> Activity History
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Every quest you've completed</p>
      </motion.div>

      {!isLoading && activities.length > 0 && <StreakCalendar activities={activities} />}

      {availableTypes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTypeFilter(null)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              !typeFilter
                ? 'bg-violet-600/30 border-violet-500/50 text-violet-300'
                : 'border-white/10 text-slate-500 hover:text-white hover:border-white/20'
            }`}
          >
            All
          </button>
          {availableTypes.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? null : t)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                typeFilter === t
                  ? 'bg-violet-600/30 border-violet-500/50 text-violet-300'
                  : 'border-white/10 text-slate-500 hover:text-white hover:border-white/20'
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      )}

      <div className="glow-card rounded-2xl p-5">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <ActivityCardSkeleton key={i} />)}
          </div>
        ) : grouped.length ? (
          <div className="space-y-6">
            {grouped.map(([date, logs]) => {
              const dayXp = logs.reduce((s, l) => s + l.xp_awarded, 0)
              return (
                <div key={date}>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {formatDayLabel(date)}
                    </span>
                    <span className="text-xs text-violet-400 font-mono">+{dayXp} XP</span>
                  </div>
                  <div className="space-y-2">
                    {logs.map((a, i) => <ActivityCard key={a.id} activity={a} index={i} />)}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyQuestLog />
        )}
      </div>
    </div>
  )
}
