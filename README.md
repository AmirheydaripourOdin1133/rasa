# رسا | RASA — همراه درمان

Persian-first, RTL, installable web app (PWA) that helps people on **methadone
treatment** record and observe their own therapy — medication logs (tablets or oral
liquid), daily symptom check-ins, versioned treatment plans with explicit clinician
authorization, trend reports in the Jalali calendar, and neutral safety guidance.

> **این اپ ثبت‌کننده است، نه تجویزکننده.** هیچ‌گاه دوز پیشنهاد نمی‌دهد، برنامه کاهش
> نمی‌سازد و تشخیص نمی‌دهد — تمام تصمیم‌های درمانی با درمانگر شماست.

## Highlights

- **Persian-first:** RTL layout, Jalali dates («شنبه، ۲ آبان ۱۴۰۵»), Persian numerals
  via the locally-bundled **PeydaFaNum** typeface — zero runtime network requests.
- **Local-first privacy:** no account, no analytics; data stays on the device in
  separate real/demo buckets (`localStorage`), with export + full wipe.
- **Medical-safety boundaries:** never generates tapers or dose advice; plan
  authorization is explicit (named clinician recorded by the user); review-overdue is
  a display flag — the app never auto-advances a plan. See
  [`docs/clinical-safety-boundaries.md`](docs/clinical-safety-boundaries.md).
- **Exact medication math:** BigInt fixed-point (scale 4) unit conversions from
  *labelled* values only; prescribed vs actual intake stored separately.
- **Versioned plans + audit trail:** full event history for every mutation.
- **PWA:** installable, offline shell, reminders with lock-screen privacy.

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000 — onboarding → «ورود با داده نمایشی»
```

Quality gates: `npm run lint` · `npm run typecheck` · `npm test` (76 tests) ·
`npm run build` — all green for this release.

## Documentation

| Doc | Contents |
|---|---|
| [`docs/product-requirements.md`](docs/product-requirements.md) | Problem, principles, MVP scope, flows, success criteria |
| [`docs/clinical-safety-boundaries.md`](docs/clinical-safety-boundaries.md) | Hard prohibitions, escalation criteria, copy rules |
| [`docs/clinical-evidence.md`](docs/clinical-evidence.md) | Sources consulted (WHO 2025 update; CMAJ 2024 OUD guideline; BAP consensus; SAMHSA TIP 63 access note) |
| [`docs/design-system.md`](docs/design-system.md) | Stitch-derived M3 tokens, type scale, RTL/numeral rules |
| [`docs/data-model.md`](docs/data-model.md) | TS domain + PostgreSQL schema, plan state machine |
| [`docs/security-model.md`](docs/security-model.md) | Data minimization, bucket separation, backend posture, secrets hygiene |
| [`docs/setup-and-testing.md`](docs/setup-and-testing.md) | Install, quality gates, browser/PWA checklists, troubleshooting |
| [`supabase/`](supabase/) | Optional backend: RLS-protected schema + synthetic seed (disabled by default) |

## Modes

- **User mode** — real records, local only.
- **Demo mode** — deterministic synthetic data, visibly badged, isolated bucket.

## Tech

Next.js 15 (App Router) · TypeScript strict · Tailwind CSS v4 (M3 token system from
the approved Stitch design) · Vitest + jsdom · local PeydaFaNum font · optional
Supabase (schema/RLS authored, integration intentionally unwired).

## Deployment (short version)

Any Node.js ≥ 18 host: `npm run build && npm start` behind HTTPS (PWA requirement) —
e.g. a small VPS (PM2 + Nginx + Let's Encrypt) or an Iranian Node PaaS. Shared PHP
hosting works only with a static export and blocks the future backend path. See
[`deploy/DEPLOY-fa.md`](deploy/DEPLOY-fa.md) for the full step-by-step guide.

## License / status

**v1.0.0 — first public release.** Not a medical device; not for clinical decision
making.
