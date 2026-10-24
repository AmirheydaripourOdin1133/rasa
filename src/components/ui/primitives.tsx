"use client";

import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { PLAN_STATUS_LABELS, PLAN_STATUS_TONES } from "@/lib/plan/status";
import type { PlanStatus } from "@/types";

export { Button } from "@/components/ui/button";

/* ---------------------- Design-system section card ------------------------ */

/**
 * Card with an icon chip, title, optional subtitle and trailing chip —
 * matches the approved screen layout (icon chip at start, meta chip at end).
 */
export function SectionCard({
  icon,
  iconTone = "bg-surface-container-high text-on-surface",
  title,
  subtitle,
  trailing,
  children,
  className = "",
}: {
  icon: IconName;
  iconTone?: string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-4 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-card ${iconTone}`}>
            <Icon name={icon} size={19} />
          </span>
          <div>
            <h2 className="t-title-md text-on-surface">{title}</h2>
            {subtitle ? <p className="t-label-md text-on-surface-variant">{subtitle}</p> : null}
          </div>
        </div>
        {trailing}
      </div>
      {children}
    </section>
  );
}

/** Key–value row with a leading icon chip (profile/plan summary rows). */
export function InfoRow({
  icon,
  label,
  value,
  trailing,
  href,
}: {
  icon: IconName;
  label: string;
  value?: string;
  trailing?: ReactNode;
  href?: string;
}) {
  const inner = (
    <span className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card bg-surface-container-high text-on-surface">
        <Icon name={icon} size={16} />
      </span>
      <span>
        <span className="t-label-md block text-on-surface-variant">{label}</span>
        {value ? <span className="t-label-lg block font-semibold text-on-surface">{value}</span> : null}
      </span>
    </span>
  );
  const cls =
    "flex w-full items-center justify-between rounded-card bg-surface-container-low px-3 py-2.5 text-start";
  if (href) {
    return (
      <a href={href} className={`${cls} transition-transform active:scale-[0.99]`}>
        {inner}
        {trailing ?? <Icon name="chevron-left" size={15} className="text-on-surface-variant" />}
      </a>
    );
  }
  return (
    <div className={cls}>
      {inner}
      {trailing}
    </div>
  );
}

/* ---------------------------------- Card ---------------------------------- */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card p-4 md:p-5 ${className}`}>{children}</section>;
}

export function SectionTitle({
  icon,
  children,
  action,
}: {
  icon?: React.ComponentProps<typeof Icon>["name"];
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="t-headline-sm flex items-center gap-2 text-on-surface">
        {icon ? (
          <span className="text-secondary">
            <Icon name={icon} size={18} />
          </span>
        ) : null}
        {children}
      </h2>
      {action}
    </div>
  );
}

/* --------------------------------- Badges --------------------------------- */

export type Tone = "neutral" | "info" | "success" | "caution" | "danger" | "rose";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-surface-container text-on-surface-variant",
  info: "bg-surface-container-high text-on-surface",
  success: "bg-secondary-container text-on-secondary-container",
  caution: "bg-tertiary-fixed text-tertiary",
  danger: "bg-error-container text-on-error-container",
  rose: "bg-rose-soft text-rose-ink",
};

export function Chip({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return <span className={`chip ${TONE_CLASSES[tone]} ${className}`}>{children}</span>;
}

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  return <Chip tone={PLAN_STATUS_TONES[status]}>{PLAN_STATUS_LABELS[status]}</Chip>;
}

