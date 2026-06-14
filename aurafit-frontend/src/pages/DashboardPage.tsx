import { motion, AnimatePresence } from "framer-motion";
import { useCharacterSheet, useRecalculateCharacter } from "../hooks/useCharacter";
import { useTodaySummary } from "../hooks/useActivities";
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
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useEffect, useState } from "react";
import { LevelUpOverlay } from "../components/LevelUpOverlay";
import { XpHistoryChart } from "../components/XpHistoryChart";
import { dailyXpGoal, xpRequiredForLevel } from "../lib/constants";

function StatPill({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
}) {
  return (
    <motion.div
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl"
      style={{ background: `${color}0d`, border: `1px solid ${color}22` }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.03 }}
    >
      <span style={{ color }} className="opacity-80">
        {icon}
      </span>
      <span className="text-base font-bold text-white">{value}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </motion.div>
  );
}

export function DashboardPage() {
  const { user } = useAuthStore();
  const { data: sheet, isLoading: sheetLoading } = useCharacterSheet();
  const { data: today, isLoading: todayLoading } = useTodaySummary();
  const qc = useQueryClient();
  const recalcMutation = useRecalculateCharacter();

  const stats = sheet?.stats;
  const attrs = sheet?.attributes;
  const prevLevelRef = useRef<number | null>(null);
  const [levelUpVal, setLevelUpVal] = useState<number | null>(null);

  useEffect(() => {
    if (!stats) return;
    // Auto-recalculate if snapshot is stale: cumulative XP has already passed current level's threshold
    if (!recalcMutation.isPending && stats.cumulative_xp >= xpRequiredForLevel(stats.level_at_snapshot)) {
      recalcMutation.mutate();
    }
    const prev = prevLevelRef.current;
    if (prev !== null && stats.level_at_snapshot > prev) {
      setLevelUpVal(stats.level_at_snapshot);
    }
    prevLevelRef.current = stats.level_at_snapshot;
  }, [stats?.level_at_snapshot, stats?.cumulative_xp]);

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
                <XPRing
                  totalXp={stats.cumulative_xp}
                  level={stats.level_at_snapshot}
                  size={160}
                />
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

          {/* Today's XP gained */}
          {(stats || today) && (() => {
            const xpToday = today?.xp_earned_today ?? 0
            const level = stats?.level_at_snapshot ?? 1
            const goal = dailyXpGoal(level)
            const goalMet = xpToday >= goal
            const barPercent = Math.min((xpToday / goal) * 100, 100)
            return (
              <motion.div
                className="glow-card rounded-2xl p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">
                    Today's XP
                  </span>
                  {goalMet
                    ? <span className="text-xs font-semibold text-amber-400">✓ Goal Met!</span>
                    : <Zap size={14} className="text-cyan-400" />
                  }
                </div>
                <div className="flex items-end gap-1">
                  <span
                    className="text-2xl font-black"
                    style={{
                      fontFamily: "Orbitron, system-ui",
                      color: goalMet ? '#f59e0b' : '#06b6d4',
                    }}
                  >
                    +{xpToday}
                  </span>
                  <span className="text-slate-500 text-sm mb-1">XP</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: goalMet
                        ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                        : "linear-gradient(90deg, #7c3aed, #06b6d4)",
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${barPercent}%` }}
                    transition={{ duration: 1.2, delay: 0.5 }}
                  />
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Daily goal: {goal} XP{goalMet && xpToday > goal ? ` · +${xpToday - goal} bonus` : ''}
                </p>
              </motion.div>
            )
          })()}
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
                  <div
                    key={i}
                    className="flex items-center gap-3 animate-pulse"
                  >
                    <div className="w-8 h-3 bg-white/5 rounded" />
                    <div className="flex-1 h-2 bg-white/5 rounded" />
                    <div className="w-6 h-3 bg-white/5 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3.5">
                {(Object.keys(attrs) as Array<keyof typeof attrs>).map(
                  (key, i) => (
                    <StatBar
                      key={key}
                      statKey={key}
                      score={attrs[key].score}
                      drivenBy={attrs[key].driven_by}
                      delay={i * 0.1}
                    />
                  ),
                )}
              </div>
            )}
          </div>
          <div className="glow-card rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="neon-text-purple">◆</span> XP Last 14 Days
            </h2>
            <XpHistoryChart />
          </div>

          {/* Today's quick stats */}
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
                label="Water"
                color="#06b6d4"
              />
              <StatPill
                icon={<Moon size={16} />}
                value={`${Math.round((today.sleep_minutes / 60) * 10) / 10}h`}
                label="Sleep"
                color="#a855f7"
              />
            </div>
          )}

          {/* Voice input quick action */}
          <div className="glow-card rounded-2xl p-5 flex flex-col items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider self-start flex items-center gap-2">
              <span className="neon-text-purple">◆</span> Log Activity
            </h2>
            <VoiceInput size="sm" />
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
                <span className="xp-badge">
                  +{today.xp_earned_today} XP total
                </span>
              )}
            </div>

            {todayLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <ActivityCardSkeleton key={i} />
                ))}
              </div>
            ) : today?.logs.length ? (
              <AnimatePresence>
                <div className="space-y-2">
                  {today.logs.map((activity, i) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      index={i}
                    />
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

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
