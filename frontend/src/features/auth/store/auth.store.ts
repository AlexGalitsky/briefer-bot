import { create } from 'zustand'
import {
  clearSession,
  getAccessToken,
  getStoredUser,
  saveSession,
} from '@/lib/auth-session'
import type { PublicUser } from '@/features/auth/schemas/auth.schema'

interface AuthStore {
  accessToken: string | null
  user: PublicUser | null
  hydrated: boolean
  hydrate: () => void
  setSession: (accessToken: string, user: PublicUser) => void
  updateUser: (patch: Partial<PublicUser>) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: null,
  user: null,
  hydrated: false,
  hydrate: () => {
    set({
      accessToken: getAccessToken(),
      user: getStoredUser(),
      hydrated: true,
    })
  },
  setSession: (accessToken, user) => {
    saveSession(accessToken, user)
    set({ accessToken, user })
  },
  updateUser: (patch) => {
    set((state) => {
      if (!state.user || !state.accessToken) return state
      const user = { ...state.user, ...patch }
      saveSession(state.accessToken, user)
      return { user }
    })
  },
  logout: () => {
    clearSession()
    set({ accessToken: null, user: null })
  },
}))
