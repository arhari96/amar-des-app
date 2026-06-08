import { useEffect, useMemo, type ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Box, CircularProgress, CssBaseline, ThemeProvider, Typography } from '@mui/material'
import { buildTheme } from './theme'
import { useUi } from './store/ui'
import { useAuth } from './store/auth'
import AppLayout from './components/AppLayout'
import OfflineOverlay from './components/OfflineOverlay'
import UpdateBanner from './components/UpdateBanner'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Designer from './pages/Designer'
import Users from './pages/Users'

function Protected({ children }: { children: ReactElement }) {
  const user = useAuth((s) => s.user)
  return user ? children : <Navigate to="/login" replace />
}

function Placeholder({ title }: { title: string }) {
  return (
    <>
      <Typography variant="h4" fontWeight={700} mb={1}>
        {title}
      </Typography>
      <Typography color="text.secondary">Coming in a later milestone.</Typography>
    </>
  )
}

function page(element: ReactElement): ReactElement {
  return (
    <Protected>
      <AppLayout>{element}</AppLayout>
    </Protected>
  )
}

function Splash() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <CircularProgress />
    </Box>
  )
}

export default function App() {
  const mode = useUi((s) => s.mode)
  const theme = useMemo(() => buildTheme(mode), [mode])
  const booting = useAuth((s) => s.booting)
  const autoLogin = useAuth((s) => s.autoLogin)

  useEffect(() => {
    autoLogin()
  }, [autoLogin])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <OfflineOverlay />
      <UpdateBanner />
      {booting ? (
        <Splash />
      ) : (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={page(<Dashboard />)} />
        <Route path="/designer" element={page(<Designer />)} />
        <Route path="/history" element={page(<Placeholder title="Print History" />)} />
        <Route path="/users" element={page(<Users />)} />
        <Route path="/settings" element={page(<Placeholder title="Settings" />)} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      )}
    </ThemeProvider>
  )
}
