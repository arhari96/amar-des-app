import { useEffect, useState } from 'react'
import { Backdrop, Button, Typography } from '@mui/material'
import { CloudOff } from '@mui/icons-material'

/**
 * Full-screen grey blocker shown whenever the machine is offline. Smart RC
 * needs internet to reach the remote MySQL, so all actions are blocked until
 * the connection returns.
 */
export default function OfflineOverlay() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (online) return null

  return (
    <Backdrop
      open
      sx={{
        zIndex: (t) => t.zIndex.modal + 50,
        bgcolor: '#6b7280',
        color: '#fff',
        flexDirection: 'column',
        textAlign: 'center',
        px: 3
      }}
    >
      <CloudOff sx={{ fontSize: 76, mb: 2, opacity: 0.9 }} />
      <Typography variant="h5" fontWeight={800} gutterBottom>
        No Internet Connection
      </Typography>
      <Typography variant="body1" sx={{ opacity: 0.85, maxWidth: 440 }}>
        You&apos;re offline. Smart RC needs an internet connection to reach the database. Please
        reconnect to continue.
      </Typography>
      <Button
        onClick={() => setOnline(navigator.onLine)}
        variant="outlined"
        sx={{ mt: 3, color: '#fff', borderColor: 'rgba(255,255,255,0.6)' }}
      >
        Retry
      </Button>
    </Backdrop>
  )
}
