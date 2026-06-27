import { useEffect, useMemo, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import type { TranscriptSegment } from '@/features/meetings/schemas/meeting.schema'

interface TranscriptViewProps {
  segments: TranscriptSegment[]
  live?: boolean
  connected?: boolean
  polling?: boolean
}

export function TranscriptView({
  segments,
  live = false,
  connected = false,
  polling = false,
}: TranscriptViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  const sorted = useMemo(
    () =>
      [...segments].sort(
        (a, b) => a.startedAt.getTime() - b.startedAt.getTime(),
      ),
    [segments],
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sorted.length])

  const liveLabel = connected
    ? 'Live'
    : polling
      ? 'Обновление каждые 5 с'
      : 'Переподключение…'

  return (
    <div className="space-y-3">
      {live && (
        <div className="flex items-center gap-2">
          <Badge variant={connected ? 'default' : 'secondary'}>{liveLabel}</Badge>
        </div>
      )}
      <ScrollArea className="h-[min(55dvh,520px)] rounded-lg border bg-card p-3 sm:h-[min(60vh,520px)] sm:p-4 md:h-[min(65vh,600px)]">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Стенограмма пока пуста. Речь появится здесь после распознавания.
          </p>
        ) : (
          <ul className="space-y-4">
            {sorted.map((segment) => (
              <li key={segment.id} className="text-sm">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-medium text-foreground">
                    {segment.speaker}
                  </span>
                  <span className="text-xs text-muted-foreground sm:text-sm">
                    {segment.startedAt.toLocaleTimeString('ru-RU')}
                  </span>
                </div>
                <p className="mt-1 leading-relaxed">{segment.text}</p>
              </li>
            ))}
            <div ref={bottomRef} />
          </ul>
        )}
      </ScrollArea>
    </div>
  )
}
