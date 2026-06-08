import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent
} from 'react'
import * as fabric from 'fabric'
import {
  Box,
  Button,
  Paper,
  Slider,
  Stack,
  ToggleButton,
  Tooltip,
  Typography
} from '@mui/material'
import { Clear, DeleteOutline, Gesture, Image as ImageIcon } from '@mui/icons-material'

const CANVAS_W = 1011
const CANVAS_H = 638

type Side = 'front' | 'back'

export interface CardEditorHandle {
  render: () => Promise<string | null>
  hasContent: () => boolean
}

interface Props {
  side: Side
  label: string
  templateId: string
  bgUrl: string | null
}

type Placement = { left: number; top: number; scaleX: number; scaleY: number; angle: number }

const PLACEMENTS_KEY = 'smartrc_placements_v1'

function loadPlacements(): Record<string, Partial<Record<Side, Placement>>> {
  try {
    return JSON.parse(localStorage.getItem(PLACEMENTS_KEY) || '{}')
  } catch {
    return {}
  }
}

async function loadImage(url: string): Promise<fabric.FabricImage> {
  return fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
}

const CardEditor = forwardRef<CardEditorHandle, Props>(function CardEditor(
  { side, label, templateId, bgUrl },
  ref
) {
  const elRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const cRef = useRef<fabric.Canvas | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const overlayRef = useRef<fabric.FabricObject | null>(null)
  const placementsRef = useRef(loadPlacements())
  const tplRef = useRef(templateId)
  const bgRef = useRef<string | null>(bgUrl)

  const [hasOverlay, setHasOverlay] = useState(false)
  const [opacity, setOpacity] = useState(1)
  const [penOn, setPenOn] = useState(false)
  const [penColor, setPenColor] = useState('#000000')

  tplRef.current = templateId
  bgRef.current = bgUrl

  const savePlacement = (t: Placement) => {
    const tpl = tplRef.current
    if (!tpl) return
    const p = placementsRef.current
    if (!p[tpl]) p[tpl] = {}
    p[tpl][side] = t
    localStorage.setItem(PLACEMENTS_KEY, JSON.stringify(p))
  }

  const applyBg = (url: string | null) => {
    const c = cRef.current
    if (!c) return
    if (!url) {
      c.backgroundImage = undefined
      c.requestRenderAll()
      return
    }
    loadImage(url).then((img) => {
      img.set({ left: 0, top: 0, originX: 'left', originY: 'top', selectable: false, evented: false })
      img.scaleX = CANVAS_W / (img.width || CANVAS_W)
      img.scaleY = CANVAS_H / (img.height || CANVAS_H)
      c.backgroundImage = img
      c.requestRenderAll()
    })
  }

  const captureOverlay = () => {
    const o = overlayRef.current
    if (o) {
      savePlacement({
        left: o.left ?? 0,
        top: o.top ?? 0,
        scaleX: o.scaleX ?? 1,
        scaleY: o.scaleY ?? 1,
        angle: o.angle ?? 0
      })
    }
  }

  useEffect(() => {
    if (!elRef.current || cRef.current) return
    const c = new fabric.Canvas(elRef.current, {
      width: CANVAS_W,
      height: CANVAS_H,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true
    })
    cRef.current = c

    const fit = () => {
      const w = stageRef.current?.clientWidth ?? 480
      const z = Math.min(1, Math.max(0.25, (w - 8) / CANVAS_W))
      c.setZoom(z)
      c.setDimensions({ width: CANVAS_W * z, height: CANVAS_H * z })
    }
    fit()

    c.on('object:moving', (e) => {
      const o = e.target
      if (o && o === overlayRef.current) {
        o.set({ left: Math.round((o.left ?? 0) / 5) * 5, top: Math.round((o.top ?? 0) / 5) * 5 })
      }
    })
    c.on('object:modified', (e) => {
      if (e.target === overlayRef.current) captureOverlay()
    })

    const ro = new ResizeObserver(fit)
    if (stageRef.current) ro.observe(stageRef.current)

    applyBg(bgRef.current)

    return () => {
      ro.disconnect()
      c.dispose()
      cRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    applyBg(bgUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgUrl])

  const addOverlay = (url: string) => {
    const c = cRef.current
    if (!c) return
    if (overlayRef.current) c.remove(overlayRef.current)
    loadImage(url).then((img) => {
      const saved = placementsRef.current[tplRef.current]?.[side]
      const t: Placement = saved ?? {
        left: 0,
        top: 0,
        scaleX: CANVAS_W / (img.width || CANVAS_W),
        scaleY: CANVAS_H / (img.height || CANVAS_H),
        angle: 0
      }
      img.set({ ...t, opacity: 1, originX: 'left', originY: 'top' })
      overlayRef.current = img
      c.add(img)
      c.setActiveObject(img)
      c.requestRenderAll()
      savePlacement(t)
      setHasOverlay(true)
      setOpacity(1)
    })
  }

  const onUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => addOverlay(r.result as string)
    r.readAsDataURL(f)
    e.target.value = ''
  }

  const setOverlayOpacity = (v: number) => {
    const c = cRef.current
    const o = overlayRef.current
    if (c && o) {
      o.set('opacity', v)
      c.requestRenderAll()
    }
    setOpacity(v)
  }

  const removeOverlay = () => {
    const c = cRef.current
    const o = overlayRef.current
    if (c && o) {
      c.remove(o)
      c.requestRenderAll()
    }
    overlayRef.current = null
    setHasOverlay(false)
  }

  const togglePen = () => {
    const c = cRef.current
    if (!c) return
    const next = !penOn
    c.isDrawingMode = next
    if (next) {
      const brush = new fabric.PencilBrush(c)
      brush.color = penColor
      brush.width = 3
      c.freeDrawingBrush = brush
    }
    setPenOn(next)
  }

  const changePenColor = (color: string) => {
    setPenColor(color)
    const c = cRef.current
    if (c && c.isDrawingMode && c.freeDrawingBrush) c.freeDrawingBrush.color = color
  }

  const clearSignature = () => {
    const c = cRef.current
    if (!c) return
    c.getObjects()
      .filter((o) => o.type === 'path')
      .forEach((o) => c.remove(o))
    c.requestRenderAll()
  }

  useImperativeHandle(
    ref,
    () => ({
      hasContent: () => !!bgRef.current || (cRef.current?.getObjects().length ?? 0) > 0,
      render: async () => {
        const c = cRef.current
        if (!c) return null
        if (!bgRef.current && c.getObjects().length === 0) return null
        const wasDrawing = c.isDrawingMode
        c.isDrawingMode = false
        c.discardActiveObject()
        const z = c.getZoom()
        const w = c.getWidth()
        const h = c.getHeight()
        c.setZoom(1)
        c.setDimensions({ width: CANVAS_W, height: CANVAS_H })
        c.requestRenderAll()
        const url = c.toDataURL({ format: 'png', multiplier: 1 })
        c.setZoom(z)
        c.setDimensions({ width: w, height: h })
        c.isDrawingMode = wasDrawing
        c.requestRenderAll()
        return url
      }
    }),
    []
  )

  return (
    <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <Typography variant="subtitle2" gutterBottom>
        {label}
      </Typography>
      <Box
        ref={stageRef}
        sx={{
          bgcolor: (t) => (t.palette.mode === 'dark' ? '#0b1120' : '#e9edf3'),
          borderRadius: 1,
          p: 0.5,
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <Box sx={{ boxShadow: 3 }}>
          <canvas ref={elRef} />
        </Box>
      </Box>

      <Stack direction="row" spacing={1} alignItems="center" mt={1.5}>
        <Button
          size="small"
          variant="contained"
          startIcon={<ImageIcon />}
          onClick={() => inputRef.current?.click()}
          sx={{ textTransform: 'none' }}
        >
          Overlay
        </Button>
        <Box flexGrow={1} px={1}>
          <Slider
            size="small"
            min={0}
            max={1}
            step={0.05}
            value={opacity}
            disabled={!hasOverlay}
            onChange={(_e, v) => setOverlayOpacity(v as number)}
          />
        </Box>
        <Button
          size="small"
          color="error"
          startIcon={<DeleteOutline />}
          disabled={!hasOverlay}
          onClick={removeOverlay}
          sx={{ textTransform: 'none' }}
        >
          Remove
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" mt={1}>
        <ToggleButton size="small" value="pen" selected={penOn} onChange={togglePen}>
          <Gesture fontSize="small" sx={{ mr: 0.5 }} /> Pen
        </ToggleButton>
        <Tooltip title="Pen color">
          <input
            type="color"
            value={penColor}
            onChange={(e) => changePenColor(e.target.value)}
            style={{ width: 36, height: 32, border: 'none', background: 'none', cursor: 'pointer' }}
          />
        </Tooltip>
        <Box flexGrow={1} />
        <Button size="small" startIcon={<Clear />} onClick={clearSignature} sx={{ textTransform: 'none' }}>
          Clear Sign
        </Button>
      </Stack>

      <input ref={inputRef} type="file" accept="image/png,image/*" hidden onChange={onUpload} />
    </Paper>
  )
})

export default CardEditor
