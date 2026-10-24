"use client";

/**
 * Treatment plan page — timeline, status, authorization, review dates, events.
 * Invariant: the app NEVER generates a schedule; it displays recorded plans,
 * flags overdue reviews, and requires explicit status transitions with audit.
 */

import { useState } from "react";
import { useApp } from "@/features/app-store";
import { Card, SectionTitle, Button, EmptyState, ErrorBox, ConfirmDialog, PlanStatusBadge, PageLoading } from "@/components/ui/primitives";
import { PageHeader } from "@/components/layout/page-header";
import { Icon } from "@/components/ui/icons";
import { todayIso, faDate } from "@/lib/dates";
import {
  currentPlan,
  deriveDisplayedPlan,
  getAuthorizedSchedule,
  isPlanEditable,
  PLAN_SOURCE_LABELS,
  AUTHORIZATION_LABELS,
  ALLOWED_TRANSITIONS,
  PLAN_STATUS_LABELS,
} from "@/lib/plan/status";
import { formatAmount } from "@/lib/medication-units";
import type { PlanStatus } from "@/types";

export default function PlanPage() {
  const { data, ready, actions } = useApp();
  const today = todayIso();
  const [error, setError] = useState<string | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<PlanStatus | null>(null);
  const [viewHistory, setViewHistory] = useState(false);

  if (!ready) return <PageLoading />;

  const plan = data ? currentPlan(data.treatmentPlans) : null;
  const displayed = plan ? deriveDisplayedPlan(plan, today) : null;

  if (!plan || !displayed) {
    return (
      <>
        <PageHeader title="مشخصات برنامه درمان" subtitle="وضعیت فعلی: ثبت نشده" />
        <EmptyState
          icon="plan"
          title="برنامه‌ای ثبت نشده است"
          body="این اپ بدون برنامه‌ی ثبت‌شده و تأییدشده‌ی درمانگر، هیچ برنامه‌ای نمایش نمی‌دهد یا نمی‌سازد. می‌توانید اطلاعات اولیه را در تنظیم اولیه ثبت کنید."
          action={
            <Button variant="secondary" onClick={() => (window.location.href = "/onboarding")}>
              ثبت اطلاعات برنامه
            </Button>
          }
        />
        {error ? <ErrorBox message={error} /> : null}
      </>
    );
  }

  const schedule = getAuthorizedSchedule(plan);
  const editable = isPlanEditable(plan);
  const events = (data?.planEvents ?? []).filter((e) => e.planId === plan.id);
  const olderPlans = (data?.treatmentPlans ?? []).filter((p) => p.id !== plan.id);

  const doTransition = async (to: PlanStatus) => {
    setConfirmStatus(null);
    const res = await actions.transitionPlan(plan.id, to, `تغییر وضعیت به «${PLAN_STATUS_LABELS[to]}» توسط کاربر`);
    if (!res.ok) setError(res.error);
    else setError(null);
  };

  return (
    <>
      <PageHeader title="مشخصات برنامه درمان" subtitle={plan.isDemo ? "داده نمایشی" : "تنظیم امن و اختصاصی"} />

      {/* hero status card */}
      <div className={`hero-card p-5 ${displayed.flags.reviewOverdue ? "ring-2 ring-tertiary-fixed-dim" : ""}`}>
        <div className="mb-2 flex items-center justify-between">
          <PlanStatusBadge status={displayed.status} />
          <span className="t-label-sm text-white/70">نسخه {plan.version.toLocaleString("fa-IR")}</span>
        </div>
        <h2 className="t-headline-sm text-white">{plan.title}</h2>
        <div className="t-body-md mt-2 space-y-1 text-white/85">
          <p>منبع: {PLAN_SOURCE_LABELS[plan.source]}</p>
          <p>تاریخ اجرا: {faDate(plan.effectiveDate)}</p>
          <p>
            مرور بعدی: {faDate(plan.nextReviewDate)}
            {displayed.reviewInDays !== null
              ? displayed.reviewInDays >= 0
                ? ` — ${displayed.reviewInDays.toLocaleString("fa-IR")} روز دیگر`
                : ` — ${Math.abs(displayed.reviewInDays).toLocaleString("fa-IR")} روز گذشته`
              : ""}
          </p>
        </div>

        {/* authorization confirmation row (approved design: green check row) */}
        {plan.authorization === "authorized" ? (
          <div className="mt-3 flex items-center gap-2.5 rounded-card bg-secondary-container/90 p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-on-secondary-container/15 text-on-secondary-container">
              <Icon name="check" size={15} />
            </span>
            <p className="t-label-lg text-on-secondary-container">
              این برنامه مورد تأیید درمانگر من است — تأییدکننده ثبت‌شده:{" "}
              <b>{plan.authorizedBy ?? "—"}</b>
              {plan.authorization === "authorized" && plan.authorizedAt
                ? ` (${faDate(plan.authorizedAt.slice(0, 10))})`
                : ""}
            </p>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2.5 rounded-card bg-white/10 p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
              <Icon name="alert" size={15} />
            </span>
            <p className="t-label-lg text-white">{AUTHORIZATION_LABELS[plan.authorization]}</p>
          </div>
        )}
        {displayed.flags.reviewOverdue ? (
          <p className="t-body-md mt-3 rounded-lg bg-white/10 p-2 text-white">
            تاریخ مرور گذشته است. برنامه به‌طور خودکار جلو برده نمی‌شود؛ برای ادامه یا تغییر،
            با درمانگر خود مرور کنید و سپس وضعیت را همین‌جا به‌روزرسانی کنید.
          </p>
        ) : null}
        {displayed.flags.unauthorized ? (
          <p className="t-body-md mt-3 rounded-lg bg-white/10 p-2 text-white">
            این برنامه هنوز تأیید درمانگر ثبت نشده و فقط به‌عنوان پیش‌نویس شخصی نمایش داده می‌شود.
          </p>
        ) : null}
      </div>

      {/* milestones / recorded schedule */}
      <Card className="mt-4">
        <SectionTitle icon="plan">نقاط عطف ثبت‌شده</SectionTitle>
        {schedule.ok ? (
          schedule.milestones.length === 0 ? (
            <p className="t-body-md text-on-surface-variant">
              نقطه عطفی ثبت نشده است. می‌توانید بعداً از همین صفحه نقاط را اضافه کنید (فقط
              آنچه درمانگر تعیین کرده).
            </p>
          ) : (
            <ol className="relative flex flex-col gap-3 pr-5">
              <span className="absolute right-1.5 top-2 bottom-2 w-px bg-outline-variant" aria-hidden="true" />
              {schedule.milestones.map((m) => {
                const past = m.date <= today;
                return (
                  <li key={m.id} className="relative">
                    <span
                      className={`absolute -right-[1.14rem] top-2 h-3 w-3 rounded-full border-2 ${
                        past ? "border-secondary bg-secondary" : "border-outline-variant bg-surface-container-lowest"
                      }`}
                      aria-hidden="true"
                    />
                    <p className="t-label-lg text-on-surface">{m.title}</p>
                    <p className="t-body-sm text-on-surface-variant">
                      {faDate(m.date)}
                      {m.amount !== null && m.unit ? ` — ${formatAmount(m.amount, m.unit)}` : ""}
                    </p>
                    {m.description ? (
                      <p className="t-body-sm mt-0.5 text-on-surface-variant">{m.description}</p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )
        ) : (
          <p className="t-body-md text-tertiary">
            نمایش نقاط فقط برای برنامه‌های تأییدشده و فعال ممکن است.
          </p>
        )}
      </Card>

      {/* status transitions */}
      <Card className="mt-4">
        <SectionTitle icon="gear">تغییر وضعیت برنامه</SectionTitle>
        {!editable ? (
          <p className="t-body-md mb-3 text-on-surface-variant">
            برنامه در وضعیت «{PLAN_STATUS_LABELS[plan.status]}» قابل تغییر نیست.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {ALLOWED_TRANSITIONS[plan.status]
            .filter(() => editable)
            .map((s) => (
              <Button
                key={s}
                size="sm"
                variant={s === "active" ? "primary" : s === "superseded" ? "danger" : "outline"}
                onClick={() => setConfirmStatus(s)}
              >
                {PLAN_STATUS_LABELS[s]}
              </Button>
            ))}
        </div>
        <p className="t-body-sm mt-3 text-on-surface-variant">
          گذر زمان به‌خودی‌خود وضعیت را تغییر نمی‌دهد؛ هر تغییر با ثبت در تاریخچه همراه است.
        </p>
      </Card>

      {/* history */}
      <Card className="mt-4">
        <SectionTitle
          icon="note"
          action={
            <button onClick={() => setViewHistory((v) => !v)} className="t-label-md text-secondary">
              {viewHistory ? "بستن" : "نمایش"}
            </button>
          }
        >
          تاریخچه برنامه ({events.length.toLocaleString("fa-IR")} رویداد)
        </SectionTitle>
        {viewHistory ? (
          <ul className="flex flex-col gap-2">
            {events.map((e) => (
              <li key={e.id} className="rounded-lg bg-surface-container-low p-2.5">
                <p className="t-label-md text-on-surface">
                  {e.type === "authorized"
                    ? "تأیید"
                    : e.type === "status-changed"
                      ? "تغییر وضعیت"
                      : e.type === "created"
                        ? "ایجاد"
                        : e.type === "updated"
                          ? "به‌روزرسانی"
                          : e.type === "review-recorded"
                            ? "ثبت مرور"
                            : "جایگزینی"}{" "}
                  — {faDate(e.at.slice(0, 10))}
                </p>
                <p className="t-body-sm text-on-surface-variant">{e.summary}</p>
              </li>
            ))}
            {events.length === 0 ? (
              <li className="t-body-md text-on-surface-variant">رویدادی ثبت نشده است.</li>
            ) : null}
          </ul>
        ) : null}
      </Card>

      {/* older plans */}
      {olderPlans.length > 0 ? (
        <Card className="mt-4">
          <SectionTitle icon="plan">برنامه‌های قبلی</SectionTitle>
          <div className="flex flex-col gap-2">
            {olderPlans.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-surface-container-low p-3">
                <p className="t-label-md text-on-surface">{p.title}</p>
                <PlanStatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {error ? <ErrorBox message={error} onClose={() => setError(null)} /> : null}

      <ConfirmDialog
        open={confirmStatus !== null}
        title={confirmStatus ? `تغییر وضعیت به «${PLAN_STATUS_LABELS[confirmStatus]}»` : ""}
        body="این تغییر در تاریخچه برنامه ثبت می‌شود. اگر مطمئن نیستید، اول با درمانگر خود مشورت کنید."
        confirmLabel="تغییر وضعیت"
        danger={confirmStatus === "superseded"}
        onConfirm={() => confirmStatus && doTransition(confirmStatus)}
        onCancel={() => setConfirmStatus(null)}
      />
    </>
  );
}
