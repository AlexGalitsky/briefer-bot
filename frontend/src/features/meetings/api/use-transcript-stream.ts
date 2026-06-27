import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { getAccessToken } from '@/lib/auth-session'
import {
  transcriptSegmentSchema,
  type TranscriptSegment,
} from '@/features/meetings/schemas/meeting.schema'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

const MAX_RETRIES = 8
const BASE_DELAY_MS = 1000
const MAX_DELAY_MS = 30_000

function backoffDelay(attempt: number): number {
  return Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS)
}

export function useTranscriptStream(meetingId: string, enabled: boolean) {
  const [liveSegments, setLiveSegments] = useState<TranscriptSegment[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const seenIds = useRef(new Set<string>())
  const retryAttempt = useRef(0)
  const mounted = useRef(true)

  const resetStream = useCallback(() => {
    seenIds.current.clear()
    setLiveSegments([])
    setConnected(false)
    setError(null)
    retryAttempt.current = 0
    setRetryCount(0)
  }, [])

  useEffect(() => {
    if (!enabled || !meetingId) {
      resetStream()
      return
    }

    mounted.current = true
    let controller: AbortController | null = null

    const connect = () => {
      const token = getAccessToken()
      if (!token) return

      controller?.abort()
      controller = new AbortController()

      void fetchEventSource(
        `${API_URL}/meetings/${meetingId}/transcript/stream`,
        {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${token}` },
          openWhenHidden: true,
          onopen: async (response) => {
            if (!mounted.current) return
            if (response.ok) {
              setConnected(true)
              setError(null)
              retryAttempt.current = 0
              setRetryCount(0)
              return
            }
            throw new Error(`SSE: HTTP ${response.status}`)
          },
          onmessage: (event) => {
            if (!event.data) return
            try {
              const parsed = transcriptSegmentSchema.parse(
                JSON.parse(event.data),
              )
              if (seenIds.current.has(parsed.id)) return
              seenIds.current.add(parsed.id)
              setLiveSegments((prev) => [...prev, parsed])
            } catch {
              // пропускаем битые события
            }
          },
          onerror: () => {
            if (!mounted.current) return
            setConnected(false)

            if (retryAttempt.current >= MAX_RETRIES) {
              setError('Не удалось подключиться к live-потоку')
              throw new Error('SSE max retries')
            }

            const delay = backoffDelay(retryAttempt.current)
            retryAttempt.current += 1
            setRetryCount(retryAttempt.current)

            return delay
          },
          onclose: () => {
            if (!mounted.current) return
            setConnected(false)
          },
        },
      ).catch(() => {
        if (!mounted.current) return
        setConnected(false)
      })
    }

    connect()

    return () => {
      mounted.current = false
      controller?.abort()
      setConnected(false)
    }
  }, [meetingId, enabled, resetStream])

  return { liveSegments, connected, error, retryCount, pollingFallback: !connected }
}
