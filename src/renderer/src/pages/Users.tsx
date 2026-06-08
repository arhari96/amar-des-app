import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'
import { AccountBalanceWallet, PersonAdd } from '@mui/icons-material'
import { useAuth } from '../store/auth'
import type { CreateUserInput, DbRole, UserPublic } from '../../../shared/types'

const EMPTY: CreateUserInput = {
  username: '',
  password: '',
  name: '',
  role: 'OPERATOR',
  balance: 0,
  costPerSave: 0,
  upiId: '',
  telegramId: ''
}

type FundsMode = 'add' | 'set'

export default function Users() {
  const me = useAuth((s) => s.user)
  const isSuper = me?.role === 'SUPER_ADMIN'
  const [users, setUsers] = useState<UserPublic[]>([])
  const [form, setForm] = useState<CreateUserInput>(EMPTY)
  const [err, setErr] = useState<string | null>(null)
  const [snack, setSnack] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Update-funds dialog state.
  const [funds, setFunds] = useState<UserPublic | null>(null)
  const [fundsMode, setFundsMode] = useState<FundsMode>('add')
  const [fundsAmount, setFundsAmount] = useState('')
  const [fundsErr, setFundsErr] = useState<string | null>(null)
  const [fundsBusy, setFundsBusy] = useState(false)

  const refresh = () => window.api.listUsers().then(setUsers)

  useEffect(() => {
    if (isSuper) refresh()
  }, [isSuper])

  if (!isSuper) {
    return <Alert severity="warning">Only the super admin can manage users.</Alert>
  }

  const submit = async () => {
    setErr(null)
    setBusy(true)
    try {
      await window.api.createUser({ ...form, name: form.name || undefined })
      setSnack('User created.')
      setForm(EMPTY)
      refresh()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const set = <K extends keyof CreateUserInput>(k: K, v: CreateUserInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const openFunds = (u: UserPublic) => {
    setFunds(u)
    setFundsMode('add')
    setFundsAmount('')
    setFundsErr(null)
  }

  const amountNum = Number(fundsAmount)
  const amountValid = fundsAmount.trim() !== '' && Number.isFinite(amountNum)
  const projected =
    funds && amountValid ? (fundsMode === 'add' ? funds.balance + amountNum : amountNum) : null
  const projectedInvalid = projected !== null && projected < 0

  const submitFunds = async () => {
    if (!funds || !amountValid || projectedInvalid) return
    setFundsErr(null)
    setFundsBusy(true)
    try {
      const updated = await window.api.adjustBalance({
        userId: funds.id,
        amount: amountNum,
        mode: fundsMode
      })
      setSnack(`Funds updated — ${updated.username} now has ${updated.balance.toLocaleString()}.`)
      setFunds(null)
      refresh()
    } catch (e) {
      setFundsErr((e as Error).message)
    } finally {
      setFundsBusy(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>
        User Management
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" mb={2}>
            Create User
          </Typography>
          {err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {err}
            </Alert>
          )}
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <TextField label="Username" size="small" value={form.username} onChange={(e) => set('username', e.target.value)} />
            <TextField label="Password" size="small" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} />
            <TextField label="Name" size="small" value={form.name} onChange={(e) => set('name', e.target.value)} />
            <TextField label="Role" size="small" select sx={{ minWidth: 130 }} value={form.role} onChange={(e) => set('role', e.target.value as DbRole)}>
              <MenuItem value="OPERATOR">Operator</MenuItem>
              <MenuItem value="ADMIN">Admin</MenuItem>
            </TextField>
            <TextField label="Balance" size="small" type="number" sx={{ width: 120 }} value={form.balance} onChange={(e) => set('balance', +e.target.value)} />
            <TextField label="Cost / Save" size="small" type="number" sx={{ width: 120 }} value={form.costPerSave} onChange={(e) => set('costPerSave', +e.target.value)} />
            <TextField label="UPI ID (optional)" size="small" value={form.upiId} onChange={(e) => set('upiId', e.target.value)} />
            <TextField label="Telegram ID (optional)" size="small" value={form.telegramId} onChange={(e) => set('telegramId', e.target.value)} />
            <Button
              variant="contained"
              startIcon={<PersonAdd />}
              onClick={submit}
              disabled={busy || !form.username.trim() || !form.password.trim()}
            >
              Create
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell align="right">Balance</TableCell>
              <TableCell align="right">Cost / Save</TableCell>
              <TableCell align="right">Cards Saved</TableCell>
              <TableCell>UPI ID</TableCell>
              <TableCell>Telegram</TableCell>
              <TableCell align="right">Funds</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.id}</TableCell>
                <TableCell>{u.username}</TableCell>
                <TableCell>{u.name ?? '—'}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell align="right">{u.balance.toLocaleString()}</TableCell>
                <TableCell align="right">{u.costPerSave.toLocaleString()}</TableCell>
                <TableCell align="right">{u.cardsSaved.toLocaleString()}</TableCell>
                <TableCell>{u.upiId ?? '—'}</TableCell>
                <TableCell>{u.telegramId ?? '—'}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AccountBalanceWallet />}
                    onClick={() => openFunds(u)}
                  >
                    Update
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={10}>
                  <Typography variant="body2" color="text.secondary" py={2} textAlign="center">
                    No users yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={!!funds} onClose={() => !fundsBusy && setFunds(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Update Funds</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={0.5}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                User
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {funds?.name ?? funds?.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Current balance:{' '}
                <Box component="span" fontWeight={700}>
                  {funds?.balance.toLocaleString()}
                </Box>
              </Typography>
            </Box>

            {fundsErr && <Alert severity="error">{fundsErr}</Alert>}

            <ToggleButtonGroup
              exclusive
              size="small"
              color="primary"
              value={fundsMode}
              onChange={(_e, v: FundsMode | null) => v && setFundsMode(v)}
            >
              <ToggleButton value="add">Add / Deduct</ToggleButton>
              <ToggleButton value="set">Set exact</ToggleButton>
            </ToggleButtonGroup>

            <TextField
              autoFocus
              label={fundsMode === 'add' ? 'Amount to add (use negative to deduct)' : 'New balance'}
              type="number"
              size="small"
              value={fundsAmount}
              onChange={(e) => setFundsAmount(e.target.value)}
              error={projectedInvalid}
              helperText={projectedInvalid ? 'Balance cannot go below zero.' : ' '}
            />

            <Divider />
            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
              <Typography color="text.secondary">New balance</Typography>
              <Typography variant="h6" fontWeight={700} color={projectedInvalid ? 'error' : 'inherit'}>
                {projected !== null ? projected.toLocaleString() : '—'}
              </Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFunds(null)} disabled={fundsBusy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submitFunds}
            disabled={fundsBusy || !amountValid || projectedInvalid}
          >
            {fundsBusy ? 'Saving…' : 'Update Funds'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} message={snack ?? ''} />
    </Box>
  )
}
