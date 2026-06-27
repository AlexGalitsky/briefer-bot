import { Link, useNavigate } from '@tanstack/react-router'
import { LogOutIcon, MenuIcon, ShieldIcon, VideoIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children: React.ReactNode
}

const navLinks = [
  { to: '/meetings' as const, label: 'Встречи', icon: VideoIcon },
  { to: '/settings/security' as const, label: 'Безопасность', icon: ShieldIcon },
]

function NavLink({
  to,
  label,
  icon: Icon,
  onNavigate,
  className,
}: {
  to: (typeof navLinks)[number]['to']
  label: string
  icon: typeof VideoIcon
  onNavigate?: () => void
  className?: string
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground [&.active]:font-medium [&.active]:text-foreground',
        className,
      )}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </Link>
  )
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = () => {
    logout()
    void navigate({ to: '/login' })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-6">
            {isMobile && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="shrink-0">
                    <MenuIcon />
                    <span className="sr-only">Меню</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72">
                  <SheetHeader>
                    <SheetTitle>Briefer</SheetTitle>
                  </SheetHeader>
                  <nav className="mt-6 flex flex-col gap-4 text-sm">
                    {navLinks.map((link) => (
                      <NavLink key={link.to} {...link} />
                    ))}
                  </nav>
                  {user && (
                    <p className="mt-8 text-sm text-muted-foreground">{user.phone}</p>
                  )}
                </SheetContent>
              </Sheet>
            )}

            <Link
              to="/meetings"
              className="truncate text-lg font-semibold tracking-tight"
            >
              Briefer
            </Link>

            {!isMobile && (
              <nav className="flex gap-4 text-sm">
                {navLinks.map((link) => (
                  <NavLink key={link.to} {...link} />
                ))}
              </nav>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {user && (
              <span className="hidden max-w-[140px] truncate text-sm text-muted-foreground md:inline lg:max-w-none">
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

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
    </div>
  )
}
