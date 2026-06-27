import { createFileRoute } from '@tanstack/react-router'
import { TotpSettings } from '@/features/auth/components/totp-settings'
import { requireAuth } from '@/routes/__root'

export const Route = createFileRoute('/settings/security')({
  beforeLoad: requireAuth,
  component: SecuritySettingsPage,
})

function SecuritySettingsPage() {
  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Безопасность
        </h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Настройки защиты аккаунта
        </p>
      </div>
      <TotpSettings />
    </div>
  )
}
