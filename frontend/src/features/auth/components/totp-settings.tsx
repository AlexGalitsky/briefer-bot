import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { confirmTotp, disableTotp, setupTotp } from '@/features/auth/api/auth.api'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { getApiErrorMessage } from '@/lib/parse-api'

export function TotpSettings() {
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null)
  const [confirmCode, setConfirmCode] = useState('')

  const setupMutation = useMutation({
    mutationFn: setupTotp,
    onSuccess: (data) => {
      setOtpauthUrl(data.otpauthUrl)
      toast.success('Отсканируйте QR-код в приложении аутентификатора')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const confirmMutation = useMutation({
    mutationFn: (code: string) => confirmTotp(code),
    onSuccess: () => {
      updateUser({ totpEnabled: true })
      setOtpauthUrl(null)
      setConfirmCode('')
      toast.success('Двухфакторная аутентификация включена')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const disableMutation = useMutation({
    mutationFn: disableTotp,
    onSuccess: () => {
      updateUser({ totpEnabled: false })
      setOtpauthUrl(null)
      toast.success('TOTP отключён')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  if (!user) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Двухфакторная аутентификация (TOTP)</CardTitle>
        <CardDescription>
          Google Authenticator, 1Password, Authy и другие приложения с поддержкой
          TOTP
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {user.totpEnabled ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              TOTP включён для аккаунта {user.phone}. При входе потребуется код из
              приложения после SMS.
            </p>
            <Button
              type="button"
              variant="destructive"
              disabled={disableMutation.isPending}
              onClick={() => disableMutation.mutate()}
            >
              {disableMutation.isPending ? 'Отключение…' : 'Отключить TOTP'}
            </Button>
          </div>
        ) : otpauthUrl ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="rounded-lg border bg-white p-3">
                <QRCodeSVG value={otpauthUrl} size={180} level="M" />
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. Отсканируйте QR-код в приложении аутентификатора</p>
                <p>2. Введите 6-значный код для подтверждения</p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3">
              <InputOTP
                maxLength={6}
                value={confirmCode}
                onChange={setConfirmCode}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              <Button
                type="button"
                disabled={
                  confirmCode.length !== 6 || confirmMutation.isPending
                }
                onClick={() => confirmMutation.mutate(confirmCode)}
              >
                {confirmMutation.isPending ? 'Проверка…' : 'Подтвердить'}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            disabled={setupMutation.isPending}
            onClick={() => setupMutation.mutate()}
          >
            {setupMutation.isPending ? 'Подготовка…' : 'Настроить TOTP'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
