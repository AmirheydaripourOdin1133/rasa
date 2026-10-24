"use client";

/**
 * Reports & trends — following the approved design (screen 02):
 * dark gradient hero, ring stats, phase progress bar, summary grid, symptom
 * bars, dose chart, and a dark "export for visit" CTA.
 * Every measure is explicitly defined from recorded data only; missing days
 * create chart gaps; nothing here is a clinical judgement.
 */

import { useMemo, useState } from "react";
import { useApp } from "@/features/app-store";
import { Card, SectionTitle, PageLoading } from "@/components/ui/primitives";
import { LineChart, type SeriesPoint } from "@/components/charts/line-chart";
import { todayIso, addDaysIso, daysBetweenIso } from "@/lib/dates";
import { parsePositiveDecimal, formatAmount } from "@/lib/medication-units";
import { Icon } from "@/components/ui/icons";

type Period = "week" | "month" | "all";

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Small donut ring (display-only percentage). Value text lives below the ring so numbers always fit. */
function Ring({ pct, inside, title, sub }: { pct: number | null; inside: string; title: string; sub: string }) {
  const R = 22;
  const C = 2 * Math.PI * R;
  const off = pct === null ? C : C * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return (
    <div className="flex flex-1 items-center gap-3 rounded-card bg-surface-container-low p-2.5">
      <svg width="56" height="56" viewBox="0 0 56 56" className="shrink-0" aria-hidden="true">
        <circle cx="28" cy="28" r={R} fill="none" stroke="var(--color-surface-container-highest)" strokeWidth="5.5" />
        <circle
          cx="28"
          cy="28"
          r={R}
          fill="none"
          stroke="var(--color-secondary)"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={off}
          transform="rotate(-90 28 28)"
        />
        <text x="28" y="32" textAnchor="middle" fontSize="12" fontWeight="700" className="fill-current text-on-surface">
          {inside}
        </text>
      </svg>
      <div className="min-w-0">
        <p className="t-label-lg truncate font-semibold text-on-surface">{title}</p>
        <p className="t-label-sm text-on-surface-variant">{sub}</p>
      </div>
    </div>
  );
}

