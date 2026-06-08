import { create } from 'zustand'
import type { AuthUser } from '../../../shared/types'

interface AuthState {
  user: AuthUser | null
  token: string | null
  error: string | null
  loading: boolean
  booting: boolean // true until the startup auto-login attempt resolves
  login: (username: string, password: string, remember?: boolean) => Promise<boolean>
  autoLogin: () => Promise<void>
  logout: () => void
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: null,
  error: null,
  loading: false,
  booting: true,
  login: async (username, password, remember = true) => {
    set({ loading: true, error: null })
    const res = await window.api.login(username, password, remember)
    if (res.ok && res.user && res.token) {
      set({ user: res.user, token: res.token, loading: false })
      return true
    }
    set({ error: res.error ?? 'Login failed', loading: false })
    return false
  },
  autoLogin: async () => {
    try {
      const res = await window.api.autoLogin()
      if (res.ok && res.user && res.token) {
        set({ user: res.user, token: res.token })
      }
    } finally {
      set({ booting: false })
    }
  },
  logout: () => {
    void window.api.logout()
    set({ user: null, token: null, error: null })
  }
}))
