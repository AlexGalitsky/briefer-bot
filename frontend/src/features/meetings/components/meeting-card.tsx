import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { Meeting } from '@/features/meetings/schemas/meeting.schema'

const statusLabels: Record<Meeting['status'], string> = {
  pending: 'Ожидание',
  starting: 'Запуск',
  active: 'Активна',
  ended: 'Завершена',
  failed: 'Ошибка',
}

interface MeetingCardProps {
  meeting: Meeting
  onStop?: (id: string) => void
  stopping?: boolean
}

export function MeetingCard({ meeting, onStop, stopping }: MeetingCardProps) {
  const isActive = meeting.status === 'active' || meeting.status === 'starting'

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">
            <Link
              to="/meetings/$meetingId"
              params={{ meetingId: meeting.id }}
              className="hover:underline"
            >
              {meeting.platform}
            </Link>
          </CardTitle>
          <CardDescription className="line-clamp-1">{meeting.url}</CardDescription>
        </div>
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {statusLabels[meeting.status]}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          Бот: {meeting.botName}
        </span>
        {isActive && onStop && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={stopping}
            onClick={() => onStop(meeting.id)}
          >
            {stopping ? 'Остановка…' : 'Остановить'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
