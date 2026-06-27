import { apiClient } from '@/lib/api-client'
import { parseApiResponse } from '@/lib/parse-api'
import {
  sendOtpBodySchema,
  sendOtpResponseSchema,
  verifyOtpBodySchema,
  verifyOtpResponseSchema,
  type OtpPurpose,
  type SendOtpResponse,
  type VerifyOtpResponse,
} from '@/features/auth/schemas/auth.schema'

export async function sendOtp(
  phone: string,
  purpose: OtpPurpose,
): Promise<SendOtpResponse> {
  const body = sendOtpBodySchema.parse({ phone, purpose })
  const { data } = await apiClient.post('/auth/otp/send', body)
  return parseApiResponse(sendOtpResponseSchema, data)
}

export async function verifyOtp(params: {
  phone: string
  code: string
  purpose: OtpPurpose
  totpCode?: string
}): Promise<VerifyOtpResponse> {
  const body = verifyOtpBodySchema.parse(params)
  const { data } = await apiClient.post('/auth/otp/verify', body)
  return parseApiResponse(verifyOtpResponseSchema, data)
}
