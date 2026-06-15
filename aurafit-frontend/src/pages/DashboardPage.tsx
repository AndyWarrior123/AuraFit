import { motion, AnimatePresence } from "framer-motion";
import { useCharacterSheet, useRecalculateCharacter } from "../hooks/useCharacter";
import { useTodaySummary, useWeeklySummary } from "../hooks/useActivities";
import { useProfile } from "../hooks/useProfile";
import { useAuthStore } from "../auth/useAuthStore";
import { StatBar } from "../components/StatBar";
import { XPRing } from "../components/XPRing";
import { CharacterBadge } from "../components/CharacterBadge";
import {
  ActivityCard,
  ActivityCardSkeleton,
  EmptyQuestLog,
} from "../components/ActivityCard";
import { VoiceInput } from "../components/VoiceInput";
import {
  Footprints,
  Flame,
  Droplets,
  Moon,
  Zap,
  RefreshCw,
  Trophy,
  TrendingUp,
  Swords,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useEffect, useState } from "react";
import { LevelUpOverlay } from "../components/LevelUpOverlay";
import { XpHistoryChart } from "../components/XpHistoryChart";
import { dailyXpGoal, xpRequiredForLevel, getSeason, CLASS_CONFIG } from "../lib/constants";
import toast from "react-hot-toast";

// ── StatPill with optional goal bar ──────────────────────────────────────────

function StatPill({
  icon,
  value,
  label,
  color,
  goal,
  progress,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
  goal?: string;
  progress?: number;
}) {
  return (
    <motion.div
      className="flex flex-col items-center gap-1 p-3 rounded-xl"
      style={{ background: `${color}0d`, border: `1px solid ${color}22` }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.03 }}
    >
      <span style={{ color }} className="opacity-80">{icon}</span>
      <span className="text-base font-bold text-white leading-none">{value}</span>
      {goal && <span className="text-[10px] text-slate-600">/ {goal}</span>}
      <span className="text-xs text-slate-500">{label}</span>
      {progress !== undefined && (
        <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden mt-0.5">
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 1, delay: 0.3 }}
          />
        </div>
      )}
    </motion.div>
  );
}

// ── Achievement definitions ───────────────────────────────────────────────────

interface Achievement {
  id: string
  icon: string
  label: string
  desc: string
  unlocked: boolean
}

function computeAchievements(
  cumXp: number,
  level: number,
  streak: number,
  longestStreak: number,
  activityCount: number,
): Achievement[] {
  return [
    {
      id: 'first',
      icon: '⚔️',
      label: 'First Quest',
      desc: 'Log your first activity',
      unlocked: activityCount > 0,
    },
    {
      id: 'xp500',
      icon: '⚡',
      label: '500 XP',
      desc: 'Earn 500 total XP',
      unlocked: cumXp >= 500,
    },
    {
      id: 'level5',
      icon: '🌟',
      label: 'Level 5',
      desc: 'Reach level 5',
      unlocked: level >= 5,
    },
    {
      id: 'streak7',
      icon: '🔥',
      label: '7-Day Streak',
      desc: 'Log 7 days in a row',
      unlocked: streak >= 7 || longestStreak >= 7,
    },
    {
      id: 'streak30',
      icon: '💎',
      label: '30-Day Streak',
      desc: 'Log 30 days in a row',
      unlocked: streak >= 30 || longestStreak >= 30,
    },
    {
      id: 'xp5000',
      icon: '👑',
      label: '5000 XP',
      desc: 'Earn 5000 total XP',
      unlocked: cumXp >= 5000,
    },
  ]
}

// ── Class progression card ────────────────────────────────────────────────────

