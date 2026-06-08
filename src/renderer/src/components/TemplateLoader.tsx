import { useEffect, useState } from 'react'
import { Backdrop, Box, CircularProgress, LinearProgress, Paper, Typography } from '@mui/material'
import { AutoAwesome } from '@mui/icons-material'
import { keyframes } from '@mui/system'

const DURATION_MS = 10000

const MESSAGES = [
  'Fetching template assets…',
  'Rendering background at 300 DPI…',
  'Optimizing template layers…',
  'Calibrating card dimensions (1011 × 638)…',
  'Aligning security guilloché pattern…',
  'Enhancing sharpness & contrast…',
  'Compressing for print…',
  'Finalizing template…'
]

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 22px rgba(57,73,171,0.35); }
  50% { box-shadow: 0 0 52px rgba(0,137,123,0.65); }
`
const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`
const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`

interface Props {
  open: boolean
  templateName: string
  onDone: () => void
}

export default function TemplateLoader({ open, templateName, onDone }: Props) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!open) {
      setProgress(0)
      return
    }
    const start = performance.now()
    const id = setInterval(() => {
      const elapsed = performance.now() - start
      const p = Math.min(100, (elapsed / DURATION_MS) * 100)
      setProgress(p)
      if (elapsed >= DURATION_MS) {
        clearInterval(id)
        onDone()
      }
    }, 120)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const msg = MESSAGES[Math.min(MESSAGES.length - 1, Math.floor((progress / 100) * MESSAGES.length))]

  return (
    <Backdrop
      open={open}
      sx={{
        zIndex: (t) => t.zIndex.modal + 1,
        backdropFilter: 'blur(6px)',
        bgcolor: 'rgba(8,13,22,0.72)'
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: 420,
          maxWidth: '90vw',
          p: 4,
          borderRadius: 4,
          textAlign: 'center',
          bgcolor: 'background.paper',
          animation: `${glow} 2.4s ease-in-out infinite`
        }}
      >
        <Box sx={{ animation: `${float} 2.6s ease-in-out infinite`, mb: 1 }}>
          <AutoAwesome sx={{ fontSize: 40, color: 'secondary.main' }} />
        </Box>

        <Typography
          variant="h6"
          fontWeight={800}
          sx={{
            background: 'linear-gradient(90deg,#3949ab,#00897b,#3949ab)',
            backgroundSize: '200% auto',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: `${shimmer} 3s linear infinite`
          }}
        >
          Preparing {templateName || 'Template'}
        </Typography>

        <Box sx={{ position: 'relative', display: 'inline-flex', my: 3 }}>
          <CircularProgress
            variant="determinate"
            value={progress}
            size={120}
            thickness={4}
            sx={{ color: 'primary.main' }}
          />
          <CircularProgress
            size={120}
            thickness={2}
            sx={{ color: 'secondary.main', position: 'absolute', left: 0, opacity: 0.35 }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography variant="h4" fontWeight={700}>
              {Math.round(progress)}%
            </Typography>
          </Box>
        </Box>

        <Typography
          key={msg}
          variant="body2"
          color="text.secondary"
          sx={{ minHeight: 24, animation: `${fadeIn} 0.45s ease` }}
        >
          {msg}
        </Typography>

        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            mt: 2,
            height: 6,
            borderRadius: 3,
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              background: 'linear-gradient(90deg,#3949ab,#00897b)'
            }
          }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Optimizing high-resolution print template — please wait
        </Typography>
      </Paper>
    </Backdrop>
  )
}
