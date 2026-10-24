# Design System — رسا | RASA

**Source of truth:** the approved Google Stitch project "Persian Methadone Tracker App"
(design references in `design-ref/` — dashboard, medication log, reports, profile,
welcome screens). This document maps those visuals to the tokens implemented in
`src/app/globals.css`.

---

## 1. Foundations

- **Layout:** mobile-first, max content width ~28rem, right-to-left (`dir="rtl"`).
- **Typeface:** **PeydaFaNum** (bundled locally in `src/app/fonts/`, woff2 only — no
  font CDN, no runtime network requests). Its built-in Farsi numerals guarantee all
  digits render as ۰–۹ without per-string conversion.
- **Radii:** `--radius-sm: .25rem`, `--radius-md: .5rem`, `--radius-card: .75rem`.
- **Density:** M3-style generous touch targets (≥ 44px), 4/8-point spacing rhythm.

## 2. Color tokens (Material 3 roles)

### Core

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#003644` | Primary buttons, active nav, key headings |
| `--color-on-primary` | light on-primary | Text/icon on primary |
| `--color-primary-container` | `#134e5e` | Hero cards, emphasis containers |
| `--color-secondary` | `#006a60` | Secondary accents, links |
| `--color-secondary-container` | `#8cf5e4` | Success/"taken" chips, active states |
| `--color-tertiary` | `#4e2700` | Tertiary text on tertiary-fixed |
| `--color-tertiary-fixed` | `#ffa04c` | "delayed" chip tone |
| `--color-error` | `#ba1a1a` | Error text, destructive actions |
| `--color-error-container` | | "missed" chip tone, error boxes |

### Surfaces

| Token | Value | Usage |
|---|---|---|
| `--color-surface` | `#f9f9ff` | App background |
| `--color-surface-container-lowest` | `#ffffff` | Cards over surface |
| `--color-surface-container-low` | `#f0f3ff` | Section containers |
| `--color-surface-container` | `#e7eeff` | Elevated containers |
| `--color-surface-container-high` | `#dee8ff` | Skeletons, pressed states |
| `--color-surface-container-highest` | `#d8e3fb` | Highest-emphasis containers |
| `--color-on-surface` | `#111c2d` | Primary text |
| `--color-on-surface-variant` | | Secondary text |
| `--color-outline` / `--color-outline-variant` | | Borders/dividers |

### Custom rose accent (from the approved design)

| Token | Value | Usage |
|---|---|---|
| `--color-rose-container` | `#fce9f1` | Warm highlight containers |
| `--color-rose` | `#f5c9db` | Decorative fills |
| `--color-rose-on` | `#a84468` | Text/icon on rose |

## 3. Type scale

Semantic classes (see `globals.css`) — sizes in px/line-height:

| Class | Size/Line | Role |
|---|---|---|
| `t-headline-lg` | 30/44 | Welcome/hero statements |
| `t-headline-md` | 26/36 | Page H1 |
| `t-headline-sm` | 20/28 | Card titles |
| `t-title-lg` | 18/28 | Section titles |
| `t-title-md` | 16/24 | List titles, prominent labels |
| `t-body-lg` | 15/24 | Long-form copy |
| `t-body-md` | 14/20 | Default body |
| `t-label-lg` | 13/18 | Buttons, chips |
| `t-label-md` | 12/16 | Field labels, captions |
| `t-label-sm` | 10/16 | Legal/disclaimer micro-copy |

## 4. Core components

Implemented in `src/components/ui/` + `src/components/layout/`:

- **Button** — variants: primary (primary/on-primary), tonal (secondary-container),
  outline (outline), text; destructive uses error; loading state supported.
- **Card** — `rounded-card`, surface-container-lowest, subtle outline.
- **Chips / PlanStatusBadge** — status-colored; plan statuses use the exact palette
  mapping from the design (active → secondary-container, review-required →
  tertiary-fixed, paused → surface-container-high, superseded → outline).
- **Stepper** — the medication page's large ± control (approved screen 02), LTR
  numeral layout for amount entry, Persian labels around it.
- **LineChart** — SVG, null-gap aware (missing days break the line rather than
  inventing zeros), Jalali date ticks.
- **EmptyState, ErrorBox, ConfirmDialog, PageLoading** — consistent neutral states;
  `PageLoading` is an `aria-busy` skeleton so hydration never blanks the page.
- **AppShell** — top header (logo رسا | RASA + date) and bottom navigation
  (خانه، دارو، برنامه، گزارش، تنظیمات) with safe-area padding (`pb-safe`).

## 5. RTL & numerals rules

- Logical properties everywhere (`ms-`, `me-`, `ps-`, `pe-`); no hard `left/right`
  except for the stepper's directional arrows, which are mirrored via `rtl:` variants.
- Digits: PeydaFaNum renders Latin digits as Persian glyphs automatically; explicit
  `toFaDigits()` is used where mixed content could fall back (chart ticks, CSV export
  uses Latin digits intentionally — it is a data file).
- Dates: `faDate()` composes «شنبه، ۲ آبان ۱۴۰۵» manually — `Intl` alone merges the
  weekday into the wrong position.

## 6. Motion & feedback

- No decorative motion. Transitions limited to 150–200 ms opacity/transform.
- Save success = quiet confirmation text (not celebratory animation) — the product
  deliberately avoids gamifying medication-taking.
- Loading = `PageLoading` skeleton, `animate-pulse` only.

## 7. Accessibility

- Contrast: all text tokens meet WCAG AA against their backgrounds (on-surface on
  surface; on-primary on primary; tertiary on tertiary-fixed).
- Touch targets ≥ 44px; focus-visible rings on all interactive elements.
- `aria-busy`/`aria-live` on loading region; `role="switch"` toggles; labelled fields.
- Full keyboard operability (stepper responds to arrow keys).
