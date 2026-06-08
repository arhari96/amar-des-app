import { create } from 'zustand'
import type { ThemeMode } from '../theme'

interface UiState {
  mode: ThemeMode
  toggleMode: () => void
}

export const useUi = create<UiState>((set) => ({
  mode: (localStorage.getItem('mode') as ThemeMode) || 'dark',
  toggleMode: () =>
    set((s) => {
      const mode: ThemeMode = s.mode === 'dark' ? 'light' : 'dark'
      localStorage.setItem('mode', mode)
      return { mode }
    })
}))
