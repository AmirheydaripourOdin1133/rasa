# Setup & Testing — رسا | RASA

## 1. Prerequisites

- **Node.js ≥ 18.18** (Node 20 LTS recommended) — `node -v`
- npm ≥ 9
- Windows note: use `npm.cmd` / `npx.cmd` in PowerShell if `npm.ps1` execution is blocked.

## 2. Install & run (local, demo mode)

```bash
cd hamrah-darman
npm install
npm run dev          # http://localhost:3000
```

First run → onboarding wizard → «ورود با داده نمایشی (شربت)» or «(قرص)» seeds a
deterministic demo dataset. No account, no network.

Production build:

```bash
npm run build
npm run start        # or: npm run start -- -p 3100
```

## 3. Quality gates

| Command | What it does | Expected |
|---|---|---|
| `npm run lint` | ESLint (flat config) | 0 errors |
| `npm run typecheck` | `tsc --noEmit` (strict) | 0 errors |
| `npm test` | Vitest, jsdom — 76 unit tests | 7 files / 76 passed |
| `npm run build` | Next.js production build | 11 routes, no errors |

Test coverage map (`tests/unit/`):

- `medication-units.test.ts` — exact BigInt fixed-point conversions, strict parsing (empty/negative/ambiguous rejected)
- `plan-status.test.ts` — state machine, `reviewOverdue` display-only semantics, authorization labels (no English leakage)
- `safety.test.ts` — missed/uncertain/discrepancy flags, escalation criteria, emergency numbers ۱۱۵/۱۴۹۰ present
- `app-store.test.tsx` — hydrate, mode buckets, plan transitions, audit trail, Result-based failures
- `reminders.test.ts` — HH:mm validation, lead days 0–14
- `validation.test.ts` — zod schemas at trusted boundaries
- `rtl.test.tsx` — Persian numerals / no stray Latin digits in key UI

## 4. Browser verification checklist (used for this release)

1. Dashboard renders demo data: Jalali date «شنبه، ۲ آبان ۱۴۰۵», Persian numerals, plan status chip, last dose.
2. Every route (`/`, `/medication`, `/plan`, `/reports`, `/checkin`, `/safety`, `/settings`) renders full content; loading shows the `PageLoading` skeleton; zero console errors.
3. Font resolves to `peyda` (DevTools → Computed → font-family) — Latin digits render as Persian glyphs.
4. `/medication` stepper records a dose; conversion tab shows informational mg equivalent from labelled values only.
5. `/reports` charts draw with null-gaps (no invented zeros); CSV export downloads.
6. Demo → User mode switch shows the correct bucket's (empty) state; no cross-leak.

## 5. Backend (optional — disabled by default)

```bash
npx supabase start
npx supabase db reset        # applies supabase/migrations/0001_init.sql
# create an auth user via the app/API, then:
psql ... -f supabase/seed.sql   # replace DEMO_USER_ID first
```

Set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see
`.env.local.example`) **only when** the client integration is actually wired — the
MVP reads no env vars.

## 6. PWA verification

- Serve over **HTTPS** (or localhost) — service worker + install prompt require a secure context.
- DevTools → Application: manifest valid, icons 192/512 present, SW activated.
- Offline reload: app shell + last data render.

## 7. Common issues

| Symptom | Fix |
|---|---|
| `npm.ps1 cannot be loaded` | use `npm.cmd` |
| Font shows Times fallback | hard-refresh; check `--font-peyda` on `<body>` |
| Blank page flash on navigation | fixed by `PageLoading`; if seen, check store `ready` gating |
| Port 3100 busy | `Get-NetTCPConnection -LocalPort 3100 \| Stop-Process -Id $_.OwningProcess -Force` |
