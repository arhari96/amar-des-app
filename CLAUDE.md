# CLAUDE.md — Smart RC project context

Context for AI sessions working in this folder. See `README.md` for full docs.

## What this is
Desktop app (Electron) to design / save / print **Tamil Nadu Smart RC PVC cards**. Operators pick a
template, drop a transparent **values overlay PNG** onto front/back, optionally draw a signature, then
**Save** (writes PNGs + deducts credit) or **Print** (default printer). Metered by a per-user balance.

Card = **CR80, 85.6 × 53.98 mm, 300 DPI = 1011 × 638 px** (constants live in `CardEditor.tsx` / `TemplateLoader.tsx`).

## Stack
Electron + electron-vite · React 18 + TS + **MUI v6** · **Fabric.js v6** · Zustand · **Prisma → remote MySQL** ·
JWT + bcrypt · electron-builder. **Desktop-only** (no web). Node 22, npm (no pnpm).

## How to run / verify
```
npm run dev          # launch
npm run typecheck    # MUST pass (node + web)
npm run build        # MUST pass (main/preload/renderer)
npm run prisma:push  # sync schema to MySQL (modifies the REMOTE db — additive)
```
Always run `typecheck` + `build` after changes; both are expected to be green.

## Architecture (where things live)
- `src/main/` — Electron main (Node). `db.ts` (Prisma, demo-mode fallback), `auth.ts`, `userService.ts`,
  `cardService.ts` (save→`Documents/SmartRC/cards`, print→default printer), `ipc.ts`.
- `src/preload/index.ts` — `contextBridge` exposes `window.api` (typed by `src/shared/types.ts → AppApi`).
- `src/renderer/src/` — React: `pages/` (Login, Dashboard, Designer, Users), `components/`
  (AppLayout, **CardEditor**, TemplateLoader, OfflineOverlay), `store/` (auth, ui), `theme.ts`.
- `src/renderer/public/` — template images: `rc_template_1`=TN Blue front, `_b1`=TN Blue back,
  `rc_template_2`=TN Black front, `_b2`=TN Black back. Templates are defined in `pages/Designer.tsx → TEMPLATES`.
- `src/shared/types.ts` — single source of truth for IPC types; update here when adding an IPC call.

## Conventions
- Add an IPC call: define the type in `shared/types.ts (AppApi)` → handler in `main/ipc.ts` →
  expose in `preload/index.ts`. Keep all three in sync (typecheck enforces it).
- Renderer imports shared types via relative path `../../../shared/types`.
- One Fabric overlay object per side, tracked by `overlayRef` (NOT `getObjects()[0]`, because pen
  paths are also objects). Save/print renders the live canvas at zoom 1 → 1011×638.
- MUI **legacy `Grid`** (`item xs=...`), not Grid2.

## Key decisions / gotchas
- **Super admin is NOT in the DB** — credentials from `.env` (`SUPER_ADMIN_*`), `id: 0`, role
  `SUPER_ADMIN`, unlimited saves (no deduction). Regular users are DB rows (ADMIN/OPERATOR).
- **DB password must be URL-encoded** in `DATABASE_URL` (`@`→`%40`). MySQL is remote/shared; every
  machine's `.env` points at the same DB. Balance/users/history live in MySQL (shared); overlay
  **placement is localStorage (per-machine)**; saved PNGs are local to the machine.
- **Balance**: `card:save` checks `canSave` and `recordSave` (decrement `costPerSave`, increment
  `cardsSaved`, log PrintHistory). Renderer also disables Save when `cardsCanSave===0`. `cardsCanSave = -1`
  means unlimited (costPerSave 0).
- **Offline guard** uses `navigator.onLine` only (OS network), not DB reachability.
- No personal/org identifiers in the app (appId `com.smartrc.app`). Keep it that way.
- Renderer bundle ~1.4 MB (Fabric + MUI) — expected for a desktop app.

## Pending
Sharp normalize templates/output to 1011×638 (TN Blue back ~8 MB) · Print History page · Settings page ·
optional: placement→DB for cross-machine sync, DB-reachability ping in offline guard.
