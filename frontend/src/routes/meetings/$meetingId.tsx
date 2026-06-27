import { useMemo } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TranscriptView } from '@/features/meetings/components/transcript-view'
import { useMeeting, useTranscript } from '@/features/meetings/api/use-transcript'
import { useTranscriptStream } from '@/features/meetings/api/use-transcript-stream'
import { useStopMeeting } from '@/features/meetings/api/use-meetings'
import { requireAuth } from '@/routes/__root'
import { getApiErrorMessage } from '@/lib/parse-api'

export const Route = createFileRoute('/meetings/$meetingId')({
  beforeLoad: requireAuth,
  component: MeetingDetailPage,
})

function MeetingDetailPage() {
  const { meetingId } = Route.useParams()
  const navigate = useNavigate()
  const stopMeeting = useStopMeeting()
  const { data: meetingData, isLoading: meetingLoading } = useMeeting(meetingId)

  const isLive =
    meetingData?.meeting.status === 'active' ||
    meetingData?.meeting.status === 'starting'

  const { liveSegments, connected, pollingFallback } = useTranscriptStream(
    meetingId,
    isLive,
  )

  const { data: transcriptData, isLoading: transcriptLoading } = useTranscript(
    meetingId,
    { pollWhileLive: isLive && pollingFallback },
  )

  const allSegments = useMemo(() => {
    const base = transcriptData?.segments ?? []
    const merged = new Map(base.map((s) => [s.id, s]))
    for (const segment of liveSegments) {
      merged.set(segment.id, segment)
    }
    return [...merged.values()]
  }, [transcriptData?.segments, liveSegments])

  const handleStop = async () => {
    try {
      await stopMeeting.mutateAsync(meetingId)
      toast.success('Встреча остановлена')
      void navigate({ to: '/meetings' })
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  if (meetingLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  const meeting = meetingData?.meeting
  if (!meeting) {
    return <p className="text-muted-foreground">Встреча не найдена</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">
              Стенограмма
            </h1>
            <Badge>{meeting.status}</Badge>
          </div>
          <p className="break-all text-sm text-muted-foreground">{meeting.url}</p>
        </div>
        {(meeting.status === 'active' || meeting.status === 'starting') && (
          <Button
            variant="destructive"
            className="w-full shrink-0 sm:w-auto"
            onClick={handleStop}
            disabled={stopMeeting.isPending}
          >
            {stopMeeting.isPending ? 'Остановка…' : 'Остановить бота'}
          </Button>
        )}
      </div>

      {transcriptLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <TranscriptView
          segments={allSegments}
          live={isLive}
          connected={connected}
          polling={pollingFallback}
        />
      )}
    </div>
  )
}
