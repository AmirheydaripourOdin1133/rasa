# Security & Privacy Model — رسا | RASA

**Threat focus:** this app handles one of the most sensitive data categories that
exists — substance-use treatment records. The MVP design assumes the device is the
trust boundary and minimizes everything else.

---

## 1. Data minimization (MVP default)

- **No account. No identifier. No analytics. No telemetry.** The app makes **zero
  network requests at runtime** in local/demo mode:
  - font (PeydaFaNum) is bundled locally — no font CDN;
  - icons are inline SVG — no icon CDN;
  - no third-party scripts, no remote images.
- Data lives only in `localStorage` under app-scoped keys. Clearing browser data or
  using Settings → wipe removes it permanently (documented in UI).

## 2. Bucket separation

- Real data: `hamrah-darman:data:user:v1` · Demo: `hamrah-darman:data:demo:v1` ·
  mode flag: `hamrah-darman:mode`.
- Mode switches are explicit; every screen badges the active mode; export/wipe act on
  the active bucket only. Demo data is deterministic synthetic data — never derived
  from a real person.

## 3. On-device protections (MVP limits, stated honestly)

| Risk | Status |
|---|---|
| Casual over-the-shoulder reading | **Mitigated** — no dose numbers on dashboard tiles beyond last entry; reminders are body-only, lock-screen privacy |
| Another person using the same browser profile | **Partial** — no lock screen in MVP; a device PIN/biometric prompt is a listed future item, not present |
| Physical device seizure with browser data | **Accepted risk in MVP** — localStorage is not encrypted; documented so users can make an informed choice; export + wipe provides control |
| Server-side breach | **Not applicable in MVP** — there is no server |

## 4. Backend path (authored, disabled — how it will be secured when enabled)

`supabase/migrations/0001_init.sql` already enforces:

- **RLS on all 9 tables**, owner-only policies (`auth.uid() = user_id`), including the
  `profiles` table (keyed by `id`);
- **Deny-by-default**: no anon policies, no public grants beyond RLS;
- **Integrity**: CHECK constraints mirror domain invariants so a rogue client cannot
  persist invalid statuses, unauthorized-but-active plans (`authorization='authorized'`
  requires `authorizedBy`), or out-of-range scales;
- **Auditability**: append-only `plan_events` / `safety_events` / `audit_logs`;
- **Demo isolation**: `is_demo` boolean on content tables; seed data is flagged.

When the backend is enabled it must additionally provide:

1. **Anon-auth or email auth** with the anon key only in the client; service-role key
   never leaves the server.
2. **HTTPS-only** deployment; HSTS; secure cookies if sessions are introduced.
3. **Encryption in transit (TLS) and at rest** (Supabase default) — and a documented
   data-residency choice (recommended: in-country for Iranian users).
4. **No cross-user queries possible** — every client query is implicitly scoped by
   RLS; server-side code that bypasses RLS must re-verify ownership explicitly.
5. **A published privacy notice** covering retention, export, deletion (must map to
   the in-app wipe), and the fact that health-related data is being stored.

## 5. Application-layer controls

- **No `dangerouslySetInnerHTML`** anywhere; React escapes all user content by
  default (unit-tested where copy is dynamic).
- **No `eval`/`new Function`**; CSP-friendly output (no inline event handlers).
- **Inputs**: strict parsers (`parsePositiveDecimal`) reject empty/ambiguous/negative
  values; zod schemas at trusted boundaries; a lightweight validator in the UI layer
  (`src/lib/validation/reminders.ts`) keeps bundles small.
- **Error handling**: `Result`-typed failures surfaced to the user — the app never
  reports success for a failed write.
- **Service worker** (`public/sw.js`) caches only same-origin app shell assets; never
  caches API responses (none exist) or cross-origin content.

## 6. Secrets hygiene

- MVP: no secrets exist in the client (nothing to leak).
- When backend lands: `.env.local*` are git-ignored; only `NEXT_PUBLIC_*` anon values
  belong in the client; see `.env.local.example`.
- **Operator note:** during development a Stitch design API key was pasted into a chat
  session; it must be **rotated/revoked** in the Stitch console and never committed.

## 7. Incident & deletion posture

- User-initiated deletion (wipe/export) is immediate and local — nothing persists
  server-side in MVP.
- If the backend is enabled: deletion must cascade (schema uses `on delete cascade`
  from `auth.users`) and the privacy notice must state residual-backup retention
  honestly.
