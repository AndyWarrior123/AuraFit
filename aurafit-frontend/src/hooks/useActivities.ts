import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api/client'
import type { DailySummaryRead, ActivityLogRead, VoiceParseRequest } from '../api/types'
import toast from 'react-hot-toast'

export function useTodaySummary() {
  return useQuery({
    queryKey: ['activities', 'today'],
    queryFn: async () => {
      const { data } = await apiClient.get<DailySummaryRead>('/activities/today')
      return data
    },
    staleTime: 15_000,
    refetchInterval: 60_000,
  })
}

export function useActivityHistory(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['activities', 'history', page],
    queryFn: async () => {
      const { data } = await apiClient.get<ActivityLogRead[]>('/activities/history', {
        params: { page, page_size: pageSize },
      })
      return data
    },
    staleTime: 30_000,
  })
}

export function useDeleteActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/activities/${id}`),
    onSuccess: async () => {
      await apiClient.post('/character/recalculate')
      qc.invalidateQueries({ queryKey: ['activities'] })
      qc.invalidateQueries({ queryKey: ['character'] })
    },
  })
}

export function useVoiceParse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: VoiceParseRequest) =>
      apiClient.post<ActivityLogRead>('/voice/parse', req),
    onSuccess: async ({ data }) => {
      await apiClient.post('/character/recalculate')
      const label = data.exercise_type
        ? data.exercise_type.charAt(0) + data.exercise_type.slice(1).toLowerCase()
        : 'Activity'
      toast.success(`+${data.xp_awarded} XP · ${label}`, {
        icon: '⚡',
        style: { color: '#06b6d4', borderColor: 'rgba(6, 182, 212, 0.3)' },
      })
      qc.invalidateQueries({ queryKey: ['activities'] })
      qc.invalidateQueries({ queryKey: ['character'] })
    },
  })
}

export function useWeeklySummary() {
  return useQuery({
    queryKey: ['activities', 'weekly-summary'],
    queryFn: async () => {
      const { data } = await apiClient.get<ActivityLogRead[]>('/activities/history', {
        params: { page: 1, page_size: 100 },
      })
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)) // Monday
      weekStart.setHours(0, 0, 0, 0)
      const weekLogs = data.filter(l => new Date(l.logged_at) >= weekStart)
      return {
        sessions: new Set(weekLogs.map(l => l.log_date)).size,
        totalActiveMinutes: Math.round(weekLogs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0)),
        totalXp: weekLogs.reduce((s, l) => s + l.xp_awarded, 0),
        totalCalories: weekLogs.reduce((s, l) => s + (l.calories_burned ?? 0), 0),
      }
    },
    staleTime: 60_000,
  })
}

export function useRecentActivities() {
  return useQuery({
    queryKey: ['activities', 'recent-100'],
    queryFn: async () => {
      const { data } = await apiClient.get<ActivityLogRead[]>('/activities/history', {
        params: { page: 1, page_size: 100 },
      })
      return data
    },
    staleTime: 60_000,
  })
}

export function useXpHistory() {
  return useQuery({
    queryKey: ['activities', 'xp-history'],
    queryFn: async () => {
      const res = await apiClient.get<ActivityLogRead[]>('/activities/history', {
        params: { page: 1, page_size: 50},
      })
      const byDate = new Map<string, number>()
      for (const log of res.data) {
        const d = log.log_date
        byDate.set(d, (byDate.get(d) ?? 0) + log.xp_awarded)
      }
      const result: {date: string; xp: number }[] = []
      for (let i = 13; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toISOString().split('T')[0]
        result.push({ date: key, xp: byDate.get(key) ?? 0 })
      }
      return result
    },
    staleTime: 5 * 60 * 1000,
  })
}