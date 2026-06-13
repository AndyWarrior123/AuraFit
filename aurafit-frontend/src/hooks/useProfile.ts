import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api/client'
import { useAuthStore } from '../auth/useAuthStore'
import type { UserRead, ProfileSetupRequest } from '../api/types'

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await apiClient.get<UserRead>('/users/me/profile')
      return data
    },
    staleTime: 60_000,
  })
}

export function useSetupProfile() {
  const qc = useQueryClient()
  const setUser = useAuthStore(s => s.setUser)
  return useMutation({
    mutationFn: (req: ProfileSetupRequest) =>
      apiClient.post<UserRead>('/users/me/setup', req),
    onSuccess: ({ data }) => {
      setUser(data)
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  const setUser = useAuthStore(s => s.setUser)
  return useMutation({
    mutationFn: (req: Partial<ProfileSetupRequest>) =>
      apiClient.put<UserRead>('/users/me/profile', req),
    onSuccess: ({ data }) => {
      setUser(data)
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}
