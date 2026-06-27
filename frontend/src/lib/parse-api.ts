import { z } from 'zod'

export class ApiValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiValidationError'
  }
}

export function parseApiResponse<T extends z.ZodType>(
  schema: T,
  data: unknown,
): z.infer<T> {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new ApiValidationError('Неверный формат ответа API')
  }
  return result.data
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiValidationError) {
    return 'Сервер вернул неожиданные данные'
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { message?: unknown } } }).response
      ?.data?.message === 'string'
  ) {
    const messages = (error as { response: { data: { message: string | string[] } } })
      .response.data.message
    return Array.isArray(messages) ? messages.join(', ') : messages
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Неизвестная ошибка'
}
