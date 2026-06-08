import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'
import { Print, Save } from '@mui/icons-material'
import CardEditor, { type CardEditorHandle } from '../components/CardEditor'
import TemplateLoader from '../components/TemplateLoader'
import { useAuth } from '../store/auth'
import type { DashboardStats } from '../../../shared/types'

interface Tpl {
  id: string
  name: string
  front?: string
  back?: string
}

// Each template carries a front + back background (in src/renderer/public).
const TEMPLATES: Tpl[] = [
  { id: 'tn_blue', name: 'TN Blue', front: '/rc_template_1.png', back: '/rc_template_b1.png' },
  { id: 'tn_black', name: 'TN Black', front: '/rc_template_2.png', back: '/rc_template_b2.png' }
]

export default function Designer() {
  const user = useAuth((s) => s.user)
  const [templateId, setTemplateId] = useState('') // blank until the user picks one
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [reg, setReg] = useState('')
  const [busy, setBusy] = useState(false)
  const [snack, setSnack] = useState<string | null>(null)

  const frontRef = useRef<CardEditorHandle>(null)
  const backRef = useRef<CardEditorHandle>(null)

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const isSuper = user?.role === 'SUPER_ADMIN'
  const blocked = !isSuper && !!stats && stats.cardsCanSave === 0

  const refreshStats = () => {
    if (user) window.api.dashboardStats(user.id, user.role).then(setStats).catch(() => {})
  }
  useEffect(() => {
    refreshStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const tpl = TEMPLATES.find((t) => t.id === templateId)
  const pendingName = TEMPLATES.find((t) => t.id === pendingId)?.name ?? ''

  const onSelectTemplate = (id: string) => {
    setPendingId(id)
    setLoading(true)
  }

  const onLoaderDone = () => {
    if (pendingId) setTemplateId(pendingId)
    setPendingId(null)
    setLoading(false)
  }

  const collectSides = async () => {
    const sides: { front?: string; back?: string } = {}
    const f = await frontRef.current?.render()
    if (f) sides.front = f
    const b = await backRef.current?.render()
    if (b) sides.back = b
    return sides
  }

  const confirmSave = async () => {
    setBusy(true)
    try {
      const sides = await collectSides()
      if (!sides.front && !sides.back) {
        setSnack('Nothing to save — pick a template or add an overlay first.')
        return
      }
      const res = await window.api.saveCard({
        userId: user?.id ?? 0,
        role: user?.role ?? 'OPERATOR',
        regNumber: reg.trim(),
        sides
      })
      if (!res.ok) {
        setSnack(res.error ?? 'Save failed.')
        return
      }
      const balanceNote = res.balance !== undefined ? ` · Balance: ${res.balance}` : ''
      setSnack(`Saved ${res.files?.length ?? 0} image(s) to ${res.dir}${balanceNote}`)
      setSaveOpen(false)
      refreshStats()
    } catch (err) {
      setSnack(`Save failed: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const onPrint = async () => {
    setBusy(true)
    try {
      const sides = await collectSides()
      const urls = [sides.front, sides.back].filter(Boolean) as string[]
      if (!urls.length) {
        setSnack('Nothing to print — pick a template or add an overlay first.')
        return
      }
      const res = await window.api.printCard(urls)
      setSnack(res.ok ? 'Sent to printer.' : 'Print canceled.')
    } catch (err) {
      setSnack(`Print failed: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 128px)' }}>
      {/* Toolbar: template (left) + Save / Print */}
      <Paper variant="outlined" sx={{ px: 2, py: 1.5, mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="tpl-label">Template</InputLabel>
            <Select
              labelId="tpl-label"
              label="Template"
              value={pendingId ?? templateId}
              onChange={(e) => onSelectTemplate(e.target.value)}
            >
              {TEMPLATES.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary">
            {templateId ? 'Front & back update together.' : 'Select a template to begin.'}
          </Typography>
          <Box flexGrow={1} />
          {blocked && (
            <Typography variant="body2" color="error" fontWeight={600} sx={{ mr: 1 }}>
              Balance too low to save
            </Typography>
          )}
          <Tooltip title={blocked ? 'Insufficient balance — ask the admin to top up' : ''}>
            <span>
              <Button
                variant="contained"
                startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <Save />}
                onClick={() => setSaveOpen(true)}
                disabled={busy || blocked}
              >
                Save
              </Button>
            </span>
          </Tooltip>
          <Button variant="outlined" startIcon={<Print />} onClick={onPrint} disabled={busy}>
            Print
          </Button>
        </Stack>
      </Paper>

      {/* Front + Back side by side */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 2,
          alignContent: 'start'
        }}
      >
        <CardEditor ref={frontRef} side="front" label="Front" templateId={templateId} bgUrl={tpl?.front ?? null} />
        <CardEditor ref={backRef} side="back" label="Back" templateId={templateId} bgUrl={tpl?.back ?? null} />
      </Box>

      <TemplateLoader open={loading} templateName={pendingName} onDone={onLoaderDone} />

      <Dialog open={saveOpen} onClose={() => !busy && setSaveOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Save Card</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Enter the Registration Number — the saved image(s) will be named after it.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Registration Number"
            value={reg}
            onChange={(e) => setReg(e.target.value.toUpperCase())}
            placeholder="TN42AJ4332"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={confirmSave} disabled={busy || !reg.trim()}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack}
        autoHideDuration={6000}
        onClose={() => setSnack(null)}
        message={snack ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}