function ClassProgressionCard({
  currentClass,
  level,
  attrs,
}: {
  currentClass: string
  level: number
  attrs: { strength: { score: number }; endurance: { score: number }; agility: { score: number }; vitality: { score: number }; recovery: { score: number } }
}) {
  const classScores = {
    WARRIOR: attrs.strength.score * 0.6 + attrs.endurance.score * 0.4,
    RANGER:  attrs.agility.score  * 0.6 + attrs.endurance.score * 0.4,
    MAGE:    attrs.vitality.score * 0.5 + attrs.recovery.score  * 0.5,
  }
  const sorted = (Object.entries(classScores) as [string, number][]).sort((a, b) => b[1] - a[1])
  const [topClass, topScore] = sorted[0]
  const [, secondScore] = sorted[1]
  const gap = Math.round(topScore - secondScore)

  const CLASS_TIPS: Record<string, string> = {
    WARRIOR: 'Log strength training and cardio to maintain your lead',
    RANGER:  'Log steps, runs, and hikes to stay ahead',
    MAGE:    'Prioritise sleep quality and recovery to hold this class',
  }

  return (
    <div className="glow-card rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Swords size={14} className="text-purple-400" /> Class Progression
      </h2>
      {level < 10 ? (
        <p className="text-xs text-slate-500">
          Reach <span className="text-cyan-400 font-semibold">Level 10</span> to unlock class assignment. Currently Level {level}.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{CLASS_CONFIG[currentClass as keyof typeof CLASS_CONFIG]?.icon}</span>
            <div>
              <p className="text-sm font-bold text-white">{CLASS_CONFIG[currentClass as keyof typeof CLASS_CONFIG]?.label}</p>
              <p className="text-xs text-slate-500">{gap > 0 ? `${gap} pts ahead of next class` : 'Tied for lead'}</p>
            </div>
          </div>
          <p className="text-xs text-slate-600">{CLASS_TIPS[topClass] ?? 'Keep logging to advance'}</p>
          <div className="space-y-1.5">
            {sorted.map(([cls, score]) => {
              const cfg = CLASS_CONFIG[cls as keyof typeof CLASS_CONFIG]
              const pct = Math.min((score / 100) * 100, 100)
              return (
                <div key={cls} className="flex items-center gap-2">
                  <span className="text-sm w-4">{cfg?.icon}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: cls === topClass ? cfg?.color : 'rgba(100,116,139,0.5)',
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-8 text-right">{Math.round(score)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user } = useAuthStore();
  const { data: sheet, isLoading: sheetLoading } = useCharacterSheet();
  const { data: today, isLoading: todayLoading } = useTodaySummary();
  const { data: weekly } = useWeeklySummary();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const recalcMutation = useRecalculateCharacter();

  const stats = sheet?.stats;
  const attrs = sheet?.attributes;
  const season = getSeason();
  const prevLevelRef = useRef<number | null>(null);
  const [levelUpVal, setLevelUpVal] = useState<number | null>(null);

  useEffect(() => {
    if (!stats) return;
    if (!recalcMutation.isPending && stats.cumulative_xp >= xpRequiredForLevel(stats.level_at_snapshot)) {
      recalcMutation.mutate();
    }
    const prev = prevLevelRef.current;
    if (prev !== null && stats.level_at_snapshot > prev) {
      setLevelUpVal(stats.level_at_snapshot);
    }
    prevLevelRef.current = stats.level_at_snapshot;
  }, [stats?.level_at_snapshot, stats?.cumulative_xp]);

  // Calorie balance from today's logs
  const caloriesConsumed = today?.logs.reduce((s, l) => s + (l.calories_consumed ?? 0), 0) ?? 0;
  const bmr = Math.round(profile?.bmr ?? 0);

  // Achievements
  const achievements = stats
    ? computeAchievements(
        stats.cumulative_xp,
        stats.level_at_snapshot,
        stats.current_streak_days,
        stats.longest_streak_days,
        today?.activity_count ?? 0,
      )
    : [];
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="min-h-screen p-4 md:p-6 pb-24 md:pb-6 space-y-5">
      {/* Top header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-xl font-bold text-white">
            {getGreeting()},{" "}
            <span className="neon-text-purple">{user?.display_name}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={() => {
            qc.invalidateQueries({ queryKey: ["character"] });
            qc.invalidateQueries({ queryKey: ["activities"] });
          }}
          className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all"
        >
          <RefreshCw size={16} />
        </button>
      </motion.div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT: Character sheet */}
        <div className="lg:col-span-1 space-y-4">
          {/* XP Ring + character */}
          <div className="glow-card rounded-2xl p-5 flex flex-col items-center gap-4">
            {sheetLoading || !stats ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-40 h-40 rounded-full bg-white/5 animate-pulse" />
                <div className="space-y-2 w-32">
                  <div className="h-4 bg-white/5 rounded animate-pulse" />
                  <div className="h-3 bg-white/5 rounded animate-pulse w-24 mx-auto" />
                </div>
              </div>
            ) : (
              <>
                <XPRing totalXp={stats.cumulative_xp} level={stats.level_at_snapshot} size={160} />
                {user && (
                  <CharacterBadge
                    characterClass={stats.character_class}
                    level={stats.level_at_snapshot}
                    streakDays={stats.current_streak_days}
                    displayName={user.display_name}
                    avatarUrl={user.avatar_url}
                  />
                )}
              </>
            )}
          </div>

          {/* Today's XP */}
          {(stats || today) && (() => {
            const xpToday = today?.xp_earned_today ?? 0;
            const level = stats?.level_at_snapshot ?? 1;
            const goal = dailyXpGoal(level);
            const goalMet = xpToday >= goal;
            const barPercent = Math.min((xpToday / goal) * 100, 100);
            return (
              <motion.div
                className="glow-card rounded-2xl p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Today's XP</span>
                  {goalMet
                    ? <span className="text-xs font-semibold text-amber-400">✓ Goal Met!</span>
                    : <Zap size={14} className="text-cyan-400" />
                  }
                </div>
                <div className="flex items-end gap-1">
                  <span
                    className="text-2xl font-black"
                    style={{ fontFamily: "Orbitron, system-ui", color: goalMet ? '#f59e0b' : '#06b6d4' }}
                  >
                    +{xpToday}
                  </span>
                  <span className="text-slate-500 text-sm mb-1">XP</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: goalMet ? "linear-gradient(90deg, #f59e0b, #fbbf24)" : "linear-gradient(90deg, #7c3aed, #06b6d4)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${barPercent}%` }}
                    transition={{ duration: 1.2, delay: 0.5 }}
                  />
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Daily goal: {goal} XP{goalMet && xpToday > goal ? ` · +${xpToday - goal} bonus` : ''}
                </p>
              </motion.div>
            );
          })()}

          {/* Weekly summary */}
          {weekly && (
            <motion.div
              className="glow-card rounded-2xl p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <TrendingUp size={12} className="text-purple-400" /> This Week
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Sessions', value: weekly.sessions, color: '#a855f7' },
                  { label: 'XP Earned', value: `+${weekly.totalXp}`, color: '#06b6d4' },
                  { label: 'Active Min', value: weekly.totalActiveMinutes, color: '#22c55e' },
                  { label: 'Calories', value: weekly.totalCalories, color: '#f97316' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="text-xs text-slate-600">{label}</span>
                    <span className="text-sm font-bold" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Calorie balance */}
          {bmr > 0 && today && (
            <motion.div
              className="glow-card rounded-2xl p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Flame size={12} className="text-orange-400" /> Calorie Balance
              </h2>
              <div className="space-y-1.5">
                {[
                  { label: 'BMR', value: `+${bmr}`, color: '#64748b' },
                  { label: 'Burned', value: `+${today.total_calories_burned}`, color: '#22c55e' },
                  { label: 'Consumed', value: caloriesConsumed ? `-${caloriesConsumed}` : '—', color: '#ef4444' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">{label}</span>
                    <span className="text-xs font-semibold" style={{ color }}>{value}</span>
                  </div>
                ))}
                <div className="border-t border-white/5 pt-1.5 flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">Net</span>
                  <span className="text-sm font-bold text-white">
                    {(bmr + today.total_calories_burned - caloriesConsumed).toLocaleString()} kcal
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* CENTER + RIGHT: Stats + Quest Log */}
        <div className="lg:col-span-2 space-y-4">
          {/* Attribute bars */}
          <div className="glow-card rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="neon-text-purple">◆</span> Character Attributes
            </h2>
            {sheetLoading || !attrs ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-8 h-3 bg-white/5 rounded" />
                    <div className="flex-1 h-2 bg-white/5 rounded" />
                    <div className="w-6 h-3 bg-white/5 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3.5">
                {(Object.keys(attrs) as Array<keyof typeof attrs>).map((key, i) => (
                  <StatBar
                    key={key}
                    statKey={key}
                    score={attrs[key].score}
                    drivenBy={attrs[key].driven_by}
                    delay={i * 0.1}
                  />
                ))}
              </div>
            )}
          </div>

          {/* XP chart */}
          <div className="glow-card rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="neon-text-purple">◆</span> XP Last 14 Days
            </h2>
            <XpHistoryChart />
          </div>

          {/* Today's quick stats with goal bars */}
          {today && (
            <div className="grid grid-cols-4 gap-3">
              <StatPill
                icon={<Footprints size={16} />}
                value={today.total_steps.toLocaleString()}
                label="Steps"
                color="#22c55e"
              />
              <StatPill
                icon={<Flame size={16} />}
                value={today.total_calories_burned}
                label="Calories"
                color="#f97316"
              />
              <StatPill
                icon={<Droplets size={16} />}
                value={`${(today.total_water_ml / 1000).toFixed(1)}L`}
                goal={`${(season.waterMl / 1000).toFixed(1)}L`}
                progress={(today.total_water_ml / season.waterMl) * 100}
                label="Water"
                color="#06b6d4"
              />
              <StatPill
                icon={<Moon size={16} />}
                value={`${Math.round((today.sleep_minutes / 60) * 10) / 10}h`}
                goal={`${(season.sleepMin / 60).toFixed(1)}h`}
                progress={(today.sleep_minutes / season.sleepMin) * 100}
                label="Sleep"
                color="#a855f7"
              />
            </div>
          )}

          {/* Class progression */}
          {stats && attrs && (
            <ClassProgressionCard
              currentClass={stats.character_class}
              level={stats.level_at_snapshot}
              attrs={attrs}
            />
          )}

          {/* Achievement badges */}
          {achievements.length > 0 && (
            <div className="glow-card rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Trophy size={14} className="text-amber-400" /> Achievements
                </span>
                <span className="text-xs text-slate-600">{unlockedCount}/{achievements.length}</span>
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {achievements.map(a => (
                  <div
                    key={a.id}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-all"
                    style={{
                      background: a.unlocked ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)',
                      border: a.unlocked ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.06)',
                      opacity: a.unlocked ? 1 : 0.4,
                    }}
                  >
                    <span className="text-xl">{a.icon}</span>
                    <span className="text-xs font-semibold text-white leading-tight">{a.label}</span>
                    <span className="text-[10px] text-slate-500 leading-tight">{a.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Voice input quick action */}
          <div className="glow-card rounded-2xl p-5 flex flex-col items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider self-start flex items-center gap-2">
              <span className="neon-text-purple">◆</span> Log Activity
            </h2>
            <VoiceInput
              size="sm"
              onSuccess={() => toast.success('Activity logged! Check your quest log.', { icon: '✅' })}
            />
            <p className="text-xs text-slate-600 text-center">
              Just say what you did —{" "}
              <span className="text-cyan-400">"I ran 5km this morning"</span>
            </p>
          </div>

          {/* Quest log */}
          <div className="glow-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span className="neon-text-purple">◆</span> Today's Quest Log
              </h2>
              {today && (
                <span className="xp-badge">+{today.xp_earned_today} XP total</span>
              )}
            </div>

            {todayLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <ActivityCardSkeleton key={i} />
                ))}
              </div>
            ) : today?.activity_count === 0 ? (
              <OnboardingEmpty />
            ) : today?.logs.length ? (
              <AnimatePresence>
                <div className="space-y-2">
                  {today.logs.map((activity, i) => (
                    <ActivityCard key={activity.id} activity={activity} index={i} />
                  ))}
                </div>
              </AnimatePresence>
            ) : (
              <EmptyQuestLog />
            )}
          </div>
        </div>
      </div>
      <LevelUpOverlay
        level={levelUpVal ?? 1}
        visible={levelUpVal !== null}
        onDone={() => setLevelUpVal(null)}
      />
    </div>
  );
}

// ── Onboarding empty state ────────────────────────────────────────────────────

function OnboardingEmpty() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-10 gap-4 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="text-5xl animate-float">🌱</div>
      <div>
        <p className="text-slate-300 font-semibold">Your adventure begins here</p>
        <p className="text-slate-500 text-sm mt-1">Log your first activity to earn XP and start levelling up</p>
      </div>
      <a
        href="/workout"
        className="btn-primary inline-flex items-center gap-2 text-sm px-5 py-2.5 mt-1"
      >
        <Zap size={14} /> Log First Activity
      </a>
    </motion.div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
