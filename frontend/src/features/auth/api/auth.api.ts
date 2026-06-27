import { apiClient } from '@/lib/api-client'
import { parseApiResponse } from '@/lib/parse-api'
import {
  sendOtpBodySchema,
  sendOtpResponseSchema,
  totpConfirmResponseSchema,
  totpDisableResponseSchema,
  totpSetupResponseSchema,
  verifyOtpBodySchema,
  verifyOtpResponseSchema,
  type OtpPurpose,
  type SendOtpResponse,
  type TotpSetupResponse,
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

export async function setupTotp(): Promise<TotpSetupResponse> {
  const { data } = await apiClient.post('/auth/totp/setup')
  return parseApiResponse(totpSetupResponseSchema, data)
}

export async function confirmTotp(code: string) {
  const { data } = await apiClient.post('/auth/totp/confirm', { code })
  return parseApiResponse(totpConfirmResponseSchema, data)
}

export async function disableTotp() {
  const { data } = await apiClient.delete('/auth/totp')
  return parseApiResponse(totpDisableResponseSchema, data)
}
