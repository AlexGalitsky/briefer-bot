import { RefreshCwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { MeetingSummary } from '@/features/meetings/schemas/summary.schema'

const statusLabels: Record<MeetingSummary['status'], string> = {
  pending: 'Ожидание',
  processing: 'Генерация…',
  ready: 'Готово',
  failed: 'Ошибка',
  skipped: 'Пропущено',
}

interface SummaryViewProps {
  summary: MeetingSummary | null | undefined
  isLoading?: boolean
  onRegenerate?: () => void
  regenerating?: boolean
  canRegenerate?: boolean
}

function renderMarkdownLine(line: string, key: number) {
  if (line.startsWith('# ')) {
    return (
      <h2 key={key} className="mt-4 text-lg font-bold first:mt-0">
        {line.slice(2)}
      </h2>
    )
  }
  if (line.startsWith('### ')) {
    return (
      <h3 key={key} className="mt-3 text-base font-semibold">
        {line.slice(4)}
      </h3>
    )
  }
  if (line.startsWith('* ') || line.startsWith('- ')) {
    return (
      <li key={key} className="ml-4 list-disc text-sm leading-relaxed">
        {line.slice(2)}
      </li>
    )
  }
  if (line.trim() === '') return <br key={key} />
  return (
    <p key={key} className="text-sm leading-relaxed">
      {line}
    </p>
  )
}

export function SummaryView({
  summary,
  isLoading,
  onRegenerate,
  regenerating,
  canRegenerate = true,
}: SummaryViewProps) {
  if (isLoading) {
    return <Skeleton className="h-48 w-full" />
  }

  if (!summary) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        Выжимка появится после завершения встречи, когда будет достаточно
        стенограммы.
        {canRegenerate && onRegenerate && (
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={regenerating}
              onClick={onRegenerate}
            >
              <RefreshCwIcon className="mr-2 size-4" />
              Сгенерировать
            </Button>
          </div>
        )}
      </div>
    )
  }

  const lines = summary.contentMarkdown?.split('\n') ?? []

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant={summary.status === 'ready' ? 'default' : 'secondary'}>
          {statusLabels[summary.status]}
        </Badge>
        {canRegenerate && onRegenerate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              regenerating ||
              summary.status === 'processing' ||
              summary.status === 'pending'
            }
            onClick={onRegenerate}
          >
            <RefreshCwIcon className="mr-2 size-4" />
            {regenerating ? 'Генерация…' : 'Перегенерировать'}
          </Button>
        )}
      </div>

      {summary.status === 'processing' || summary.status === 'pending' ? (
        <div className="space-y-2 rounded-lg border bg-card p-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <p className="text-sm text-muted-foreground">
            Ollama генерирует выжимку — это может занять 1–3 минуты…
          </p>
        </div>
      ) : summary.status === 'failed' ? (
        <p className="text-sm text-destructive">
          {summary.errorMessage ?? 'Не удалось сгенерировать выжимку'}
        </p>
      ) : summary.status === 'skipped' ? (
        <p className="text-sm text-muted-foreground">
          {summary.errorMessage ?? 'Недостаточно данных для выжимки'}
        </p>
      ) : (
        <ScrollArea className="max-h-[min(55dvh,520px)] rounded-lg border bg-card p-4">
          <article className="space-y-1">
            {lines.map((line, index) => renderMarkdownLine(line, index))}
          </article>
        </ScrollArea>
      )}

      {summary.model && summary.status === 'ready' && (
        <p className="text-xs text-muted-foreground">
          Модель: {summary.model}
          {summary.processingTimeSec != null &&
            ` · ${summary.processingTimeSec.toFixed(1)} с`}
        </p>
      )}
    </div>
  )
}
