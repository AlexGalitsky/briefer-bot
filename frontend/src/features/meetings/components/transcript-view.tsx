import { useEffect, useMemo, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import type { TranscriptSegment } from '@/features/meetings/schemas/meeting.schema'

interface TranscriptViewProps {
  segments: TranscriptSegment[]
  live?: boolean
  connected?: boolean
}

export function TranscriptView({
  segments,
  live = false,
  connected = false,
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

  return (
    <div className="space-y-3">
      {live && (
        <div className="flex items-center gap-2">
          <Badge variant={connected ? 'default' : 'secondary'}>
            {connected ? 'Live' : 'Переподключение…'}
          </Badge>
        </div>
      )}
      <ScrollArea className="h-[min(60vh,520px)] rounded-lg border bg-card p-4">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Стенограмма пока пуста. Речь появится здесь после распознавания.
          </p>
        ) : (
          <ul className="space-y-3">
            {sorted.map((segment) => (
              <li key={segment.id} className="text-sm">
                <span className="font-medium text-foreground">
                  {segment.speaker}
                </span>
                <span className="mx-2 text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  {segment.startedAt.toLocaleTimeString('ru-RU')}
                </span>
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
