import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      <nav className="p-4 flex gap-4 border-b bg-card">
        <Link to="/" className="[&.active]:font-bold text-primary">Главная</Link>
        <Link to="/about" className="[&.active]:font-bold text-primary">О нас</Link>
      </nav>
      <main className="p-6">
        <Outlet />
      </main>
      <TanStackRouterDevtools />
    </div>
  ),
})
