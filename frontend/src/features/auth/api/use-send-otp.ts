import { useMutation } from '@tanstack/react-query'
import { sendOtp } from '@/features/auth/api/auth.api'
import type { OtpPurpose } from '@/features/auth/schemas/auth.schema'

export function useSendOtp() {
  return useMutation({
    mutationFn: ({ phone, purpose }: { phone: string; purpose: OtpPurpose }) =>
      sendOtp(phone, purpose),
  })
}
