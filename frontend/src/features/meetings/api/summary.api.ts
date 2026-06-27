import { z } from 'zod'
import { apiClient } from '@/lib/api-client'
import { parseApiResponse } from '@/lib/parse-api'
import {
  summaryResponseSchema,
  tasksResponseSchema,
  meetingTaskSchema,
} from '@/features/meetings/schemas/summary.schema'

export async function fetchSummary(meetingId: string) {
  const { data } = await apiClient.get(`/meetings/${meetingId}/summary`)
  return parseApiResponse(summaryResponseSchema, data)
}

export async function fetchTasks(meetingId: string) {
  const { data } = await apiClient.get(`/meetings/${meetingId}/tasks`)
  return parseApiResponse(tasksResponseSchema, data)
}

export async function regenerateSummary(meetingId: string) {
  const { data } = await apiClient.post(
    `/meetings/${meetingId}/summary/regenerate`,
  )
  return data as { meetingId: string; message: string }
}

export async function updateTaskCompleted(
  meetingId: string,
  taskId: string,
  completed: boolean,
) {
  const { data } = await apiClient.patch(
    `/meetings/${meetingId}/tasks/${taskId}`,
    { completed },
  )
  return parseApiResponse(z.object({ task: meetingTaskSchema }), data)
}
