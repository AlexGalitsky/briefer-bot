import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { MeetingCard } from '@/features/meetings/components/meeting-card'
import { StartMeetingForm } from '@/features/meetings/components/start-meeting-form'
import { useMeetings, useStopMeeting } from '@/features/meetings/api/use-meetings'
import { requireAuth } from '@/routes/__root'
import { getApiErrorMessage } from '@/lib/parse-api'

export const Route = createFileRoute('/meetings/')({
  beforeLoad: requireAuth,
  component: MeetingsPage,
})

function MeetingsPage() {
  const { data, isLoading } = useMeetings()
  const stopMeeting = useStopMeeting()

  const handleStop = async (id: string) => {
    try {
      await stopMeeting.mutateAsync(id)
      toast.success('Встреча остановлена')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Встречи</h1>
        <p className="text-muted-foreground">
          Подключайте бота к созвонам и смотрите стенограмму
        </p>
      </div>

      <StartMeetingForm />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">История</h2>
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        )}
        {!isLoading && data?.meetings.length === 0 && (
          <p className="text-sm text-muted-foreground">Встреч пока нет</p>
        )}
        <div className="grid gap-4">
          {data?.meetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              onStop={handleStop}
              stopping={stopMeeting.isPending}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
