import { useMutation } from '@tanstack/react-query'
import { verifyOtp } from '@/features/auth/api/auth.api'
import type { OtpPurpose } from '@/features/auth/schemas/auth.schema'

export function useVerifyOtp() {
  return useMutation({
    mutationFn: (params: {
      phone: string
      code: string
      purpose: OtpPurpose
      totpCode?: string
    }) => verifyOtp(params),
  })
}
