import { motion } from 'framer-motion'
import { useState } from 'react'
import { User, Save, BarChart3, Zap, Activity } from 'lucide-react'
import { useProfile, useUpdateProfile } from '../hooks/useProfile'
import { useCharacterSheet } from '../hooks/useCharacter'
import { useAuthStore } from '../auth/useAuthStore'
import { CharacterBadge } from '../components/CharacterBadge'
import { StatBar } from '../components/StatBar'
import { XPRing } from '../components/XPRing'
import type { Gender } from '../api/types'

export function ProfilePage() {
  const { user } = useAuthStore()
  const { data: profile } = useProfile()
  const { data: sheet } = useCharacterSheet()
  const updateMutation = useUpdateProfile()

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    height_cm: profile?.height_cm ?? '',
    weight_kg: profile?.weight_kg ?? '',
    age_years: profile?.age_years ?? '',
    gender: profile?.gender ?? '',
  })
  const [saved, setSaved] = useState(false)

  const src = profile ?? user
  const stats = sheet?.stats
  const attrs = sheet?.attributes

  async function handleSave() {
    await updateMutation.mutateAsync({
      height_cm: form.height_cm ? Number(form.height_cm) : undefined,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
      age_years: form.age_years ? Number(form.age_years) : undefined,
      gender: form.gender as Gender || undefined,
    })
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="min-h-screen p-4 md:p-6 pb-24 md:pb-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="neon-text-purple">👤</span> Profile
        </h1>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Character card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glow-card rounded-2xl p-6 flex flex-col items-center gap-4">
            {src && stats && (
              <>
                <CharacterBadge
                  characterClass={stats.character_class}
                  level={stats.level_at_snapshot}
                  streakDays={stats.current_streak_days}
                  displayName={src.display_name}
                  avatarUrl={src.avatar_url}
                />
                <XPRing totalXp={stats.cumulative_xp} level={stats.level_at_snapshot} size={140} />
              </>
            )}
          </div>

          {/* Physical stats summary */}
          {src && (
            <div className="glow-card rounded-2xl p-5 space-y-3">
              <h3 className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Activity size={12} /> Physical Stats
              </h3>
              {[
                { label: 'Height', value: src.height_cm ? `${src.height_cm} cm` : '—' },
                { label: 'Weight', value: src.weight_kg ? `${src.weight_kg} kg` : '—' },
                { label: 'Age', value: src.age_years ? `${src.age_years} yrs` : '—' },
                { label: 'BMI', value: src.bmi ? src.bmi.toFixed(1) : '—' },
                { label: 'BMR', value: src.bmr ? `${Math.round(src.bmr)} kcal/day` : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-sm font-medium text-white">{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Total stats */}
          {stats && (
            <div className="glow-card rounded-2xl p-5 space-y-3">
              <h3 className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 size={12} /> Lifetime Stats
              </h3>
              {[
                { label: 'Total XP', value: stats.cumulative_xp.toLocaleString(), color: '#06b6d4' },
                { label: 'Longest Streak', value: `${stats.longest_streak_days} days`, color: '#f97316' },
                { label: 'Total Steps', value: stats.total_steps.toLocaleString(), color: '#22c55e' },
                { label: 'Active Minutes', value: `${stats.total_active_minutes} min`, color: '#a855f7' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-sm font-bold" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right side: attributes + edit */}
        <div className="lg:col-span-2 space-y-4">

          {/* Attributes */}
          {attrs && (
            <div className="glow-card rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Zap size={14} className="text-purple-400" /> Attributes
              </h2>
              <div className="space-y-3.5">
                {(Object.keys(attrs) as Array<keyof typeof attrs>).map((key, i) => (
                  <div key={key}>
                    <StatBar
                      statKey={key}
                      score={attrs[key].score}
                      drivenBy={attrs[key].driven_by}
                      delay={i * 0.08}
                    />
                    <p className="text-xs text-slate-600 mt-1 ml-11">{attrs[key].label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edit profile */}
          <div className="glow-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <User size={14} /> Edit Profile
              </h2>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>

            {saved && (
              <motion.div
                className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-cyan-300"
                style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Zap size={14} /> Profile updated!
              </motion.div>
            )}

            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Height (cm)</label>
                    <input
                      type="number"
                      className="input-field"
                      value={form.height_cm}
                      onChange={e => setForm(f => ({ ...f, height_cm: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Weight (kg)</label>
                    <input
                      type="number"
                      className="input-field"
                      value={form.weight_kg}
                      onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Age</label>
                    <input
                      type="number"
                      className="input-field"
                      value={form.age_years}
                      onChange={e => setForm(f => ({ ...f, age_years: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Gender</label>
                    <select
                      className="input-field"
                      value={form.gender}
                      onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                    >
                      <option value="">Select…</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                  <button
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Click Edit to update your physical stats. This recalculates your BMR and XP rates.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
