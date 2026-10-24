# Clinical Safety Boundaries — رسا | RASA

**Document purpose:** define, in auditable form, what the app must never say or do, and
what it does instead. This document is the contract the clinical-rules module
(`src/lib/clinical/rules.ts`, `src/lib/safety/index.ts`) and all UI copy implement.

**Ruleset version:** `clinical-rules@1` — any change to a boundary below requires
bumping this version and updating tests.

---

## 1. Hard prohibitions (the app NEVER)

| # | Prohibition | Implementation |
|---|---|---|
| P1 | Never generate, suggest, or auto-complete a taper/reduction schedule | `clinical/rules.ts` contains no schedule generator; plan milestones are user-recorded only |
| P2 | Never recommend a dose, dose change, or dose timing for the individual | Conversion functions are informational (`mg` ⇄ `mL`/tablet from labelled values) and labelled as such in UI |
| P3 | Never advise "catch-up" doses, double doses, or compensating after a missed dose | Missed-dose guidance text is neutral: contact centre/clinician, record honestly |
| P4 | Never diagnose, triage severity, or predict withdrawal | Check-in output uses flag language («قابل پیگیری است», «با مرکز درمان در میان بگذارید»), never diagnoses |
| P5 | Never present passage of time as clinical authorization | `deriveDisplayedPlan()` computes `reviewOverdue` but never changes stored status; transitions are explicit user actions validated by `ALLOWED_TRANSITIONS` |
| P6 | Never fabricate emergency numbers or services | Only public, verifiable Iranian numbers: ۱۱۵ (ambulance), ۱۴۹۰ (social emergency). Numbers are data-tested |
| P7 | Never obscure or hide risk information to make the UX calmer | Safety flags are always rendered when criteria are met; no dismissal without user action |
| P8 | Never store or transmit data without explicit user action | Local-first; backend disabled by default; export is manual |

## 2. Required behaviour (the app ALWAYS)

1. **Separate prescribed from actual.** Every dose record stores `plannedAmount` /
   `plannedTime` and `actualAmount` / `actualTime` independently. Discrepancy is a
   *flag*, never a correction.
2. **Authorize explicitly.** A plan displays as active/authorized only with
   `authorization === "authorized"` plus `authorizedBy` recorded. Review overdue →
   display flag `review-required` while stored status stays untouched.
3. **Neutral uncertainty handling.** The "مطمئن نیستم" (uncertain) dose status and the
   check-in "unsure" list produce guidance to consult the treatment centre, never
   interpretation.
4. **Escalation criteria are conservative and general** (see §3) and always carry the
   disclaimer that they are general information, not a personal assessment.
5. **Errors never fake success.** Storage failures surface typed errors
   (`Result`-based APIs) with a Persian message in the UI.

## 3. Escalation flag criteria (`evaluateDaySignals` / safety checks)

The app may display an **escalation flag** (نشان هشدار) when *any* of these recorded
patterns exist. Flags direct the user to their treatment centre or emergency services;
they never state what the user should take.

- Missed doses recorded on ≥ 2 of the last 3 days, or 2+ missed slots in one day.
- A recorded **uncertain** dose together with any symptom scored ≥ 3 (of 4) that day.
- Planned ≠ actual amount recorded for the same slot, differing by more than the
  recorded plan's ±25% (informational discrepancy flag).
- Check-in items the user marked "unsure" involving chest pain, breathing, confusion,
  or severe drowsiness → **immediate emergency panel** (۱۱۵) with a clear "این هشدار
  عمومی است" label.

The thresholds live in `src/lib/safety/index.ts` and are unit-tested; changing them is
a clinical-rules version change.

## 4. Emergency information policy

- Numbers shown: **۱۱۵** (pre-hospital emergency), **۱۴۹۰** (social emergency). Both
  are asserted by tests so copy drift cannot remove them.
- The emergency panel always states: this is general guidance; if a situation seems
  life-threatening, call immediately; do not wait for the app.
- Personal emergency contacts are user-entered free-form entries (label + phone),
  stored locally, and never validated as medical services.

## 5. Copy review checklist (for any new string)

Before a user-facing string ships, verify it does **not**:

- contain a verb prescribing a dose («بخور», «کاهش بده», «دو قرص مصرف کن») —
  describing what the user *recorded* is fine; instructing is not;
- contain the word «باید» directed at the user's medical behaviour (allowed for
  app mechanics: «برای ذخیره، تاریخ را وارد کنید»);
- imply diagnosis («شما دچار ترک شده‌اید») instead of observation («علائم ثبت‌شده
  بالاست»);
- contain English fragments (see §6).

## 6. Language hygiene

All UI strings are Persian. Persian numerals render via the PeydaFaNum typeface;
dates are Jalali. A unit test (`tests/unit/rtl.test.tsx`) guards against Latin digit
and stray-English leakage in key UI components.

## 7. Change management

- `src/lib/clinical/rules.ts` is the single source of truth for rule constants
  (thresholds, labels, emergency numbers) and carries a version constant.
- Any edit to boundaries in this document must ship together with: ruleset version
  bump, unit tests, and a note in the README changelog section.
