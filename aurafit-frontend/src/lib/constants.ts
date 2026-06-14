import type { CharacterClass, ExerciseType } from '../api/types'

export const STAT_CONFIG = {
  strength: {
    label: 'STR',
    full: 'Strength',
    color: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.5)',
    track: 'rgba(239, 68, 68, 0.12)',
  },
  endurance: {
    label: 'END',
    full: 'Endurance',
    color: '#f97316',
    glow: 'rgba(249, 115, 22, 0.5)',
    track: 'rgba(249, 115, 22, 0.12)',
  },
  vitality: {
    label: 'VIT',
    full: 'Vitality',
    color: '#22c55e',
    glow: 'rgba(34, 197, 94, 0.5)',
    track: 'rgba(34, 197, 94, 0.12)',
  },
  agility: {
    label: 'AGI',
    full: 'Agility',
    color: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.5)',
    track: 'rgba(6, 182, 212, 0.12)',
  },
  recovery: {
    label: 'REC',
    full: 'Recovery',
    color: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.5)',
    track: 'rgba(168, 85, 247, 0.12)',
  },
  discipline: {
    label: 'DIS',
    full: 'Discipline',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.5)',
    track: 'rgba(245, 158, 11, 0.12)',
  },
} as const

export const CLASS_CONFIG: Record<CharacterClass, { label: string; icon: string; color: string; description: string }> = {
  NOVICE: {
    label: 'Novice',
    icon: '🌱',
    color: '#94a3b8',
    description: 'Your journey begins',
  },
  WARRIOR: {
    label: 'Warrior',
    icon: '⚔️',
    color: '#ef4444',
    description: 'Master of strength and endurance',
  },
  RANGER: {
    label: 'Ranger',
    icon: '🏹',
    color: '#22c55e',
    description: 'Swift and agile outdoorsman',
  },
  MAGE: {
    label: 'Mage',
    icon: '✨',
    color: '#a855f7',
    description: 'Disciplined mind and recovery',
  },
}

export const EXERCISE_ICONS: Record<ExerciseType, string> = {
  RUN: '🏃',
  WALK: '🚶',
  CYCLE: '🚴',
  SWIM: '🏊',
  HIKE: '🥾',
  LIFT: '🏋️',
  YOGA: '🧘',
  PILATES: '🤸',
  HIIT: '⚡',
  STRETCH: '🙆',
  SPORT: '⚽',
  OTHER: '💪',
}

// XP needed within `level` to advance to the next level.
// Formula: prev_limit + (level × 5) × (prev_limit / 100)
export function xpLimitForLevel(level: number): number {
  if (level <= 1) return 100
  const prev = xpLimitForLevel(level - 1)
  return Math.floor(prev + (level * 5) * (prev / 100))
}

// Cumulative XP required to enter `level` (0 for level 1).
export function xpToEnterLevel(level: number): number {
  if (level <= 1) return 0
  let total = 0
  for (let i = 1; i < level; i++) total += xpLimitForLevel(i)
  return total
}

// Cumulative XP at which you advance BEYOND `level` (used for stale-snapshot check).
export function xpRequiredForLevel(level: number): number {
  return xpToEnterLevel(level + 1)
}

export function xpProgressInLevel(totalXp: number, level: number) {
  const start = xpToEnterLevel(level)
  const needed = xpLimitForLevel(level)
  const current = Math.max(0, totalXp - start)
  return {
    current,
    needed,
    percent: Math.min((current / needed) * 100, 100),
  }
}

export function dailyXpGoal(level: number): number {
  let goal = 300
  for (let i = 2; i <= level; i++) {
    goal = Math.floor(goal + (i * 5) * (goal / 100))
  }
  return goal
}