/* --------------------------------- Fields --------------------------------- */

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="t-label-lg mb-1.5 block text-on-surface">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="t-body-sm mt-1 text-on-surface-variant">{hint}</p> : null}
      {error ? (
        <p className="t-body-sm mt-1 text-on-error-container" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const inputBase =
  "w-full rounded-lg border bg-surface-container-lowest px-3 py-2.5 t-body-md text-on-surface placeholder:text-outline focus:border-secondary focus:outline-none";

export function TextField({
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  invalid = false,
  inputMode,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  invalid?: boolean;
  inputMode?: "text" | "decimal" | "numeric" | "tel";
}) {
  return (
    <input
      id={id}
      type={type}
      inputMode={inputMode}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={invalid}
      className={`${inputBase} ${invalid ? "border-error" : "border-outline-variant"}`}
    />
  );
}

/** Numeric input: LTR direction, accepts Persian digits, optional unit suffix. */
export function NumberField({
  id,
  value,
  onChange,
  unit,
  placeholder = "۰",
  invalid = false,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <div
      className={`flex items-center overflow-hidden rounded-lg border bg-surface-container-lowest ${invalid ? "border-error" : "border-outline-variant"} focus-within:border-secondary`}
    >
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        className="num-input min-w-0 flex-1 bg-transparent px-3 py-2.5 t-body-md text-on-surface placeholder:text-outline focus:outline-none"
      />
      {unit ? (
        <span className="t-label-lg shrink-0 border-r border-outline-variant bg-surface-container-low px-3 py-2.5 text-on-surface-variant">
          {unit}
        </span>
      ) : null}
    </div>
  );
}

export function TimeField({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
}) {
  return (
    <input
      id={id}
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputBase} num-input border-outline-variant`}
    />
  );
}

export function SelectField<T extends string>({
  value,
  onChange,
  options,
  id,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  id?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={`${inputBase} border-outline-variant`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="t-label-lg text-on-surface">{label}</p>
        {description ? (
          <p className="t-body-sm text-on-surface-variant">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-pill transition-colors ${checked ? "bg-secondary" : "bg-surface-container-highest"}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-surface-container-lowest shadow transition-all ${checked ? "right-1" : "right-6"}`}
        />
      </button>
    </div>
  );
}

/* ------------------------------ States & dialogs --------------------------- */

export function EmptyState({
  icon = "note",
  title,
  body,
  action,
}: {
  icon?: React.ComponentProps<typeof Icon>["name"];
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-outline-variant bg-surface-container-low px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
        <Icon name={icon} size={24} />
      </span>
      <p className="t-headline-sm text-on-surface">{title}</p>
      <p className="t-body-md max-w-xs text-on-surface-variant">{body}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/**
 * Neutral loading skeleton shown while the app store hydrates from local
 * storage. Keeps the page structure visible instead of a blank shell so
 * users never see an empty screen during the brief hydration window.
 */
export function PageLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">در حال بارگذاری…</span>
      <div className="h-24 rounded-card bg-surface-container-high" />
      <div className="space-y-3 rounded-card bg-surface-container-low px-5 py-6">
        <div className="h-5 w-32 rounded-full bg-surface-container-high" />
        <div className="h-4 w-full rounded-full bg-surface-container-high" />
        <div className="h-4 w-3/4 rounded-full bg-surface-container-high" />
      </div>
      <div className="space-y-3 rounded-card bg-surface-container-low px-5 py-6">
        <div className="h-5 w-24 rounded-full bg-surface-container-high" />
        <div className="h-4 w-5/6 rounded-full bg-surface-container-high" />
        <div className="h-4 w-2/3 rounded-full bg-surface-container-high" />
      </div>
    </div>
  );
}

export function ErrorBox({ message, onClose }: { message: string; onClose?: () => void }) {
  return (
    <div
      role="alert"
      className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-error-container bg-error-container/60 px-4 py-3"
    >
      <p className="t-body-md text-on-error-container">{message}</p>
      {onClose ? (
        <button onClick={onClose} aria-label="بستن" className="text-on-error-container">
          <Icon name="x" size={16} />
        </button>
      ) : null}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "تأیید",
  cancelLabel = "انصراف",
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-inverse-surface/40 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div
        className="card w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="t-headline-sm mb-2 text-on-surface">{title}</p>
        <p className="t-body-md mb-5 text-on-surface-variant">{body}</p>
        <div className="flex gap-2">
          <Button variant={danger ? "danger" : "primary"} full onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button variant="outline" full onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
