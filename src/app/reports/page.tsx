"use client";

/**
 * Reports & trends (approved screen 03). Every measure is explicitly defined;
 * missing days create chart gaps; prescribed-vs-actual only when units match.
 */

import { useMemo, useState } from "react";
import { useApp } from "@/features/app-store";
import { Card, SectionTitle, Button, PageLoading } from "@/components/ui/primitives";
import { PageHeader } from "@/components/layout/page-header";
import { LineChart, type SeriesPoint } from "@/components/charts/line-chart";
import { todayIso, addDaysIso } from "@/lib/dates";
import { parsePositiveDecimal } from "@/lib/medication-units";
import { currentPlan, PLAN_STATUS_LABELS } from "@/lib/plan/status";
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

export default function ReportsPage() {
  const { data, ready } = useApp();
  const [period, setPeriod] = useState<Period>("month");

  const unit = data?.medicationProfile?.formulation === "tablet" ? "tablet" : "mL";
  const unitLabel = unit === "mL" ? "میلی‌لیتر" : "قرص";

  const from = period === "week" ? addDaysIso(todayIso(), -6) : period === "month" ? addDaysIso(todayIso(), -29) : "0000-01-01";

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

  const sleepSeries: SeriesPoint[] = useMemo(() => {
    if (!data) return [];
    return data.symptomLogs.filter((s) => s.date >= from).map((s) => ({ date: s.date, value: s.sleepQuality }));
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
    const checkins = data.symptomLogs.filter((s) => s.date >= from).length;
    return { days, taken, missed, uncertain, delayed, totalEntries, checkins };
  }, [data, from]);

  if (!ready) return <PageLoading />;

  const hasDoseData = doseSeries.some((p) => p.value !== null);

  const exportCsv = () => {
    if (!data) return;
    const rows: string[][] = [["date", "type", "item", "value", "unit", "status"]];
    for (const l of data.medicationLogs)
      for (const e of l.entries)
        rows.push([
          l.date,
          "medication",
          `slot_${e.slotIndex}`,
          e.actualAmount ?? "",
          unit === "mL" ? "mL" : "tablet",
          e.status,
        ]);
    for (const s of data.symptomLogs) {
      rows.push([s.date, "symptom", "sleepQuality", s.sleepQuality === null ? "" : String(s.sleepQuality), "0-4", s.unsure.includes("sleepQuality") ? "unsure" : ""]);
      rows.push([s.date, "symptom", "craving", s.craving === null ? "" : String(s.craving), "0-4", s.unsure.includes("craving") ? "unsure" : ""]);
      rows.push([s.date, "symptom", "mood", s.mood === null ? "" : String(s.mood), "0-4", s.unsure.includes("mood") ? "unsure" : ""]);
    }
    downloadCsv(`rasa-export-${todayIso()}.csv`, rows);
  };

  const plan = data ? currentPlan(data.treatmentPlans) : null;

  return (
    <>
      <PageHeader title="گزارش و روند درمان" subtitle="فقط از ثبت‌های خود شما ساخته می‌شود" />

      <div className="hero-card mb-4 p-5">
        <h2 className="t-headline-sm text-white">
          {stats && stats.taken > 0
            ? "روند ثبت‌های شما در جریان است"
            : "هنوز داده‌ای برای روند نداریم"}
        </h2>
        <p className="t-body-md mt-1 text-white/80">
          {plan
            ? `برنامه فعال: ${plan.title} — وضعیت: ${PLAN_STATUS_LABELS[plan.status]}`
            : "برنامه فعالی ثبت نشده است."}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-3 rounded-pill bg-surface-container p-1">
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

      {stats ? (
        <div className="mb-4 grid grid-cols-2 gap-3">
          {[
            { label: "روزهای دارای ثبت", value: stats.days.toLocaleString("fa-IR") },
            { label: "نوبت‌های مصرف‌شده", value: stats.taken.toLocaleString("fa-IR") },
            { label: "ثبت‌نشده", value: stats.missed.toLocaleString("fa-IR") },
            { label: "نامطمئن", value: stats.uncertain.toLocaleString("fa-IR") },
            { label: "چک‌این‌ها", value: stats.checkins.toLocaleString("fa-IR") },
            { label: "با تأخیر", value: stats.delayed.toLocaleString("fa-IR") },
          ].map((s) => (
            <Card key={s.label} className="!p-3 text-center">
              <p className="t-headline-md text-on-surface">{s.value}</p>
              <p className="t-label-sm text-on-surface-variant">{s.label}</p>
            </Card>
          ))}
        </div>
      ) : null}

      <Card className="mb-4">
        <SectionTitle icon="chart">مقدار ثبت‌شده ({unitLabel})</SectionTitle>
        {hasDoseData ? (
          <>
            <LineChart
              series={[
                { label: "ثبت‌شده", color: "#006a60", points: doseSeries },
                ...(plannedSeries.some((p) => p.value !== null)
                  ? [{ label: "برنامه", color: "#9acee1", points: plannedSeries }]
                  : []),
              ]}
              yLabel={`واحد: ${unit === "mL" ? "میلی‌لیتر (mL)" : "قرص"} — خطِ «برنامه» فقط مقادیر ثبت‌شده در برنامه است`}
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

      <Card className="mb-4">
        <SectionTitle icon="heart">حال عمومی و میل به مصرف (۰–۴)</SectionTitle>
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

      <Card className="mb-4">
        <SectionTitle icon="clock">خواب (۰–۴)</SectionTitle>
        {sleepSeries.some((p) => p.value !== null) ? (
          <LineChart series={[{ label: "خواب", color: "#306576", points: sleepSeries }]} />
        ) : (
          <p className="t-body-md text-on-surface-variant">داده خوابی ثبت نشده است.</p>
        )}
      </Card>

      <Card className="mb-4 no-print">
        <SectionTitle icon="download">خروجی و چاپ</SectionTitle>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Icon name="download" size={16} />
            خروجی CSV (یونی‌کد)
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Icon name="print" size={16} />
            نسخه چاپی / PDF
          </Button>
        </div>
        <p className="t-body-sm mt-2 text-on-surface-variant">
          خروجی فقط از داده‌های همین دستگاه ساخته می‌شود؛ قبل از اشتراک‌گذاری، محرمانگی را
          در نظر بگیرید.
        </p>
      </Card>
    </>
  );
}
