import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { useSendOtp } from '@/features/auth/api/use-send-otp'
import { useVerifyOtp } from '@/features/auth/api/use-verify-otp'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { getApiErrorMessage } from '@/lib/parse-api'
import {
  otpCodeSchema,
  phoneSchema,
  totpCodeSchema,
  type OtpPurpose,
} from '@/features/auth/schemas/auth.schema'

const phoneFormSchema = z.object({ phone: phoneSchema })
const otpFormSchema = z.object({ code: otpCodeSchema })
const totpFormSchema = z.object({ totpCode: totpCodeSchema })

type Step = 'phone' | 'otp' | 'totp'

interface PhoneAuthFormProps {
  purpose: OtpPurpose
  title: string
  description: string
  alternateLink: { to: '/login' | '/register'; label: string }
}

export function PhoneAuthForm({
  purpose,
  title,
  description,
  alternateLink,
}: PhoneAuthFormProps) {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const sendOtp = useSendOtp()
  const verifyOtp = useVerifyOtp()

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)

  const phoneForm = useForm({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { phone: '' },
  })

  const otpForm = useForm({
    resolver: zodResolver(otpFormSchema),
    defaultValues: { code: '' },
  })

  const totpForm = useForm({
    resolver: zodResolver(totpFormSchema),
    defaultValues: { totpCode: '' },
  })

  const onSendOtp = phoneForm.handleSubmit(async (values) => {
    try {
      const result = await sendOtp.mutateAsync({
        phone: values.phone,
        purpose,
      })
      setPhone(result.phone)
      setDevCode(result.devCode ?? null)
      setStep('otp')
      toast.success('Код отправлен')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  })

  const onVerifyOtp = otpForm.handleSubmit(async (values) => {
    try {
      const result = await verifyOtp.mutateAsync({
        phone,
        code: values.code,
        purpose,
      })

      if (result.requiresTotp) {
        setStep('totp')
        toast.message(result.message)
        return
      }

      setSession(result.accessToken, result.user)
      toast.success('Вы вошли в систему')
      void navigate({ to: '/meetings' })
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  })

  const onVerifyTotp = totpForm.handleSubmit(async (values) => {
    try {
      const result = await verifyOtp.mutateAsync({
        phone,
        code: otpForm.getValues('code'),
        purpose,
        totpCode: values.totpCode,
      })

      if (result.requiresTotp) {
        toast.error('Неверный код аутентификатора')
        return
      }

      setSession(result.accessToken, result.user)
      toast.success('Вы вошли в систему')
      void navigate({ to: '/meetings' })
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  })

  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 'phone' && (
            <form onSubmit={onSendOtp}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="phone">Телефон</FieldLabel>
                  <Input
                    id="phone"
                    placeholder="+79991234567"
                    autoComplete="tel"
                    {...phoneForm.register('phone')}
                  />
                  {phoneForm.formState.errors.phone && (
                    <FieldDescription className="text-destructive">
                      {phoneForm.formState.errors.phone.message}
                    </FieldDescription>
                  )}
                </Field>
                <Button type="submit" className="w-full" disabled={sendOtp.isPending}>
                  {sendOtp.isPending ? 'Отправка…' : 'Получить код'}
                </Button>
              </FieldGroup>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={onVerifyOtp} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Код отправлен на {phone}
                {devCode && (
                  <span className="mt-1 block font-mono text-foreground">
                    Dev-код: {devCode}
                  </span>
                )}
              </p>
              <Field>
                <FieldLabel>Код из SMS</FieldLabel>
                <InputOTP
                  maxLength={6}
                  value={otpForm.watch('code')}
                  onChange={(value) => otpForm.setValue('code', value)}
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
              </Field>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('phone')}
                >
                  Назад
                </Button>
                <Button type="submit" className="flex-1" disabled={verifyOtp.isPending}>
                  {verifyOtp.isPending ? 'Проверка…' : 'Войти'}
                </Button>
              </div>
            </form>
          )}

          {step === 'totp' && (
            <form onSubmit={onVerifyTotp} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Введите код из приложения-аутентификатора
              </p>
              <Field>
                <FieldLabel>TOTP</FieldLabel>
                <InputOTP
                  maxLength={6}
                  value={totpForm.watch('totpCode')}
                  onChange={(value) => totpForm.setValue('totpCode', value)}
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
              </Field>
              <Button type="submit" className="w-full" disabled={verifyOtp.isPending}>
                {verifyOtp.isPending ? 'Проверка…' : 'Подтвердить'}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground">
            <Link
              to={alternateLink.to}
              className="text-primary underline-offset-4 hover:underline"
            >
              {alternateLink.label}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
