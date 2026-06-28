import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import type { MeetingTask } from '@/features/meetings/schemas/summary.schema'

interface TasksListProps {
  tasks: MeetingTask[]
  isLoading?: boolean
  onToggle?: (taskId: string, completed: boolean) => void
  togglingId?: string | null
}

export function TasksList({
  tasks,
  isLoading,
  onToggle,
  togglingId,
}: TasksListProps) {
  if (isLoading) {
    return <Skeleton className="h-32 w-full" />
  }

  if (tasks.length === 0) {
    return (
      <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        Задачи появятся после генерации выжимки, если они были озвучены на
        созвоне.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="flex items-start gap-3 rounded-lg border bg-card p-3"
        >
          <Checkbox
            checked={task.completed}
            disabled={togglingId === task.id}
            onCheckedChange={(checked) =>
              onToggle?.(task.id, checked === true)
            }
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p
              className={`text-sm leading-relaxed ${
                task.completed
                  ? 'text-muted-foreground line-through'
                  : 'text-foreground'
              }`}
            >
              {task.title}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {task.assignee && <span>Ответственный: {task.assignee}</span>}
              {task.dueDate && <span>Дедлайн: {task.dueDate}</span>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
