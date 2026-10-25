"use client";

/**
 * JalaliDatePicker — the ONLY date entry control in the app.
 * Fully Persian (Shamsi): month names, weekday order (Saturday-first) and
 * Persian digits. Storage/props stay ISO `yyyy-mm-dd`; the Gregorian
 * calendar never leaks into the UI.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
import {
  JALAALI_WEEKDAYS,
  faJalaliMonthYear,
  jalaliMonthGrid,
  todayIso,
  todayJalali,
  toJalaliParts,
  toFaDigits,
} from "@/lib/dates";

export function JalaliDatePicker({
  value,
  onChange,
  label,
  hint,
  min,
  max,
  placeholder = "انتخاب تاریخ",
  disabled = false,
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
  label?: string;
  hint?: string;
  min?: string | null;
  max?: string | null;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const todayJ = todayJalali();
  const selectedJ = toJalaliParts(value);
  const [view, setView] = useState<{ jy: number; jm: number }>(
    selectedJ ?? { jy: todayJ.jy, jm: todayJ.jm },
  );

  // keep the popup month in sync when the value changes while closed
  useEffect(() => {
    if (selectedJ) setView({ jy: selectedJ.jy, jm: selectedJ.jm });
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const grid = useMemo(() => jalaliMonthGrid(view.jy, view.jm), [view]);

  const goMonth = (delta: number) => {
    setView((v) => {
      let jy = v.jy;
      let jm = v.jm + delta;
      if (jm > 12) {
        jm = 1;
        jy += 1;
      }
      if (jm < 1) {
        jm = 12;
        jy -= 1;
      }
      return { jy, jm };
    });
  };

  const pick = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };

  return (
    <div className="relative" ref={rootRef}>
      {label ? (
        <label className="t-label-md mb-1 block text-on-surface-variant">{label}</label>
      ) : null}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex w-full items-center justify-between rounded-lg border bg-surface-container-lowest px-3 py-2.5 t-body-md text-start transition-colors ${
          open ? "border-secondary" : "border-outline-variant"
        } ${disabled ? "opacity-50" : ""}`}
      >
        <span className={value ? "text-on-surface" : "text-on-surface-variant"}>
          {value ? faDisplay(value) : placeholder}
        </span>
        <Icon name="calendar" size={18} className="shrink-0 text-on-surface-variant" />
      </button>

      {hint ? <p className="t-label-sm mt-1 text-on-surface-variant">{hint}</p> : null}

      {open ? (
        <div
          role="dialog"
          aria-label={`تقویم ${faJalaliMonthYear(view.jy, view.jm)}`}
          className="absolute z-50 mt-1 w-[19rem] rounded-card border border-surface-container-high bg-surface-container-lowest p-3 shadow-raised"
        >
          {/* header: month nav */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="ماه قبل"
              onClick={() => goMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
            >
              <Icon name="chevron-right" size={16} />
            </button>
            <p className="t-label-lg font-semibold text-on-surface">
              {faJalaliMonthYear(view.jy, view.jm)}
            </p>
            <button
              type="button"
              aria-label="ماه بعد"
              onClick={() => goMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
            >
              <Icon name="chevron-left" size={16} />
            </button>
          </div>

          {/* weekday header — Saturday first */}
          <div className="mt-2 grid grid-cols-7">
            {JALAALI_WEEKDAYS.map((w, i) => (
              <span key={i} className="t-label-sm py-1 text-center text-on-surface-variant">
                {w}
              </span>
            ))}
          </div>

          {/* day grid */}
          <div className="grid grid-cols-7">
            {grid.flat().map((cell, i) => {
              if (!cell.inMonth || !cell.iso) {
                return <span key={i} className="h-9" aria-hidden="true" />;
              }
              const isToday = cell.iso === todayIso();
              const isSelected = cell.iso === value;
              const outOfRange =
                (min !== null && min !== undefined && cell.iso < min) ||
                (max !== null && max !== undefined && cell.iso > max);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={outOfRange}
                  onClick={() => pick(cell.iso!)}
                  className={`m-0.5 flex h-9 w-9 items-center justify-center self-center justify-self-center rounded-full t-label-lg transition-colors ${
                    isSelected
                      ? "bg-primary font-bold text-on-primary"
                      : isToday
                        ? "border-2 border-secondary font-bold text-secondary"
                        : "text-on-surface hover:bg-surface-container-high"
                  } ${outOfRange ? "cursor-not-allowed opacity-30 hover:bg-transparent" : ""}`}
                  aria-label={cell.iso}
                  aria-current={isToday ? "date" : undefined}
                  aria-pressed={isSelected}
                >
                  {toFaDigits(cell.jd)}
                </button>
              );
            })}
          </div>

          {/* footer: today + clear */}
          <div className="mt-2 flex items-center justify-between border-t border-outline-variant/40 pt-2">
            <button
              type="button"
              onClick={() => pick(todayIso())}
              className="chip bg-secondary-container text-on-secondary-container"
            >
              امروز
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="t-label-md text-on-surface-variant hover:text-error"
            >
              پاک‌کردن
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** ISO → «۱۴۰۳/۰۸/۱۵» (Persian digits) for the closed control. */
function faDisplay(iso: string): string {
  const j = toJalaliParts(iso);
  if (!j) return iso;
  return `${toFaDigits(j.jy)}/${toFaDigits(String(j.jm).padStart(2, "0"))}/${toFaDigits(
    String(j.jd).padStart(2, "0"),
  )}`;
}
