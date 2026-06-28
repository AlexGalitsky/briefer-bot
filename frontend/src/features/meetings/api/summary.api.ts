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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function filenameFromDisposition(header: string | undefined, fallback: string) {
  if (!header) return fallback
  const match = header.match(/filename="?([^";\n]+)"?/)
  return match?.[1] ?? fallback
}

export async function downloadSummaryMarkdown(meetingId: string) {
  const response = await apiClient.get(
    `/meetings/${meetingId}/summary/export/markdown`,
    { responseType: 'blob' },
  )
  const filename = filenameFromDisposition(
    response.headers['content-disposition'] as string | undefined,
    `summary-${meetingId.slice(0, 8)}.md`,
  )
  downloadBlob(response.data as Blob, filename)
}

export async function downloadSummaryPdf(meetingId: string) {
  const response = await apiClient.get(
    `/meetings/${meetingId}/summary/export/pdf`,
    { responseType: 'blob' },
  )
  const filename = filenameFromDisposition(
    response.headers['content-disposition'] as string | undefined,
    `summary-${meetingId.slice(0, 8)}.pdf`,
  )
  downloadBlob(response.data as Blob, filename)
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
