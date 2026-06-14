import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api/client'
import type { CharacterSheetRead } from '../api/types'

export function useCharacterSheet() {
  return useQuery({
    queryKey: ['character', 'sheet'],
    queryFn: async () => {
      const { data } = await apiClient.get<CharacterSheetRead>('/character/sheet')
      return data
    },
    staleTime: 30_000,
  })
}

export function useRecalculateCharacter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post('/character/recalculate'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['character'] })
    },
  })
}

export function useResetCharacter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post('/character/reset'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['character'] })
      qc.invalidateQueries({ queryKey: ['activities'] })
    },
  })
}
