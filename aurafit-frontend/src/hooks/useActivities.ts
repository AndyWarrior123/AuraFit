import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api/client'
import type { DailySummaryRead, ActivityLogRead, VoiceParseRequest } from '../api/types'

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
    onSuccess: () => {
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities'] })
      qc.invalidateQueries({ queryKey: ['character'] })
    },
  })
}
