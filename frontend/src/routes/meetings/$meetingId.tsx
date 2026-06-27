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
  const { data: meetingData, isLoading: meetingLoading } = useMeeting(meetingId)
  const { data: transcriptData, isLoading: transcriptLoading } =
    useTranscript(meetingId)
  const stopMeeting = useStopMeeting()

  const isLive =
    meetingData?.meeting.status === 'active' ||
    meetingData?.meeting.status === 'starting'

  const { liveSegments, connected } = useTranscriptStream(meetingId, isLive)

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Стенограмма</h1>
            <Badge>{meeting.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground break-all">{meeting.url}</p>
        </div>
        {(meeting.status === 'active' || meeting.status === 'starting') && (
          <Button
            variant="destructive"
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
        />
      )}
    </div>
  )
}