/** Horizontal measure bar used in the symptom summary (0–100 display). */
function MeasureBar({
  icon,
  title,
  sub,
  pct,
}: {
  icon: "moon" | "zap" | "shield";
  title: string;
  sub: string;
  pct: number | null;
}) {
  const w = pct === null ? 0 : Math.min(100, Math.max(0, pct));
  return (
    <div className="rounded-card bg-surface-container-low p-3">
      <div className="flex items-center justify-between">
        <span className="t-label-lg flex items-center gap-1.5 text-on-surface">
          <Icon name={icon} size={15} className="text-secondary" />
          {title}
        </span>
        <span className="t-label-md text-on-surface-variant">{sub}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-pill bg-surface-container-highest">
        <div className="h-full rounded-pill bg-secondary transition-[width]" style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { data, ready } = useApp();
  const [period, setPeriod] = useState<Period>("month");
  const today = todayIso();

  const unit = data?.medicationProfile?.formulation === "tablet" ? "tablet" : "mL";
  const unitLabel = unit === "mL" ? "میلی‌لیتر" : "قرص";
  const from = period === "week" ? addDaysIso(today, -6) : period === "month" ? addDaysIso(today, -29) : "0000-01-01";

  const doseSeries: SeriesPoint[] = useMemo(() => {
    if (!data) return [];
    return data.medicationLogs
      .filter((l) => l.date >= from)
      .map((l) => {
        const actual = l.entries.map((e) => (e.status === "missed" ? null : e.actualAmount)).find((a) => a !== null && a !== undefined);
        return { date: l.date, value: actual && parsePositiveDecimal(actual, { allowZero: true }).ok ? parsePositiveDecimal(actual, { allowZero: true }).ok! ? Number(actual) : null : null };
      });
  }, [data, from]);

  const plannedSeries: SeriesPoint[] = useMemo(() => {
    if (!data) return [];
    return data.medicationLogs
      .filter((l) => l.date >= from)
      .map((l) => {
        const p = l.entries[0]?.plannedAmount ?? null;
        return { date: l.date, value: p !== null && parsePositiveDecimal(p, { allowZero: true }).ok ? Number(p) : null };
      });
  }, [data, from]);

  const moodSeries: SeriesPoint[] = useMemo(() => {
    if (!data) return [];
    return data.symptomLogs.filter((s) => s.date >= from).map((s) => ({ date: s.date, value: s.mood }));
  }, [data, from]);

  const cravingSeries: SeriesPoint[] = useMemo(() => {
    if (!data) return [];
    return data.symptomLogs.filter((s) => s.date >= from).map((s) => ({ date: s.date, value: s.craving }));
  }, [data, from]);

  const stats = useMemo(() => {
    if (!data) return null;
    const logs = data.medicationLogs.filter((l) => l.date >= from);
    const days = logs.length;
    let taken = 0, missed = 0, uncertain = 0, delayed = 0, totalEntries = 0;
    for (const l of logs)
      for (const e of l.entries) {
        totalEntries++;
        if (e.status === "taken") taken++;
        else if (e.status === "missed") missed++;
        else if (e.status === "uncertain") uncertain++;
        else delayed++;
      }
    const symptoms = data.symptomLogs.filter((s) => s.date >= from);
    const avg = (pick: (s: (typeof symptoms)[number]) => number | null) => {
      const vals = symptoms.map(pick).filter((v): v is number => v !== null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    return {
      days,
      taken,
      missed,
      uncertain,
      delayed,
      totalEntries,
      checkins: symptoms.length,
      adherencePct: totalEntries > 0 ? Math.round((taken / totalEntries) * 100) : null,
      calmPct: avg((s) => s.mood) === null ? null : Math.round(((avg((s) => s.mood) ?? 0) / 4) * 100),
      sleepPct: avg((s) => s.sleepQuality) === null ? null : Math.round(((avg((s) => s.sleepQuality) ?? 0) / 4) * 100),
      anxietyPct: avg((s) => s.anxiety) === null ? null : Math.round(100 - ((avg((s) => s.anxiety) ?? 0) / 4) * 100),
      cravingPct: avg((s) => s.craving) === null ? null : Math.round(100 - ((avg((s) => s.craving) ?? 0) / 4) * 100),
      cleanDays: logs.filter((l) => !l.entries.some((e) => e.status === "missed")).length,
    };
  }, [data, from]);

  // plan-level info intentionally not shown in reports (status lives on dashboard/profile)
  // today's recorded dose vs prescribed (display only)
  const todayLog = data?.medicationLogs.find((l) => l.date === today);
  const todayAmount = todayLog?.entries.find((e) => e.status === "taken")?.actualAmount ?? null;
  const prescribed = data?.medicationProfile?.prescribedDailyAmount ?? null;
  const todayPct =
    todayAmount && prescribed && parsePositiveDecimal(todayAmount, { allowZero: true }).ok && parsePositiveDecimal(prescribed, { allowZero: true }).ok
      ? Math.round((Number(todayAmount) / Number(prescribed)) * 100)
      : null;

  const firstDate = data?.medicationLogs[0]?.date ?? data?.medicationProfile?.regimenStartDate ?? null;
  const daysOnTrack = firstDate ? Math.max(1, daysBetweenIso(firstDate, today) + 1) : null;
  const phasePct = firstDate ? Math.min(100, Math.round((daysOnTrack! / 90) * 100)) : null;

  if (!ready) return <PageLoading />;

  const hasDoseData = doseSeries.some((p) => p.value !== null);

  const exportCsv = () => {
    if (!data) return;
    const rows: string[][] = [["date", "type", "item", "value", "unit", "status"]];
    for (const l of data.medicationLogs)
      for (const e of l.entries)
        rows.push([l.date, "medication", `slot_${e.slotIndex}`, e.actualAmount ?? "", unit === "mL" ? "mL" : "tablet", e.status]);
    for (const s of data.symptomLogs) {
      rows.push([s.date, "symptom", "sleepQuality", s.sleepQuality === null ? "" : String(s.sleepQuality), "0-4", s.unsure.includes("sleepQuality") ? "unsure" : ""]);
      rows.push([s.date, "symptom", "craving", s.craving === null ? "" : String(s.craving), "0-4", s.unsure.includes("craving") ? "unsure" : ""]);
      rows.push([s.date, "symptom", "mood", s.mood === null ? "" : String(s.mood), "0-4", s.unsure.includes("mood") ? "unsure" : ""]);
    }
    downloadCsv(`rasa-export-${today}.csv`, rows);
  };

  const periodLabel = period === "week" ? "۷ روز اخیر" : period === "month" ? "۳۰ روز اخیر" : "کل دوره";

  return (
    <div className="flex flex-col gap-4">
      {/* ---- dark hero (approved design) ---- */}
      <section className="hero-card p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-card bg-white/15 text-white">
          <Icon name="leaf" size={20} />
        </span>
        <span className="chip mt-3 bg-white/15 text-white">تحلیل روند ثبت‌های شما</span>
        <h1 className="t-headline-md mt-2 text-white">روند درمان و مسیر آرامش</h1>
        <p className="t-body-md mt-1 text-white/80">
          همهٔ نمودارها فقط از ثبت‌های همین دستگاه ساخته می‌شوند — برای یک نگاهِ آماده
          پیش از هر ویزیت.
        </p>
        {daysOnTrack !== null ? (
          <span className="chip mt-3 bg-white/15 text-white">
            <Icon name="calendar" size={12} />
            {daysOnTrack.toLocaleString("fa-IR")} روز از اولین ثبت
          </span>
        ) : null}
      </section>

      {/* ---- period switch ---- */}
      <div className="grid grid-cols-3 rounded-pill bg-surface-container p-1">
        {(
          [
            { id: "week", l: "هفته" },
            { id: "month", l: "۳۰ روز" },
            { id: "all", l: "همه" },
          ] as const
        ).map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`rounded-pill py-2 t-label-md ${period === p.id ? "bg-surface-container-lowest text-on-surface shadow-card" : "text-on-surface-variant"}`}
          >
            {p.l}
          </button>
        ))}
      </div>

      {/* ---- rings + phase ---- */}
      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="t-title-md text-on-surface">افق زمان و پیشرفت برنامه</h2>
          <span className="chip bg-surface-container-high text-on-surface-variant">{periodLabel}</span>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Ring
            pct={stats?.adherencePct ?? null}
            inside={stats?.adherencePct !== null && stats?.adherencePct !== undefined ? `${stats.adherencePct.toLocaleString("fa-IR")}٪` : "—"}
            title="انطباق ثبت با برنامه"
            sub="سهم نوبت‌های «مصرف شد» در این بازه"
          />
          <Ring
            pct={todayPct}
            inside={todayPct !== null ? `${todayPct.toLocaleString("fa-IR")}٪` : "—"}
            title={todayAmount ? formatAmount(todayAmount, unit) : "—"}
            sub="دوز ثبت‌شدهٔ امروز نسبت به مقدار تجویزی"
          />
        </div>

        {phasePct !== null ? (
          <div className="mt-4">
            <div className="flex items-center justify-between t-label-md text-on-surface-variant">
              <span>شروع</span>
              <span>تثبیت</span>
              <span>ادامهٔ مسیر</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-pill bg-surface-container-highest">
              <div className="h-full rounded-pill bg-primary" style={{ width: `${phasePct}%` }} />
            </div>
            <p className="t-label-sm mt-1.5 text-on-surface-variant">
              پیشرفت زمانی از اولین ثبت (نمای زمانی — نه سنجش درمانی)
            </p>
          </div>
        ) : null}

        {stats && stats.totalEntries > 0 ? (
          <div className="mt-3 flex items-center gap-2 rounded-card bg-secondary-container/40 p-3">
            <Icon name="check" size={16} className="shrink-0 text-secondary" />
            <p className="t-label-lg text-on-secondary-container">
              در {stats.days.toLocaleString("fa-IR")} روز ثبت‌شدهٔ این بازه:{" "}
              <b>{(stats.adherencePct ?? 0).toLocaleString("fa-IR")}٪ پایداری ثبت</b>
            </p>
          </div>
        ) : null}
      </section>

      {/* ---- summary grid ---- */}
      {stats && stats.days > 0 ? (
        <section className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="t-title-md text-on-surface">خلاصه شاخص‌ها</h2>
            <span className="chip bg-surface-container-high text-on-surface-variant">{periodLabel}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { icon: "users" as const, tone: "bg-secondary-container text-on-secondary-container", label: "مستمر", value: stats.days.toLocaleString("fa-IR"), sub: "روز همراهی فعال در برنامه" },
              { icon: "shield" as const, tone: "bg-secondary-container text-on-secondary-container", label: "امن", value: stats.cleanDays.toLocaleString("fa-IR"), sub: "روز بدون ثبتِ نوبت ازدست‌رفته" },
              { icon: "lock" as const, tone: "bg-surface-container-high text-on-surface", label: "مطمئن", value: "۱۰۰٪", sub: "داده‌ها فقط روی همین دستگاه" },
              { icon: "leaf" as const, tone: "bg-rose-soft text-rose-ink", label: "آرام", value: stats.calmPct !== null ? `${stats.calmPct.toLocaleString("fa-IR")}٪` : "—", sub: "میانگین حال عمومی ثبت‌شده (۰–۴)" },
            ].map((s) => (
              <div key={s.label} className="rounded-card border border-surface-container-high p-3">
                <div className="flex items-center justify-between">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-card ${s.tone}`}>
                    <Icon name={s.icon} size={16} />
                  </span>
                  <span className="t-label-sm text-on-surface-variant">{s.label}</span>
                </div>
                <p className="t-headline-md mt-1.5 text-on-surface">{s.value}</p>
                <p className="t-label-sm text-on-surface-variant">{s.sub}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ---- symptom bars ---- */}
      {stats && stats.checkins > 0 ? (
        <section className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="t-title-md text-on-surface">پایش علائم و حالت جسمی</h2>
            <span className="chip bg-surface-container-high text-on-surface-variant">میانگین چک‌این‌ها</span>
          </div>
          <div className="mt-3 space-y-2">
            <MeasureBar icon="moon" title="کیفیت خواب شبانه" pct={stats.sleepPct} sub={stats.sleepPct !== null ? `${stats.sleepPct.toLocaleString("fa-IR")}٪ از مقیاس ۰–۴` : "—"} />
            <MeasureBar icon="shield" title="مدیریت اضطراب" pct={stats.anxietyPct} sub={stats.anxietyPct !== null ? `${stats.anxietyPct.toLocaleString("fa-IR")}٪ آرامش نسبی` : "—"} />
            <MeasureBar icon="zap" title="مدیریت میل به مصرف" pct={stats.cravingPct} sub={stats.cravingPct !== null ? `${stats.cravingPct.toLocaleString("fa-IR")}٪ مهار نسبی` : "—"} />
          </div>
          <p className="t-label-sm mt-2.5 text-on-surface-variant">
            این درصدها فقط میانگین همان مقیاس ۰–۴ شما هستند — ابزار تشخیص یا شدت‌سنجی
            بالینی نیستند.
          </p>
        </section>
      ) : null}

      {/* ---- dose chart ---- */}
      <Card>
        <SectionTitle icon="chart">{`نمودار ثبت مصرف (${periodLabel})`}</SectionTitle>
        {hasDoseData ? (
          <>
            <LineChart
              series={[
                { label: "ثبت‌شده", color: "#006a60", points: doseSeries },
                ...(plannedSeries.some((p) => p.value !== null)
                  ? [{ label: "برنامه", color: "#9acee1", points: plannedSeries }]
                  : []),
              ]}
              yLabel={`واحد: ${unitLabel} — خطِ «برنامه» فقط مقادیر ثبت‌شده در برنامه است`}
            />
            <p className="t-body-sm mt-2 text-on-surface-variant">
              روزهای بدون ثبت به‌عنوان «فقدان داده» نمایش داده می‌شوند (خط قطع می‌شود) و به معنی
              صفر بودن مصرف نیستند.
            </p>
          </>
        ) : (
          <p className="t-body-md text-on-surface-variant">در این بازه ثبت مصرفی موجود نیست.</p>
        )}
      </Card>

      {/* ---- mood/craving chart ---- */}
      <Card>
        <SectionTitle icon="heart">روند حال عمومی و میل به مصرف (۰–۴)</SectionTitle>
        {moodSeries.some((p) => p.value !== null) ? (
          <LineChart
            series={[
              { label: "حال عمومی", color: "#006a60", points: moodSeries },
              { label: "میل به مصرف", color: "#a84468", points: cravingSeries },
            ]}
            yLabel="مقیاس ثابت ۰–۴ — ابزار تشخیص نیست؛ فقط روند شخصی شما"
          />
        ) : (
          <p className="t-body-md text-on-surface-variant">چک‌ینی در این بازه ثبت نشده است.</p>
        )}
      </Card>

      {/* ---- export CTA (dark, like the design) ---- */}
      <section className="no-print flex items-center justify-between gap-3 rounded-card bg-primary p-4">
        <div>
          <p className="t-title-md font-semibold text-on-primary">دریافت خروجی برای ویزیت پزشک</p>
          <p className="t-label-md mt-0.5 text-on-primary/75">چاپ یا فایل CSV — فقط از داده‌های همین دستگاه</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => window.print()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-transform active:scale-95"
            aria-label="نسخه چاپی / PDF"
          >
            <Icon name="print" size={18} />
          </button>
          <button
            onClick={exportCsv}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-transform active:scale-95"
            aria-label="خروجی CSV"
          >
            <Icon name="download" size={18} />
          </button>
        </div>
      </section>
      <p className="t-label-md -mt-2 text-on-surface-variant">
        یادآوری: این خروجی صرفاً ثبت شخصی شماست و جایگزین معاینه، تشخیص یا نسخه پزشک
        نیست؛ برای گفتگوی حضوری با درمانگر طراحی شده است.
      </p>
    </div>
  );
}
