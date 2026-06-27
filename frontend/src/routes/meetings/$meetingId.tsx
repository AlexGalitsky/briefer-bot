import { useMemo } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TranscriptView } from '@/features/meetings/components/transcript-view'
import { SummaryView } from '@/features/meetings/components/summary-view'
import { TasksList } from '@/features/meetings/components/tasks-list'
import { useMeeting, useTranscript } from '@/features/meetings/api/use-transcript'
import { useTranscriptStream } from '@/features/meetings/api/use-transcript-stream'
import { useStopMeeting } from '@/features/meetings/api/use-meetings'
import {
  useRegenerateSummary,
  useSummary,
  useTasks,
  useUpdateTask,
} from '@/features/meetings/api/use-summary'
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

  const isEnded =
    meetingData?.meeting.status === 'ended' ||
    meetingData?.meeting.status === 'failed'

  const { liveSegments, connected, pollingFallback } = useTranscriptStream(
    meetingId,
    isLive,
  )

  const { data: transcriptData, isLoading: transcriptLoading } = useTranscript(
    meetingId,
    { pollWhileLive: isLive && pollingFallback },
  )

  const { data: summaryData, isLoading: summaryLoading } = useSummary(meetingId)
  const { data: tasksData, isLoading: tasksLoading } = useTasks(meetingId)

  const regenerateSummary = useRegenerateSummary(meetingId)
  const updateTask = useUpdateTask(meetingId)

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

  const handleRegenerate = async () => {
    try {
      await regenerateSummary.mutateAsync()
      toast.success('Генерация выжимки запущена')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      await updateTask.mutateAsync({ taskId, completed })
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
              Встреча
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

      <Tabs defaultValue="transcript" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
          <TabsTrigger value="transcript">Стенограмма</TabsTrigger>
          <TabsTrigger value="summary">Выжимка</TabsTrigger>
          <TabsTrigger value="tasks">Задачи</TabsTrigger>
        </TabsList>

        <TabsContent value="transcript" className="mt-4">
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
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          <SummaryView
            summary={summaryData?.summary}
            isLoading={summaryLoading}
            onRegenerate={handleRegenerate}
            regenerating={regenerateSummary.isPending}
            canRegenerate={isEnded}
          />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <TasksList
            tasks={tasksData?.tasks ?? []}
            isLoading={tasksLoading}
            onToggle={handleToggleTask}
            togglingId={
              updateTask.isPending ? (updateTask.variables?.taskId ?? null) : null
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
