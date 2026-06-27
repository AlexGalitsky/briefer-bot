import { useEffect, useRef, useState } from 'react'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { getAccessToken } from '@/lib/auth-session'
import {
  transcriptSegmentSchema,
  type TranscriptSegment,
} from '@/features/meetings/schemas/meeting.schema'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

export function useTranscriptStream(meetingId: string, enabled: boolean) {
  const [liveSegments, setLiveSegments] = useState<TranscriptSegment[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seenIds = useRef(new Set<string>())

  useEffect(() => {
    if (!enabled || !meetingId) return

    const token = getAccessToken()
    if (!token) return

    const controller = new AbortController()

    void fetchEventSource(
      `${API_URL}/meetings/${meetingId}/transcript/stream`,
      {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${token}` },
        onopen: async (response) => {
          if (response.ok) {
            setConnected(true)
            setError(null)
            return
          }
          throw new Error(`SSE: HTTP ${response.status}`)
        },
        onmessage: (event) => {
          if (!event.data) return
          try {
            const parsed = transcriptSegmentSchema.parse(JSON.parse(event.data))
            if (seenIds.current.has(parsed.id)) return
            seenIds.current.add(parsed.id)
            setLiveSegments((prev) => [...prev, parsed])
          } catch {
            // пропускаем битые события
          }
        },
        onerror: (err) => {
          setConnected(false)
          setError(err instanceof Error ? err.message : 'Ошибка потока')
          throw err
        },
      },
    ).catch(() => {
      setConnected(false)
    })

    return () => {
      controller.abort()
      setConnected(false)
    }
  }, [meetingId, enabled])

  return { liveSegments, connected, error }
}
