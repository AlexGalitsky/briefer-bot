import { z } from 'zod'

export const meetingPlatformSchema = z.enum(['yandex-telemost', 'google-meet'])

export const meetingStatusSchema = z.enum([
  'pending',
  'starting',
  'active',
  'ended',
  'failed',
])

export const meetingSchema = z.object({
  id: z.string().uuid(),
  platform: meetingPlatformSchema,
  url: z.string(),
  botName: z.string(),
  status: meetingStatusSchema,
  startedAt: z.coerce.date().nullable(),
  endedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
  createdById: z.string().uuid().optional(),
})

export const createMeetingBodySchema = z.object({
  url: z.string().url('Укажите корректный URL встречи'),
  botName: z.string().max(100).optional(),
})

export const meetingsListResponseSchema = z.object({
  meetings: z.array(meetingSchema),
})

export const meetingDetailResponseSchema = z.object({
  meeting: meetingSchema,
  segmentCount: z.number(),
})

export const transcriptSegmentSchema = z.object({
  id: z.string().uuid(),
  meetingId: z.string().uuid(),
  speaker: z.string(),
  text: z.string(),
  startedAt: z.coerce.date(),
  durationSec: z.number(),
  source: z.string(),
  createdAt: z.coerce.date().optional(),
})

export const transcriptResponseSchema = z.object({
  meetingId: z.string().uuid(),
  segments: z.array(transcriptSegmentSchema),
  fullText: z.string(),
})

export type Meeting = z.infer<typeof meetingSchema>
export type TranscriptSegment = z.infer<typeof transcriptSegmentSchema>
