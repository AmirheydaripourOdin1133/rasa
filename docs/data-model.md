# Data Model — رسا | RASA

Two synchronized layers describe the same domain:

1. **TypeScript domain types** — `src/types/index.ts` (runtime, local persistence)
2. **PostgreSQL schema** — `supabase/migrations/0001_init.sql` (optional backend, RLS-protected)

Field names match 1:1 where both exist (camelCase in TS; snake_case columns in SQL).

---

## 1. Entities (MVP)

### UserProfile
| Field | Type | Notes |
|---|---|---|
| displayName | string \| null | Chosen name; never required |
| personalGoal | string \| null | Free text — user's own words, not a clinical target |
| jurisdiction | `"ir"` | Fixed in MVP; selects emergency info set |
| emergencyContacts | `{id,label,phone}[]` | User-entered, local-only |
| onboardedAt | ISO date \| null | Set when wizard completes |

### MedicationProfile
| Field | Type | Notes |
|---|---|---|
| productName / ingredientName | string | What the user is prescribed, as written on the box |
| formulation | `"tablet" \| "liquid"` | Selects recording unit (tablet / mL) |
| tabletStrengthMg | number \| null | Labelled strength — required for tablet |
| concentrationMgPerMl | number \| null | Labelled concentration — required for liquid |
| prescribedDailyAmount | number \| null | In the **recording unit**; recorded, never computed |
| administrationsPerDay | 1–6 | Number of daily slots |
| administrationTimes | `HH:mm[]` | Slot times |
| regimenStartDate | ISO \| null | |
| durationOfUseMonths | number \| null | |
| infoSource | `"self-reported" \| "imported-record" \| "clinician-approved"` | |
| lastReviewDate / nextReviewDate | ISO \| null | Drives review reminder + overdue flag |
| otherMedicationsNote | string \| null | Free text only — no interaction logic |

### TreatmentPlan (versioned)
| Field | Type | Notes |
|---|---|---|
| version | integer ≥ 1 | Bumped on every substantive edit |
| status | `draft \| awaiting-review \| active \| review-required \| paused \| superseded \| completed` | See state machine below |
| source | `"clinician-approved" \| "user-recorded" \| "imported-record"` | |
| authorization | `"authorized" \| "unauthorized" \| "pending"` | `authorized` requires `authorizedBy` (SQL CHECK enforces) |
| authorizedBy / authorizedAt | string / timestamp | Named clinician — user-recorded |
| effectiveDate / nextReviewDate | ISO \| null | |
| goal | `"reduce" \| "maintain" \| "stabilize-then-decide" \| "other" \| null` | |
| milestones | `{id,date,title,amount?,unit?,description?}[]` | **Recorded only** — the app never generates milestones |
| notes | string \| null | |

**Status state machine** (`src/lib/plan/status.ts`, unit-tested):

```
draft → awaiting-review | active | superseded
awaiting-review → draft | active | superseded
active → review-required | paused | superseded | completed
review-required → active | paused | superseded | completed
paused → active | superseded | completed
superseded → (terminal)
completed → superseded
```

`reviewOverdue` is a **display flag only** (`deriveDisplayedPlan`); stored status never
auto-advances. All transitions go through `validateTransition`.

### DailyMedicationLog — one row per (user, date)
`entries[]`: `{id, slotIndex, plannedTime, plannedAmount, status: "taken"|"delayed"|"missed"|"uncertain", actualTime?, actualAmount?, note?}`

Prescribed (`planned*`) and actual (`actual*`) are stored **independently**; a
discrepancy is flagged downstream by `src/lib/safety`, never normalized away.

### DailySymptomLog — one row per (user, date)
0–4 integer scales: sleepQuality, anxiety, craving, gi, sweatingChills,
achesRestlessness, mood; `adherenceDifficulty: "none"|"minor"|"major"`;
`unsure: string[]` (free-text items the user is unsure about); `other: string | null`.

### ReminderPrefs (single row per user)
medication + times[], checkin + time, logReview + time, reviewLeadDays (0–14), muted.

### PlanEvent, SafetyEvent, AuditLog — append-only history
- **PlanEvent**: `created | updated | status-changed | authorized | review-recorded | superseded` with from/to status.
- **SafetyEvent**: `escalation-flag | guidance-shown | emergency-info-opened` + detail.
- **AuditLog**: every mutating app action (action, entity, entityId, summary, at) — shown in Settings → history.

## 2. Local persistence (MVP default)

- Store keys: `hamrah-darman:data:user:v1` (real) and `hamrah-darman:data:demo:v1`
  (synthetic), `hamrah-darman:mode` ∈ {`user`,`demo`} — buckets never mix.
- Payload: one JSON document `{version, profile, medicationProfile, medicationLogs[],
  symptomLogs[], plans[], planEvents[], safetyEvents[], reminders[], auditLog[]}` with
  its own `version` for future migrations.
- All writes go through the store actions and return `Result`-style errors; failures
  are surfaced in UI (never silent, never fake success).
- Export: full JSON + CSV (medication and symptom series) — manual, user-initiated.
- Wipe: per-bucket reset with `ConfirmDialog`; demo wipe never touches user bucket.

## 3. Backend schema (Supabase — authored, disabled)

`supabase/migrations/0001_init.sql` creates 9 tables (`profiles`,
`medication_profiles`, `treatment_plans`, `plan_events`, `daily_medication_logs`,
`daily_symptom_logs`, `reminders`, `safety_events`, `audit_logs`) with:

- `user_id uuid references auth.users` on every user-scoped table;
- RLS enabled with owner-only select/insert/update/delete policies;
- CHECK constraints mirroring TS invariants (statuses, authorization ⇒ authorizedBy,
  ranges 0–4, administrations 1–6, reviewLeadDays 0–14);
- `updated_at` triggers; auto-bootstrap of `profiles` + `reminders` on signup;
- synthetic seed in `supabase/seed.sql` (flagged `is_demo = true`).

The backend is intentionally **not wired** in MVP: no env vars are read, no client is
bundled. Enabling it is an explicit product decision — see
`docs/security-model.md` §4.
