import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: () => <div className="text-xl">Страница "О нас"</div>,
})
