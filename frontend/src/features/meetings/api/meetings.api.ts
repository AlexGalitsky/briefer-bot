import { z } from 'zod'
import { apiClient } from '@/lib/api-client'
import { parseApiResponse } from '@/lib/parse-api'
import {
  createMeetingBodySchema,
  meetingDetailResponseSchema,
  meetingSchema,
  meetingStatusSchema,
  meetingsListResponseSchema,
  transcriptResponseSchema,
} from '@/features/meetings/schemas/meeting.schema'

const stopMeetingResponseSchema = z.object({
  id: z.string().uuid(),
  status: meetingStatusSchema,
  endedAt: z.coerce.date().nullable().optional(),
})

export async function fetchMeetings() {
  const { data } = await apiClient.get('/meetings')
  return parseApiResponse(meetingsListResponseSchema, data)
}

export async function fetchMeeting(id: string) {
  const { data } = await apiClient.get(`/meetings/${id}`)
  return parseApiResponse(meetingDetailResponseSchema, data)
}

export async function createMeeting(body: { url: string; botName?: string }) {
  const payload = createMeetingBodySchema.parse(body)
  const { data } = await apiClient.post('/meetings', payload)
  return parseApiResponse(meetingSchema, data)
}

export async function stopMeeting(id: string) {
  const { data } = await apiClient.post(`/meetings/${id}/stop`)
  return parseApiResponse(stopMeetingResponseSchema, data)
}

export async function fetchTranscript(meetingId: string) {
  const { data } = await apiClient.get(`/meetings/${meetingId}/transcript`)
  return parseApiResponse(transcriptResponseSchema, data)
}
