import { createRootRouteWithContext, Outlet, redirect } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import type { QueryClient } from '@tanstack/react-query'
import { ThemeProvider } from '@/components/shared/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { AppLayout } from '@/components/shared/app-layout'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { isAuthenticated } from '@/lib/auth-session'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: () => {
    useAuthStore.getState().hydrate()
  },
  component: RootComponent,
})

function RootComponent() {
  const hydrated = useAuthStore((s) => s.hydrated)
  const authed = isAuthenticated()

  if (!hydrated) {
    return (
      <ThemeProvider>
        <div className="flex min-h-screen items-center justify-center text-muted-foreground">
          Загрузка…
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      {authed ? (
        <AppLayout>
          <Outlet />
        </AppLayout>
      ) : (
        <div className="min-h-screen bg-background">
          <Outlet />
        </div>
      )}
      <Toaster richColors position="top-center" />
      <TanStackRouterDevtools />
    </ThemeProvider>
  )
}

export function requireAuth() {
  if (!isAuthenticated()) {
    throw redirect({ to: '/login' })
  }
}

export function redirectIfAuthed() {
  if (isAuthenticated()) {
    throw redirect({ to: '/meetings' })
  }
}
