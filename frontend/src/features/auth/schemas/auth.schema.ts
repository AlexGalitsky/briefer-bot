import { z } from 'zod'

export const otpPurposeSchema = z.enum(['register', 'login'])

export const phoneSchema = z
  .string()
  .min(10, 'Введите номер телефона')
  .max(18, 'Слишком длинный номер')

export const otpCodeSchema = z
  .string()
  .length(6, 'Код — 6 цифр')
  .regex(/^\d+$/, 'Только цифры')

export const totpCodeSchema = z
  .string()
  .length(6, 'Код — 6 цифр')
  .regex(/^\d+$/, 'Только цифры')

export const sendOtpBodySchema = z.object({
  phone: phoneSchema,
  purpose: otpPurposeSchema,
})

export const verifyOtpBodySchema = z.object({
  phone: phoneSchema,
  code: otpCodeSchema,
  purpose: otpPurposeSchema,
  totpCode: totpCodeSchema.optional(),
})

export const publicUserSchema = z.object({
  id: z.string().uuid(),
  phone: z.string(),
  role: z.enum(['admin', 'user']),
  totpEnabled: z.boolean(),
  createdAt: z.coerce.date(),
})

export const sendOtpResponseSchema = z.object({
  phone: z.string(),
  challengeId: z.string().uuid(),
  expiresInSec: z.number(),
  devCode: z.string().optional(),
})

export const verifyOtpRequiresTotpSchema = z.object({
  requiresTotp: z.literal(true),
  phone: z.string(),
  message: z.string(),
})

export const verifyOtpSuccessSchema = z.object({
  requiresTotp: z.literal(false),
  accessToken: z.string(),
  user: publicUserSchema,
})

export const verifyOtpResponseSchema = z.union([
  verifyOtpRequiresTotpSchema,
  verifyOtpSuccessSchema,
])

export type OtpPurpose = z.infer<typeof otpPurposeSchema>
export type PublicUser = z.infer<typeof publicUserSchema>
export type SendOtpResponse = z.infer<typeof sendOtpResponseSchema>
export type VerifyOtpResponse = z.infer<typeof verifyOtpResponseSchema>
