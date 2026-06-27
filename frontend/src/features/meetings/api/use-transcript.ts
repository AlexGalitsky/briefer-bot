import { useQuery } from '@tanstack/react-query'
import { fetchMeeting, fetchTranscript } from '@/features/meetings/api/meetings.api'

export function useMeeting(id: string) {
  return useQuery({
    queryKey: ['meetings', id],
    queryFn: () => fetchMeeting(id),
    enabled: Boolean(id),
  })
}

export function useTranscript(
  meetingId: string,
  options?: { pollWhileLive?: boolean },
) {
  return useQuery({
    queryKey: ['transcript', meetingId],
    queryFn: () => fetchTranscript(meetingId),
    enabled: Boolean(meetingId),
    refetchInterval: options?.pollWhileLive ? 5000 : false,
  })
}
