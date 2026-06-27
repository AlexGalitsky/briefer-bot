import { Link, useNavigate } from '@tanstack/react-router'
import { LogOutIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { useAuthStore } from '@/features/auth/store/auth.store'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = () => {
    logout()
    void navigate({ to: '/login' })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link to="/meetings" className="text-lg font-semibold tracking-tight">
              Briefer
            </Link>
            <nav className="hidden gap-4 text-sm sm:flex">
              <Link
                to="/meetings"
                className="text-muted-foreground transition-colors hover:text-foreground [&.active]:font-medium [&.active]:text-foreground"
              >
                Встречи
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user.phone}
              </span>
            )}
            <ThemeToggle />
            <Button type="button" variant="ghost" size="icon" onClick={handleLogout}>
              <LogOutIcon />
              <span className="sr-only">Выйти</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  )
}
