# Product Requirements — رسا | RASA (همراه درمان)

**Product:** RASA — a Persian-first, RTL, mobile-web PWA for people on opioid agonist therapy (methadone) to *record and observe* their own treatment.
**Version:** 1.0.0 (first public release)
**Status:** Implemented — demo mode + local persistence; optional backend (Supabase) authored but disabled.

---

## 1. Problem statement

People in methadone maintenance treatment (MMT) in Iran have no lightweight, private,
Persian-language tool to:

- record what they actually took (tablets **or** oral liquid) versus what was prescribed;
- see trends (adherence, symptoms) over weeks, in the Persian (Jalali) calendar;
- keep a versioned, reviewable record they can show their clinician at visits;
- get neutral safety guidance when they miss doses or feel unwell — **without** the app
  ever telling them *what dose to take*.

Existing tools are English-only, LTR, dose-prescriptive, or require accounts and data
sharing from day one. RASA is designed to be useful **entirely offline, entirely local,
with no account**.

## 2. Non-negotiable product principles

1. **Recording, not prescribing.** RASA never generates a taper schedule, never suggests
   a dose change, never advises "catch-up" doses after a miss. It records, converts
   units (informational, from labelled values only), and flags patterns.
2. **Medical authorization is explicit and external.** A treatment plan counts as
   *authorized* only when a named clinician's approval has been recorded by the user.
   Passage of time is never authorization. The app flags overdue reviews but never
   auto-advances a plan.
3. **Persian-first.** RTL layout, Jalali dates, Persian numerals (PeydaFaNum font),
   clinical copy reviewed for plain Persian. No English leaks into UI strings.
4. **Privacy by default.** All data stays on the device in MVP (local-first storage,
   separate real/demo buckets). No account, no analytics, no third-party requests at
   runtime. The backend path (Supabase) is documented and schema-complete but ships
   **disabled**.
5. **Fail loudly, never fake success.** Every persistence failure surfaces a typed
   error. The app never pretends a save succeeded.
6. **Safety-forward, not fear-forward.** Emergency information (۱۱۵ ambulance, national
   poison centre guidance) is factual and local; escalation criteria are conservative
   and clearly labelled as general, not diagnostic.

## 3. Scope — MVP (this release)

### In scope

| Area | What ships |
|---|---|
| Onboarding | 6-step wizard (profile, medication form: tablet/liquid, labelled strength, prescribed daily amount, regimen start, plan source/authorization, reminders) + one-tap **demo mode** with deterministic seeded data |
| Medication log | Daily recording per administration slot; status per dose: taken / delayed / missed / uncertain ("مطمئن نیستم"); planned vs actual amount and time recorded **separately**; mL ↔ mg and tablet ↔ mg conversion tab (informational) |
| Check-in | Daily symptom check-in (0–4 scales: sleep, anxiety, craving, GI, sweating/chills, aches/restlessness, mood) + adherence difficulty + "unsure" items; neutral guidance output |
| Plan | Versioned treatment plans with statuses `draft → awaiting-review → active → review-required / paused / superseded / completed`; clinician authorization fields; milestones **recorded** (never generated); review-overdue flag; full event/audit history |
| Reports | Adherence over time (line chart, null-gap aware), symptom trends, dose amount trends; Persian-date axis; CSV export; print stylesheet |
| Safety page | Missed-dose and uncertainty guidance (general, non-personalized), discrepancy flags (planned ≠ recorded), emergency criteria and Iranian emergency numbers (۱۱۵), personal emergency contacts |
| Settings | Reminders (medication times, check-in time, log review time, review lead days) with **lock-screen privacy** (body-only notifications); mode (demo/user); data export/wipe; audit history viewer |
| PWA | Installable (manifest + icons), offline via service worker (shell + last data), local Persian font (no CDN) |

### Explicitly out of scope (MVP)

- Clinician-facing accounts, clinician dashboards, telemedicine
- Any automated schedule/taper generation or dose recommendation
- Drug–drug interaction checking (a free-text note field only)
- urine screen/sync with clinic systems, national registries
- iOS App Store / Google Play packaging (PWA install covers both)
- Multi-language UI (Persian only)

## 4. Modes

- **User mode** — real data, bucket `hamrah-darman:data:user:v1`.
- **Demo mode** — synthetic, deterministically seeded data, bucket `hamrah-darman:data:demo:v1`. Clearly badged everywhere. Demo and user data can never mix; wiping one never touches the other.

## 5. Key user flows

1. **First run** → onboarding wizard → (a) enter real data, or (b) enter demo → dashboard.
2. **Daily loop** → medication log (per slot) → check-in → dashboard reflects today's state.
3. **Clinician visit** → open Plan → show authorization status, version, milestone history, review date → record new version from the clinician's words only.
4. **Missed dose** → status "ثبت نشد" → app shows neutral guidance + (if criteria met) escalation flag → user decides.
5. **Reports** → open Reports → inspect 30/90-day trends → export CSV or print for the visit.

## 6. Success criteria (MVP)

- All green: `npm test` (76 unit tests), `npm run lint`, `npm run typecheck`, `npm run build`.
- Every route renders fully offline with no console errors.
- Zero medical-advice statements in copy (audited against `docs/clinical-safety-boundaries.md`).
- Zero network requests at runtime in demo/local mode (verified: font, icons, and data are local).
- Persian numerals and Jalali dates everywhere, verified in-browser.

## 7. Open items / known limitations

- Backend (Supabase) schema + RLS authored (`supabase/migrations/0001_init.sql`) but not wired — requires an operator-provided project and explicit opt-in.
- Reminders are best-effort: web push works when the PWA is installed; iOS lock-screen notification privacy varies by OS version.
- Single-device MVP: no sync. Export/CSV is the transport until backend is enabled.
