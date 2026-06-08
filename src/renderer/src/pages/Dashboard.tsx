import { useEffect, useState, type ReactNode } from 'react'
import { Box, Card, CardContent, Grid, Typography } from '@mui/material'
import {
  AccountBalanceWallet,
  CreditScore,
  PaidOutlined,
  People,
  Print
} from '@mui/icons-material'
import { useAuth } from '../store/auth'
import type { DashboardStats } from '../../../shared/types'

interface Stat {
  label: string
  value: string
  icon: ReactNode
}

export default function Dashboard() {
  const user = useAuth((s) => s.user)
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    if (user) window.api.dashboardStats(user.id, user.role).then(setStats)
  }, [user])

  const isSuper = user?.role === 'SUPER_ADMIN'
  const n = (x: number) => x.toLocaleString()

  const cards: Stat[] = isSuper
    ? [
        { label: 'Total Users', value: n(stats?.totalUsers ?? 0), icon: <People /> },
        { label: 'Total Cards Saved', value: n(stats?.totalCards ?? 0), icon: <Print /> },
        { label: 'Total User Balance', value: n(stats?.balance ?? 0), icon: <AccountBalanceWallet /> }
      ]
    : [
        { label: 'Balance', value: n(stats?.balance ?? 0), icon: <AccountBalanceWallet /> },
        {
          label: 'Cards You Can Save',
          value: stats ? (stats.cardsCanSave < 0 ? '∞' : n(stats.cardsCanSave)) : '0',
          icon: <CreditScore />
        },
        { label: 'Cards Saved', value: n(stats?.cardsSaved ?? 0), icon: <Print /> },
        { label: 'Cost Per Save', value: n(stats?.costPerSave ?? 0), icon: <PaidOutlined /> }
      ]

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={1}>
        Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Welcome, {user?.name ?? user?.username} · {user?.role}
      </Typography>
      <Grid container spacing={3}>
        {cards.map((s) => (
          <Grid key={s.label} item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box sx={{ color: 'primary.main', display: 'flex' }}>{s.icon}</Box>
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      {s.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {s.label}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
