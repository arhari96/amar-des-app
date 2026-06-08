import { useEffect, useState } from 'react'
import { Alert, Button, Snackbar } from '@mui/material'
import type { UpdateStatus } from '../../../shared/types'

/** Listens for auto-update events and offers an immediate restart once downloaded. */
export default function UpdateBanner() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)

  useEffect(() => window.api.onUpdateStatus(setStatus), [])

  if (status?.state !== 'downloaded') return null

  return (
    <Snackbar open anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
      <Alert
        severity="info"
        variant="filled"
        action={
          <Button color="inherit" size="small" onClick={() => window.api.installUpdate()}>
            Restart now
          </Button>
        }
      >
        Update {status.version} is ready to install.
      </Alert>
    </Snackbar>
  )
}
