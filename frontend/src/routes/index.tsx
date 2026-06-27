import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Добро пожаловать на React 19 SPA!</h1>
      <p className="text-muted-foreground">Проект успешно развернут на самом свежем стеке.</p>
    </div>
  )
}
