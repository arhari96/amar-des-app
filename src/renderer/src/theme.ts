import { createTheme, type Theme } from '@mui/material/styles'

export type ThemeMode = 'light' | 'dark'

export function buildTheme(mode: ThemeMode): Theme {
  return createTheme({
    palette: {
      mode,
      primary: { main: '#3949ab' },
      secondary: { main: '#00897b' },
      ...(mode === 'dark'
        ? { background: { default: '#0f172a', paper: '#1e293b' } }
        : { background: { default: '#f4f6fb', paper: '#ffffff' } })
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: 'Inter, Roboto, "Helvetica Neue", system-ui, sans-serif'
    }
  })
}
