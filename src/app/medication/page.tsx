"use client";

/**
 * Medication recording (approved screen 02).
 * - Big stepper for the recording unit (mL or tablet count) — LTR numerals.
 * - Conversion tab: informational mg equivalent from LABELED values only.
 * - Per-slot status; missed/uncertain produce neutral guidance, never catch-up advice.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/features/app-store";
import { Card, SectionTitle, Button, EmptyState, ErrorBox, PageLoading } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";
import { SafetyNotice } from "@/components/ui/safety-notice";
import { PageHeader } from "@/components/layout/page-header";
import { todayIso, faDate, faTime } from "@/lib/dates";
import {
  convertVolumeToMg,
  convertTabletsToMg,
  formatAmount,
  formatMg,
  parsePositiveDecimal,
} from "@/lib/medication-units";
import { evaluateDaySignals } from "@/lib/safety";
import { uid } from "@/lib/store/demo-data";
import type { DailyMedicationLog, DoseStatus, RecordingUnit } from "@/types";

const STATUS_OPTIONS: { value: DoseStatus; label: string; tone: string }[] = [
  { value: "taken", label: "مصرف شد", tone: "bg-secondary-container text-on-secondary-container" },
  { value: "delayed", label: "با تأخیر", tone: "bg-tertiary-fixed text-tertiary" },
  { value: "missed", label: "ثبت نشد", tone: "bg-error-container text-on-error-container" },
  { value: "uncertain", label: "مطمئن نیستم", tone: "bg-surface-container-high text-on-surface" },
];

export default function MedicationPage() {
  const { data, ready, actions } = useApp();
  const today = todayIso();
  const [amount, setAmount] = useState<string>("");
  const [tab, setTab] = useState<"unit" | "mg">("unit");
  const [statuses, setStatuses] = useState<Record<number, DoseStatus>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const profile = data?.medicationProfile ?? null;
  const unit: RecordingUnit = profile?.formulation === "tablet" ? "tablet" : "mL";
  const unitLabel = unit === "mL" ? "میلی‌لیتر" : "قرص";
  const stepSize = "0.5";

  const existing = data?.medicationLogs.find((l) => l.date === today) ?? null;

  const planned = profile?.prescribedDailyAmount ?? null;
  const plannedValid = planned !== null && parsePositiveDecimal(planned, { allowZero: true }).ok;

  const conversion = useMemo(() => {
    if (!profile) return null;
    if (unit === "mL") {
      if (!profile.concentrationMgPerMl) return null;
      const v = amount.trim() === "" ? planned : amount;
      if (v === null) return null;
      return convertVolumeToMg(profile.concentrationMgPerMl, v);
    }
    if (!profile.tabletStrengthMg) return null;
    const v = amount.trim() === "" ? planned : amount;
    if (v === null) return null;
    return convertTabletsToMg(profile.tabletStrengthMg, v);
  }, [profile, unit, amount, planned]);

  if (!ready) return <PageLoading />;

  if (!profile) {
    return (
      <>
        <PageHeader title="ثبت دارو" subtitle="پروفایل دارو ساخته نشده است" />
        <EmptyState
          icon="pill"
          title="ابتدا پروفایل دارو را بسازید"
          body="شکل دارو (قرص/شربت) و مقدار طبق بسته را ثبت کنید تا تبدیل واحدها و ثبت روزانه دقیق باشد."
          action={
            <Link href="/onboarding">
              <Button>تنظیم پروفایل دارو</Button>
            </Link>
          }
        />
      </>
    );
  }

  const currentAmount = amount.trim() === "" ? (plannedValid ? planned! : "") : amount;
  const slots = profile.administrationTimes;

  const bump = (dir: 1 | -1) => {
    const base = parsePositiveDecimal(currentAmount || "0", { allowZero: true });
    const next = base.ok ? Math.max(0, base.value + dir * Number(stepSize)) : Number(stepSize);
    setAmount(String(Math.round(next * 100) / 100));
  };

  const save = async () => {
    setError(null);
    setSaved(false);
    const entries = slots.map((t, i) => {
      const prev = existing?.entries.find((e) => e.slotIndex === i);
      const status = statuses[i] ?? prev?.status ?? "taken";
      return {
        id: prev?.id ?? uid(),
        slotIndex: i,
        plannedTime: t,
        plannedAmount: plannedValid ? planned : null,
        status,
        actualTime: status === "taken" ? (prev?.actualTime ?? new Date().toTimeString().slice(0, 5)) : null,
        actualAmount: status === "missed" ? null : currentAmount === "" ? null : currentAmount,
        note: prev?.note ?? null,
        updatedAt: new Date().toISOString(),
      };
    });
    const day: DailyMedicationLog = {
      date: today,
      entries,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const res = await actions.upsertMedicationLog(day);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSaved(true);
  };

  const daySignals = evaluateDaySignals(existing);

  return (
    <>
      <PageHeader title="ثبت دقیق مصرف" subtitle={`${profile.productName} — ${faDate(today, { withWeekday: true })}`} />

      {plannedValid ? (
        <div className="mb-4 flex items-center gap-2 rounded-card bg-surface-container-low px-4 py-3">
          <Icon name="shield" size={18} className="text-secondary" />
          <p className="t-body-md text-on-surface-variant">
            دوز تجویزی ثبت‌شده: <b className="text-on-surface">{formatAmount(planned, unit)}</b> در روز
            <span className="t-label-sm block">
              منبع: {profile.infoSource === "clinician-approved" ? "دستور درمانگر (ثبت کاربر)" : "اطلاعات شخصی شما"}
            </span>
          </p>
        </div>
      ) : (
        <div className="mb-4 rounded-card border border-tertiary-fixed bg-tertiary-fixed/30 px-4 py-3">
          <p className="t-body-md text-tertiary">
            مقدار تجویزی هنوز ثبت نشده — می‌توانید مصرف را ثبت کنید، اما برای مقایسه با برنامه،
            آن را در <Link href="/settings" className="underline">تنظیمات پروفایل</Link> کامل کنید.
          </p>
        </div>
      )}

      <Card className="mb-4">
        {/* stepper */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => bump(-1)}
            aria-label="کاهش"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
          >
            <Icon name="minus" size={22} />
          </button>
          <div className="text-center">
            <p className="t-headline-lg text-on-surface">
              <span className="ltr-inline">
                {currentAmount === "" ? "۰" : parsePositiveDecimal(currentAmount, { allowZero: true }).ok ? currentAmount : "—"}
              </span>
            </p>
            <p className="t-label-lg text-on-surface-variant">{unitLabel}</p>
          </div>
          <button
            onClick={() => bump(1)}
            aria-label="افزایش"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-on-secondary hover:brightness-110"
          >
            <Icon name="plus" size={22} />
          </button>
        </div>

        {/* tabs */}
        <div className="mt-4 grid grid-cols-2 rounded-pill bg-surface-container p-1">
          {(
            [
              { id: "unit", label: `مقدار به ${unitLabel}` },
              { id: "mg", label: "تبدیل به میلی‌گرم" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-pill py-2 t-label-md transition-colors ${
                tab === t.id ? "bg-surface-container-lowest text-on-surface shadow-card" : "text-on-surface-variant"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "mg" ? (
          <div className="mt-3 rounded-card bg-surface-container-low p-3">
            {conversion === null ? (
              <p className="t-body-md text-tertiary">
                برای تبدیل، غلظت/قدرت طبق بسته لازم است — از روی بسته در{" "}
                <Link href="/settings" className="underline">تنظیمات</Link> ثبتش کنید. اپ غلظت را از نام محصول حدس نمی‌زند.
              </p>
            ) : conversion.ok ? (
              <>
                <p className="t-label-lg text-on-surface">
                  معادل اطلاعاتی: {formatMg(conversion.value.totalMg)}
                </p>
                <p className="t-body-sm mt-1 text-on-surface-variant">
                  محاسبه از مقدار ثبت‌شده × مقدار بسته. این عدد فقط اطلاعات است، نه توصیه دوز.
                </p>
              </>
            ) : (
              <p className="t-body-md text-on-error-container">{conversion.message}</p>
            )}
          </div>
        ) : null}
      </Card>

      {/* per-slot statuses */}
      <Card className="mb-4">
        <SectionTitle icon="clock">نوبت‌های امروز</SectionTitle>
        <div className="flex flex-col gap-2">
          {slots.map((t, i) => {
            const active = (statuses[i] ?? existing?.entries.find((e) => e.slotIndex === i)?.status ?? "taken") as DoseStatus;
            return (
              <div key={i} className="rounded-card border border-surface-container-high p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="t-label-lg text-on-surface">
                    نوبت {(i + 1).toLocaleString("fa-IR")} — ساعت {faTime(t)}
                  </p>
                  <span className={`chip ${STATUS_OPTIONS.find((s) => s.value === active)?.tone}`}>
                    {STATUS_OPTIONS.find((s) => s.value === active)?.label}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setStatuses((prev) => ({ ...prev, [i]: s.value }))}
                      className={`rounded-pill border px-1 py-1.5 t-label-sm transition-colors ${
                        active === s.value
                          ? s.tone + " border-transparent"
                          : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* live safety preview for the selected statuses */}
      {(Object.values(statuses).includes("missed") || Object.values(statuses).includes("uncertain")) ? (
        <div className="mb-4 flex flex-col gap-2">
          {Object.values(statuses).includes("missed") ? (
            <SafetyNotice
              flag={{
                id: "preview-missed",
                severity: "caution",
                title: "یک نوبت «ثبت نشد»",
                body: "دوز بعدی را دوبرابر نکنید. درباره جبران دوز، فقط با پزشک یا داروساز خود مشورت کنید.",
                disclaimerRequired: true,
              }}
            />
          ) : null}
          {Object.values(statuses).includes("uncertain") ? (
            <SafetyNotice
              flag={{
                id: "preview-uncertain",
                severity: "caution",
                title: "یک نوبت «نامطمئن» است",
                body: "تا روشن شدن موضوع چیزی اضافه مصرف نکنید و در نخستین فرصت با درمانگر یا داروساز خود صحبت کنید.",
                disclaimerRequired: true,
              }}
            />
          ) : null}
        </div>
      ) : null}

      {error ? <ErrorBox message={error} onClose={() => setError(null)} /> : null}
      {saved ? (
        <div className="mb-4 rounded-card bg-secondary-container/50 px-4 py-3 t-body-md text-on-secondary-container">
          ثبت امروز ذخیره شد ✓ — به‌صورت محلی روی همین دستگاه.
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Button full size="lg" onClick={save}>
          ذخیره ثبت امروز
        </Button>
        <p className="t-body-sm text-center text-on-surface-variant">
          تنظیم یادآوری نوبت بعدی در <Link href="/settings" className="underline">تنظیمات</Link> انجام می‌شود.
        </p>
      </div>

      {/* after-save signals */}
      {daySignals.length > 0 ? (
        <div className="mt-6 flex flex-col gap-2">
          <SectionTitle icon="shield">نکات ایمنی امروز</SectionTitle>
          {daySignals.map((f) => (
            <SafetyNotice key={f.id} flag={f} />
          ))}
        </div>
      ) : null}

      {/* recent history */}
      <div className="mt-6">
        <SectionTitle icon="note">روزهای اخیر</SectionTitle>
        <div className="flex flex-col gap-2">
          {(data?.medicationLogs ?? [])
            .slice(-7)
            .reverse()
            .map((log) => (
              <Card key={log.date} className="!p-3">
                <div className="flex items-center justify-between">
                  <p className="t-label-lg text-on-surface">{faDate(log.date, { withWeekday: true })}</p>
                  <div className="flex gap-1">
                    {log.entries.map((e) => (
                      <span
                        key={e.id}
                        title={e.status}
                        className={`chip !px-2 !py-0.5 ${
                          e.status === "taken"
                            ? "bg-secondary-container text-on-secondary-container"
                            : e.status === "missed"
                              ? "bg-error-container text-on-error-container"
                              : e.status === "delayed"
                                ? "bg-tertiary-fixed text-tertiary"
                                : "bg-surface-container-high text-on-surface"
                        }`}
                      >
                        {STATUS_OPTIONS.find((s) => s.value === e.status)?.label}
                      </span>
                    ))}
                  </div>
                </div>
                {log.entries[0] ? (
                  <p className="t-body-sm mt-1 text-on-surface-variant">
                    ثبت‌شده: {formatAmount(log.entries[0].actualAmount, unit)}
                    {log.entries[0].plannedAmount ? ` — برنامه: ${formatAmount(log.entries[0].plannedAmount, unit)}` : ""}
                  </p>
                ) : null}
              </Card>
            ))}
          {(data?.medicationLogs.length ?? 0) === 0 ? (
            <p className="t-body-md text-on-surface-variant">هنوز روزی ثبت نشده است.</p>
          ) : null}
        </div>
      </div>
    </>
  );
}
