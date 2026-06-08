# Smart RC — PVC Card Designer & Printing

A desktop application for designing, previewing, saving, and printing **Tamil Nadu Smart RC PVC cards**.
Operators pick a card template, drop a transparent "values" overlay image onto the front/back,
optionally sign with a pen tool, then save/print the card. Usage is metered with a per-user
**credit/balance** system managed by a super admin.

> Card spec: **CR80 — 85.6 × 53.98 mm @ 300 DPI = 1011 × 638 px**.

---

## Tech stack

| Layer | Choice |
|---|---|
| Desktop shell | **Electron** (via `electron-vite`) |
| UI | **React 18 + TypeScript + Material UI v6** |
| Canvas / designer | **Fabric.js v6** |
| State | **Zustand** |
| DB / ORM | **Remote MySQL** + **Prisma** |
| Auth | **JWT** + bcrypt password hashing |
| Image | Canvas `toDataURL` (Sharp planned for normalization) |
| Packaging | **electron-builder** (macOS dmg, Windows nsis) |

Desktop-only (Windows 10/11 + macOS). No web build.

---

## Quick start

```bash
cd smart-rc
npm install
cp .env.example .env      # then fill DATABASE_URL + super admin creds
npm run prisma:push       # create/sync tables on the remote MySQL
npm run dev               # launch the app (Electron + Vite HMR)
```

Default login (auto-seeded if the DB is empty): **admin / admin123**.
Super admin login comes from `.env` (see below).

### Scripts
- `npm run dev` — run the app in dev (HMR)
- `npm run build` — build main/preload/renderer to `out/`
- `npm run typecheck` — `tsc` for node (main/preload) + web (renderer)
- `npm run prisma:push` / `npm run prisma:generate`
- `npm run dist:mac` / `npm run dist:win` — packaged installers

---

## Environment (`.env`)

```
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DBNAME"
JWT_SECRET="<long random string>"
JWT_EXPIRES_IN="8h"
SUPER_ADMIN_USERNAME="..."
SUPER_ADMIN_PASSWORD="..."
SUPER_ADMIN_NAME="..."
```

⚠️ **URL-encode special characters in the DB password** (e.g. `@` → `%40`), otherwise the
connection string parses incorrectly.

The **super admin** is *not* stored in the database — its credentials live only in `.env`.
On each operator machine, the `.env` must point `DATABASE_URL` at the same shared MySQL.

---

## Architecture

```
Electron main (src/main)  ──IPC──▶  Preload (contextBridge: window.api)  ──▶  React renderer (src/renderer)
        │
        ├─ db.ts          Prisma client (falls back to "demo mode" if MySQL unreachable)
        ├─ auth.ts        login (super admin from .env, else DB + bcrypt), JWT, seed admin
        ├─ userService.ts createUser / listUsers / canSave / recordSave / getStats
        ├─ cardService.ts saveCard (PNG → Documents/SmartRC/cards) / printCard (default printer)
        └─ ipc.ts         registers all ipcMain handlers
```

### IPC channels (see `src/shared/types.ts → AppApi`)
- `auth:login` · `app:info`
- `card:save` (checks balance, deducts, writes PNGs, logs PrintHistory) · `card:print`
- `users:list` · `users:create` · `dashboard:stats`

### Folder map
```
src/
  main/        Electron main process (Node): db, auth, users, card save/print, ipc
  preload/     contextBridge → window.api (+ index.d.ts global typing)
  shared/      types.ts shared by main + renderer
  renderer/
    index.html
    public/    template background images (rc_template_1/2 = front, _b1/_b2 = back)
    src/
      pages/       Login, Dashboard, Designer, Users
      components/  AppLayout, CardEditor, TemplateLoader, OfflineOverlay
      store/       auth (Zustand), ui (theme mode)
      theme.ts, App.tsx, main.tsx
prisma/schema.prisma
```

---

## Features

### Roles
- **SUPER_ADMIN** (from `.env`) — creates users, sets balances + UPI/Telegram, unlimited saves.
- **ADMIN / OPERATOR** (DB users) — design + save/print, metered by balance.

### Smart RC Designer
- Starts **blank**; pick a **Template** (TN Blue / TN Black — each has a front + back image).
- Selecting a template shows a **10-second branded loading animation** (rotating "rendering/optimizing" messages).
- **Front and Back are shown side by side.**
- Per side: **Overlay Image** (transparent values PNG) — drag / resize / opacity / remove.
  Overlay **placement is remembered per template + side** (localStorage) so the next overlay auto-aligns.
- **Pen tool** per side for drawing a signature (color + clear).
- **Save** → asks for the **Registration Number**, renders each side at **1011×638 @300DPI**,
  writes `{REG}_front.png` / `{REG}_back.png` to **`Documents/SmartRC/cards`**, and (for DB users)
  **deducts `costPerSave` from balance** + logs to PrintHistory.
- **Print** → sends front+back to the **system default printer**.

### Credit / balance system
- Each user: `balance`, `costPerSave`, `cardsSaved` (+ optional `upiId`, `telegramId`).
- **Low balance blocks saving** (Save button disabled + warning; also enforced in the main process).
- **Add Balance** dialog (top bar) shows the logged-in username and the **UPI/Telegram masked**
  (first 3 chars + `******`) so the user knows how to top up.

### Guards
- **Offline overlay** — a grey full-screen "No Internet Connection" blocker (uses `navigator.onLine`)
  prevents all actions while offline. *(Detects OS network only, not DB-server reachability.)*

---

## Database (Prisma → MySQL)

`User` (username, password hash, role, **balance, costPerSave, cardsSaved, upiId, telegramId**),
`Template`, `Layout`, `FieldMapping`, `PrintHistory`, `ApiSetting`, `DatabaseSetting`,
`AuditLog`, `AppSetting`. See `prisma/schema.prisma`.

---

## Pending / roadmap
- **Sharp** normalization of templates/output to exactly 1011×638 @300DPI (the TN Blue back image is ~8 MB).
- **Print History** page (data is already recorded in `PrintHistory`).
- **Settings** page.
- Optional: move overlay **placement to the DB** so admin-set positions sync across machines
  (currently localStorage = per machine); add a periodic **DB-reachability** check to the offline guard.
