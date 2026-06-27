import type { PublicUser } from '@/features/auth/schemas/auth.schema'

const TOKEN_KEY = 'briefer_access_token'
const USER_KEY = 'briefer_user'

export function getAccessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): PublicUser | null {
  const raw = sessionStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PublicUser
  } catch {
    return null
  }
}

export function saveSession(accessToken: string, user: PublicUser): void {
  sessionStorage.setItem(TOKEN_KEY, accessToken)
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession(): void {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken())
}
