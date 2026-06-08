import { useState, type ReactNode } from 'react'
import {
  AppBar,
  Avatar,
  Box,
  Button,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography
} from '@mui/material'
import {
  AccountBalanceWallet,
  Badge,
  DarkMode,
  Dashboard as DashboardIcon,
  History as HistoryIcon,
  LightMode,
  Logout,
  People,
  Settings
} from '@mui/icons-material'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUi } from '../store/ui'
import { useAuth } from '../store/auth'

const WIDTH = 240

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/designer', label: 'Smart RC Designer', icon: <Badge /> },
  { to: '/history', label: 'Print History', icon: <HistoryIcon /> },
  { to: '/users', label: 'User Management', icon: <People /> },
  { to: '/settings', label: 'Settings', icon: <Settings /> }
]

const maskId = (s?: string | null) => (s && s.length ? `${s.slice(0, 3)}******` : 'Not set')

export default function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { mode, toggleMode } = useUi()
  const { user, logout } = useAuth()
  const [addOpen, setAddOpen] = useState(false)
  const isSuper = user?.role === 'SUPER_ADMIN'

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }} elevation={0}>
        <Toolbar>
          <Badge sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Smart RC
          </Typography>
          {!isSuper && (
            <Button
              color="inherit"
              startIcon={<AccountBalanceWallet />}
              onClick={() => setAddOpen(true)}
              sx={{ mr: 1 }}
            >
              Add Balance
            </Button>
          )}
          <Tooltip title="Toggle theme">
            <IconButton color="inherit" onClick={toggleMode}>
              {mode === 'dark' ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Tooltip>
          <Tooltip title={user?.name ?? user?.username ?? ''}>
            <Avatar sx={{ width: 32, height: 32, ml: 1, bgcolor: 'secondary.main' }}>
              {(user?.username ?? '?').charAt(0).toUpperCase()}
            </Avatar>
          </Tooltip>
          <Tooltip title="Logout">
            <IconButton
              color="inherit"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              <Logout />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: WIDTH, boxSizing: 'border-box' }
        }}
      >
        <Toolbar />
        <List>
          {NAV.map((n) => (
            <ListItemButton
              key={n.to}
              selected={location.pathname === n.to}
              onClick={() => navigate(n.to)}
            >
              <ListItemIcon>{n.icon}</ListItemIcon>
              <ListItemText primary={n.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, minHeight: '100vh' }}>
        {children}
      </Box>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Balance</DialogTitle>
        <DialogContent>
          <Stack spacing={1} mt={0.5}>
            <Typography variant="caption" color="text.secondary">
              Logged in as
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {user?.username}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              To top up, pay via the UPI ID or contact the admin on Telegram. Your balance is
              updated by the admin once confirmed.
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Stack direction="row" justifyContent="space-between">
              <Typography color="text.secondary">UPI ID</Typography>
              <Typography fontWeight={700} fontFamily="monospace">
                {maskId(user?.upiId)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography color="text.secondary">Telegram</Typography>
              <Typography fontWeight={700} fontFamily="monospace">
                {maskId(user?.telegramId)}
              </Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
