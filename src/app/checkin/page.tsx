"use client";

/**
 * Daily wellbeing check-in. Consistent 0–4 scale with per-item direction
 * labels, "مطمئن نیستم" option, optional everything. NOT a diagnostic score —
 * results feed trends and conservative flags only.
 */

import { useEffect, useState } from "react";
import { useApp } from "@/features/app-store";
import { Card, SectionTitle, Button, ErrorBox, TextField, PageLoading } from "@/components/ui/primitives";
import { PageHeader } from "@/components/layout/page-header";
import { SafetyNotice } from "@/components/ui/safety-notice";
import { todayIso } from "@/lib/dates";
import { evaluateCheckinSignals } from "@/lib/safety";
import type { SymptomKey, SymptomLog } from "@/types";

interface ScaleItem {
  key: SymptomKey;
  label: string;
  lowLabel: string;
  highLabel: string;
  inverted?: boolean;
}

const ITEMS: ScaleItem[] = [
  { key: "sleepQuality", label: "کیفیت خواب دیشب", lowLabel: "خیلی بد", highLabel: "خیلی خوب", inverted: true },
  { key: "anxiety", label: "اضطراب یا بی‌قراری", lowLabel: "هیچ", highLabel: "خیلی شدید" },
  { key: "craving", label: "میل شدید به مصرف", lowLabel: "هیچ", highLabel: "خیلی شدید" },
  { key: "gi", label: "نشانه‌های گوارشی (تهوع، اسهال…)", lowLabel: "هیچ", highLabel: "خیلی شدید" },
  { key: "sweatingChills", label: "عرق‌سرد یا لرز", lowLabel: "هیچ", highLabel: "خیلی شدید" },
  { key: "achesRestlessness", label: "درد عضلانی یا بی‌قراری بدنی", lowLabel: "هیچ", highLabel: "خیلی شدید" },
  { key: "mood", label: "حال عمومی", lowLabel: "خیلی بد", highLabel: "خیلی خوب", inverted: true },
];

const SCALE = [
  { v: 0, fa: "۰" },
  { v: 1, fa: "۱" },
  { v: 2, fa: "۲" },
  { v: 3, fa: "۳" },
  { v: 4, fa: "۴" },
];

function blankLog(date: string): SymptomLog {
  return {
    date,
    sleepQuality: null,
    anxiety: null,
    craving: null,
    gi: null,
    sweatingChills: null,
    achesRestlessness: null,
    mood: null,
    adherenceDifficulty: null,
    unsure: [],
    other: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function CheckinPage() {
  const { data, ready, actions } = useApp();
  const today = todayIso();
  const [log, setLog] = useState<SymptomLog>(blankLog(today));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    const existing = data.symptomLogs.find((l) => l.date === today);
    if (existing) setLog(existing);
  }, [data, today]);

  const setValue = (key: SymptomKey, v: number | null) =>
    setLog((prev) => ({ ...prev, [key]: prev.unsure.includes(key) && v !== null ? prev[key] : v }));

  const toggleUnsure = (key: SymptomKey) =>
    setLog((prev) => ({
      ...prev,
      unsure: prev.unsure.includes(key) ? prev.unsure.filter((k) => k !== key) : [...prev.unsure, key],
    }));

  const save = async () => {
    setError(null);
    setSaved(false);
    const res = await actions.upsertSymptomLog({ ...log, updatedAt: new Date().toISOString() });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSaved(true);
  };

  if (!ready) return <PageLoading />;

  const signals = evaluateCheckinSignals({ ...log, date: today, createdAt: log.createdAt, updatedAt: log.updatedAt });
  const answered = ITEMS.filter((i) => log[i.key] !== null).length;

  return (
    <>
      <PageHeader title="چک‌این روزانه" subtitle="چند سؤال کوتاه درباره حال امروز — همه اختیاری" />

      <Card className="mb-4">
        <SectionTitle icon="heart">
          حال امروز {answered > 0 ? `(${answered.toLocaleString("fa-IR")} مورد)` : ""}
        </SectionTitle>
        <div className="flex flex-col gap-5">
          {ITEMS.map((item) => {
            const value = log[item.key];
            const unsure = log.unsure.includes(item.key);
            return (
              <div key={item.key}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="t-label-lg text-on-surface">{item.label}</p>
                  <button
                    onClick={() => toggleUnsure(item.key)}
                    className={`chip border ${unsure ? "border-secondary bg-secondary-container text-on-secondary-container" : "border-outline-variant text-on-surface-variant"}`}
                  >
                    {unsure ? "مطمئن نیستم ✓" : "مطمئن نیستم"}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-1" role="radiogroup" aria-label={item.label}>
                  {SCALE.map((s) => (
                    <button
                      key={s.v}
                      role="radio"
                      aria-checked={value === s.v}
                      disabled={unsure}
                      onClick={() => setValue(item.key, s.v)}
                      className={`h-10 flex-1 rounded-lg border t-label-lg transition-colors ${
                        value === s.v
                          ? "border-transparent bg-secondary text-on-secondary"
                          : unsure
                            ? "border-surface-container bg-surface-container-low text-outline"
                            : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
                      }`}
                    >
                      {s.fa}
                    </button>
                  ))}
                </div>
                <div className="t-label-sm mt-1 flex justify-between text-on-surface-variant">
                  <span>{item.lowLabel}</span>
                  <span>{item.highLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="mb-4">
        <SectionTitle icon="pill">دشواری مصرف طبق برنامه</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { v: "none", l: "نداشتم" },
              { v: "minor", l: "کم" },
              { v: "major", l: "زیاد" },
            ] as const
          ).map((o) => (
            <button
              key={o.v}
              onClick={() => setLog((p) => ({ ...p, adherenceDifficulty: o.v }))}
              className={`rounded-pill border py-2 t-label-md ${
                log.adherenceDifficulty === o.v
                  ? "border-transparent bg-secondary-container text-on-secondary-container"
                  : "border-outline-variant text-on-surface-variant"
              }`}
            >
              {o.l}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <TextField
            value={log.other ?? ""}
            onChange={(v) => setLog((p) => ({ ...p, other: v }))}
            placeholder="نکته دیگری که می‌خواهید ثبت کنید (اختیاری)"
          />
        </div>
      </Card>

      {signals.length > 0 ? (
        <div className="mb-4 flex flex-col gap-2">
          {signals.map((f) => (
            <SafetyNotice key={f.id} flag={f} />
          ))}
        </div>
      ) : null}

      {error ? <ErrorBox message={error} onClose={() => setError(null)} /> : null}
      {saved ? (
        <div className="mb-4 rounded-card bg-secondary-container/50 px-4 py-3 t-body-md text-on-secondary-container">
          چک‌این امروز ذخیره شد ✓
        </div>
      ) : null}

      <Button full size="lg" onClick={save}>
        ذخیره چک‌این
      </Button>
      <p className="t-body-sm mt-2 text-center text-on-surface-variant">
        این پرسشنامه ابزار تشخیص شدت ترک نیست و مبنای تغییر دوز قرار نمی‌گیرد؛ فقط برای روند و
        یادآوری مراقبت است.
      </p>
    </>
  );
}
