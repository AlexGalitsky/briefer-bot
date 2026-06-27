import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createMeeting,
  fetchMeetings,
  stopMeeting,
} from '@/features/meetings/api/meetings.api'

export const meetingsQueryKey = ['meetings'] as const

export function useMeetings() {
  return useQuery({
    queryKey: meetingsQueryKey,
    queryFn: fetchMeetings,
  })
}

export function useCreateMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createMeeting,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingsQueryKey })
    },
  })
}

export function useStopMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: stopMeeting,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingsQueryKey })
    },
  })
}
