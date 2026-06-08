import { app, BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64 = dataUrl.split(',')[1] ?? ''
  return Buffer.from(base64, 'base64')
}

/** Saves the composed card PNG(s) to Documents/SmartRC/cards, named by reg no. */
export async function saveCard(
  regNumber: string,
  sides: { front?: string; back?: string }
): Promise<{ dir: string; files: string[] }> {
  const dir = join(app.getPath('documents'), 'SmartRC', 'cards')
  await fs.mkdir(dir, { recursive: true })
  const safe = regNumber.replace(/[^a-zA-Z0-9_-]/g, '_') || 'card'
  const files: string[] = []
  if (sides.front) {
    const p = join(dir, `${safe}_front.png`)
    await fs.writeFile(p, dataUrlToBuffer(sides.front))
    files.push(p)
  }
  if (sides.back) {
    const p = join(dir, `${safe}_back.png`)
    await fs.writeFile(p, dataUrlToBuffer(sides.back))
    files.push(p)
  }
  return { dir, files }
}

/** Prints the given card image(s) to the system default printer (one per page). */
export async function printCard(dataUrls: string[]): Promise<{ ok: boolean }> {
  const work = await fs.mkdtemp(join(tmpdir(), 'smartrc-'))
  const names: string[] = []
  for (let i = 0; i < dataUrls.length; i++) {
    const name = `page${i}.png`
    await fs.writeFile(join(work, name), dataUrlToBuffer(dataUrls[i]))
    names.push(name)
  }
  const imgs = names
    .map((n) => `<img src="${n}" style="width:100%;display:block;page-break-after:always" />`)
    .join('')
  const htmlPath = join(work, 'print.html')
  await fs.writeFile(
    htmlPath,
    `<!doctype html><html><head><meta charset="utf-8"><style>@page{margin:0}html,body{margin:0;padding:0}img{width:100%}</style></head><body>${imgs}</body></html>`
  )

  const win = new BrowserWindow({ show: false, webPreferences: {} })
  await win.loadFile(htmlPath)
  return new Promise((resolve) => {
    win.webContents.print(
      { silent: false, printBackground: true, margins: { marginType: 'none' } },
      (success) => {
        win.close()
        resolve({ ok: success })
      }
    )
  })
}
