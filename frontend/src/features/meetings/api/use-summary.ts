import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchSummary,
  fetchTasks,
  regenerateSummary,
  updateTaskCompleted,
} from '@/features/meetings/api/summary.api'

export function useSummary(meetingId: string) {
  return useQuery({
    queryKey: ['summary', meetingId],
    queryFn: () => fetchSummary(meetingId),
    enabled: Boolean(meetingId),
    refetchInterval: (query) => {
      const status = query.state.data?.summary?.status
      if (status === 'processing' || status === 'pending') return 3000
      return false
    },
  })
}

export function useTasks(meetingId: string) {
  return useQuery({
    queryKey: ['tasks', meetingId],
    queryFn: () => fetchTasks(meetingId),
    enabled: Boolean(meetingId),
  })
}

export function useRegenerateSummary(meetingId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => regenerateSummary(meetingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['summary', meetingId] })
      void queryClient.invalidateQueries({ queryKey: ['tasks', meetingId] })
    },
  })
}

export function useUpdateTask(meetingId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      taskId,
      completed,
    }: {
      taskId: string
      completed: boolean
    }) => updateTaskCompleted(meetingId, taskId, completed),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', meetingId] })
    },
  })
}
