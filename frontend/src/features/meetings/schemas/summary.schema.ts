import { z } from 'zod'

export const summaryStatusSchema = z.enum([
  'pending',
  'processing',
  'ready',
  'failed',
  'skipped',
])

export const meetingSummarySchema = z.object({
  id: z.string().uuid(),
  status: summaryStatusSchema,
  contentMarkdown: z.string().nullable(),
  model: z.string().nullable(),
  processingTimeSec: z.number().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export const meetingTaskSchema = z.object({
  id: z.string().uuid(),
  meetingId: z.string().uuid(),
  summaryId: z.string().uuid().nullable().optional(),
  title: z.string(),
  assignee: z.string().nullable(),
  dueDate: z.string().nullable(),
  completed: z.boolean(),
  sortOrder: z.number(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})

export const summaryResponseSchema = z.object({
  meetingId: z.string().uuid(),
  summary: meetingSummarySchema.nullable(),
})

export const tasksResponseSchema = z.object({
  meetingId: z.string().uuid(),
  tasks: z.array(meetingTaskSchema),
})

export type MeetingSummary = z.infer<typeof meetingSummarySchema>
export type MeetingTask = z.infer<typeof meetingTaskSchema>
