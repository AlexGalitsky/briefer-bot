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
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Встречи</h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Подключайте бота к созвонам и смотрите стенограмму
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-start">
        <StartMeetingForm />

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">История</h2>
          {isLoading && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          )}
          {!isLoading && data?.meetings.length === 0 && (
            <p className="text-sm text-muted-foreground">Встреч пока нет</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
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
    </div>
  )
}
