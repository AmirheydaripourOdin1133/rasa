"use client";

/**
 * Dashboard — home screen following the approved design (screen 01):
 * light greeting + stage chip, date/day-count row, morning-dose card with a
 * full-width dark CTA, weekly adherence strip, mood grid, and support card.
 * All numbers come from recorded data — nothing here is medical advice.
 */

import { useApp } from "@/features/app-store";
import { EmptyState, Button, PageLoading, SectionCard } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";
import Link from "next/link";
import { todayIso, faDate, faTime, addDaysIso, daysBetweenIso } from "@/lib/dates";
import { currentPlan, deriveDisplayedPlan, PLAN_STATUS_LABELS } from "@/lib/plan/status";
import { formatAmount } from "@/lib/medication-units";

/* ------------------------------ small pieces ------------------------------ */

/** Plan stage chip shown beside the greeting (display only). */
function PlanStageChip({ today }: { today: string }) {
  const { data } = useApp();
  const plan = data ? currentPlan(data.treatmentPlans) : null;
  const displayed = plan ? deriveDisplayedPlan(plan, today) : null;

  if (!plan || !displayed) {
    return (
      <span className="chip border border-outline bg-surface text-on-surface-variant">
        بدون برنامه ثبت‌شده
      </span>
    );
  }
  if (displayed.flags.reviewOverdue || displayed.status === "review-required") {
    return (
      <span className="chip bg-tertiary-fixed text-tertiary">
        <Icon name="alert" size={12} />
        نیازمند مرور برنامه
      </span>
    );
  }
  if (plan.authorization !== "authorized") {
    return <span className="chip bg-surface-container-high text-on-surface-variant">برنامه در انتظار تأیید</span>;
  }
  if (plan.status === "active") {
    return (
      <span className="chip bg-secondary-container text-on-secondary-container">
        <Icon name="check" size={12} />
        برنامه فعال و تأییدشده
      </span>
    );
  }
  return <span className="chip bg-surface-container-high text-on-surface">{PLAN_STATUS_LABELS[plan.status]}</span>;
}

function Greeting({
  name,
  isDemo,
  today,
  regimenStart,
}: {
  name: string | null;
  isDemo: boolean;
  today: string;
  regimenStart: string | null;
}) {
  const hour = new Date().getHours();
  const part = hour < 12 ? "صبح" : hour < 15 ? "روز" : hour < 19 ? "عصر" : "شب";
  const dayCount = regimenStart
    ? Math.max(1, daysBetweenIso(regimenStart, today) + 1)
    : null;

  return (
    <div>
      <h1 className="t-headline-md text-on-surface">
        {part} بخیر{name ? `، ${name} عزیز` : ""} 🌿
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <PlanStageChip today={today} />
        {isDemo ? <span className="chip bg-rose-soft text-rose-ink">داده نمایشی</span> : null}
      </div>
      <p className="t-label-md mt-2.5 flex items-center gap-1.5 text-on-surface-variant">
        <Icon name="calendar" size={15} />
        {faDate(today, { withWeekday: true })}
        {dayCount !== null ? (
          <span className="font-medium text-on-surface">
            • روز {dayCount.toLocaleString("fa-IR")} از درمان پیوسته
          </span>
        ) : null}
      </p>
    </div>
  );
}

/* ------------------------------- dose card -------------------------------- */

function slotWordFor(hhmm: string | null): string {
  const h = hhmm ? Number(hhmm.slice(0, 2)) : 8;
  if (h < 12) return "وعدهٔ صبحگاهی";
  if (h < 17) return "وعدهٔ میان‌روز";
  return "وعدهٔ شبگاهی";
}

function DoseCard({ today }: { today: string }) {
  const { data } = useApp();
  const profile = data?.medicationProfile ?? null;
  const log = data?.medicationLogs.find((l) => l.date === today);
  const unit = profile?.formulation === "tablet" ? "tablet" : "mL";

  if (!profile) {
    return (
      <SectionCard icon="pill" iconTone="bg-secondary-container text-on-secondary-container" title="ثبت داروی امروز">
        <EmptyState
          icon="pill"
          title="پروفایل دارو ساخته نشده"
          body="برای ثبت دقیق مصرف، ابتدا شکل دارو و مقدار تجویزی روی بسته را ثبت کنید."
          action={
            <Link href="/onboarding">
              <Button size="sm" variant="secondary">
                ساخت پروفایل دارو
              </Button>
            </Link>
          }
        />
      </SectionCard>
    );
  }

  const entries = log?.entries ?? [];
  const plannedAmount = profile.prescribedDailyAmount ?? entries[0]?.plannedAmount ?? null;
  const plannedTime = profile.administrationTimes[0] ?? entries[0]?.plannedTime ?? null;

  const recorded = entries.length;
  const takenCount = entries.filter((e) => e.status === "taken").length;
  const total = profile.administrationsPerDay;

  const statusChip =
    recorded === 0 ? (
      <span className="chip bg-tertiary-fixed text-tertiary">امروز: در انتظار ثبت</span>
    ) : takenCount === total ? (
      <span className="chip bg-secondary-container text-on-secondary-container">
        <Icon name="check" size={12} />
        همهٔ نوبت‌ها ثبت شد
      </span>
    ) : (
      <span className="chip bg-surface-container-high text-on-surface">
        {recorded.toLocaleString("fa-IR")} از {total.toLocaleString("fa-IR")} نوبت ثبت شد
      </span>
    );

  return (
    <SectionCard
      icon="droplet"
      iconTone="bg-secondary-container text-on-secondary-container"
      title={slotWordFor(plannedTime)}
      subtitle={`${profile.productName} (${unit === "mL" ? "شربت" : "قرص"})`}
      trailing={statusChip}
    >
      <div className="mt-3 rounded-card bg-surface-container-low p-4">
        <div className="flex items-end justify-between gap-3">
          <p className="t-headline-md text-primary">{formatAmount(plannedAmount, unit)}</p>
          <p className="t-label-md text-on-surface-variant">دوز برنامه‌ریزی‌شده امروز:</p>
        </div>
        {plannedTime ? (
          <p className="t-label-md mt-2 flex items-center gap-1.5 text-on-surface-variant">
            <Icon name="clock" size={14} />
            ساعت معمول: {faTime(plannedTime)}
          </p>
        ) : null}
      </div>

      <Link
        href="/medication"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-pill bg-primary py-3.5 text-on-primary transition-transform active:scale-[0.98]"
      >
        <Icon name="check" size={19} />
        <span className="t-title-md font-semibold">
          {takenCount === total ? "مشاهده یا ویرایش ثبت امروز" : "ثبت مصرف دوز امروز"}
        </span>
      </Link>

      <div className="mt-3 flex items-center justify-between border-t border-outline-variant/40 pt-3">
        <Link href="/medication" className="t-label-md flex items-center gap-1.5 text-secondary">
          <Icon name="sliders" size={15} />
          ثبت تغییر یا تأخیر در وعده
        </Link>
        <span className="t-label-md flex items-center gap-1 text-on-surface-variant">
          <Icon name="lock" size={13} />
          کاملاً محرمانه
        </span>
      </div>
    </SectionCard>
  );
}

/* --------------------------- weekly adherence ----------------------------- */

const WEEKDAY_LETTERS = ["ی", "د", "س", "چ", "پ", "ج", "ش"] as const; // by getDay(): 0=Sun … 6=Sat

type DayState = "taken" | "partial" | "missed" | "uncertain" | "pending" | "future";

function WeekCard({ today }: { today: string }) {
  const { data } = useApp();
  const days = Array.from({ length: 7 }, (_, i) => addDaysIso(today, i - 6)); // 6 days ago … today

  const states = days.map((d) => {
    const log = data?.medicationLogs.find((l) => l.date === d);
    if (!log || log.entries.length === 0) {
      return { date: d, state: (d === today ? "pending" : "pending") as DayState };
    }
    const st = log.entries.map((e) => e.status);
    if (st.includes("uncertain")) return { date: d, state: "uncertain" as DayState };
    if (st.includes("missed")) return { date: d, state: "missed" as DayState };
    if (st.every((s) => s === "taken")) return { date: d, state: "taken" as DayState };
    return { date: d, state: "partial" as DayState };
  });

  const perPlan = states.filter((s) => s.state === "taken").length;
  const banner =
    perPlan >= 6
      ? "تداوم شما پایدار است؛ ثبت منظم، دید دقیق‌تری به شما و درمانگرتان می‌دهد."
      : perPlan >= 4
        ? "مسیر خوبی در پیش دارید؛ ادامهٔ ثبت روزانه به پایداری کمک می‌کند."
        : "هر ثبت — حتی ناقص — ارزشمند است. از امروز ادامه دهید؛ بدون قضاوت.";

  return (
    <SectionCard
      icon="check"
      iconTone="bg-secondary-container text-on-secondary-container"
      title="پایبندی این هفته"
      trailing={
        <span className="chip bg-secondary-container text-on-secondary-container">
          {perPlan.toLocaleString("fa-IR")} از ۷ روز طبق برنامه
        </span>
      }
    >
      <div className="mt-4 flex items-start justify-between gap-1">
        {states.map(({ date, state }) => {
          const dt = new Date(`${date}T00:00:00`);
          const letter = WEEKDAY_LETTERS[dt.getDay()];
          const dayNum = new Intl.DateTimeFormat("fa-IR", { day: "numeric" }).format(dt);
          const isToday = date === today;
          return (
            <div key={date} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="t-label-md text-on-surface-variant">{letter}</span>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  state === "taken"
                    ? "bg-primary text-on-primary"
                    : state === "partial"
                      ? "bg-secondary-container text-on-secondary-container"
                      : state === "missed"
                        ? "border-2 border-error text-on-error-container"
                        : state === "uncertain"
                          ? "border-2 border-dashed border-outline text-on-surface-variant"
                          : isToday
                            ? "border-2 border-secondary"
                            : "border border-outline-variant text-on-surface-variant"
                } ${isToday ? "ring-2 ring-secondary/30 ring-offset-1" : ""}`}
              >
                {state === "taken" || state === "partial" ? <Icon name="check" size={15} /> : null}
                {state === "missed" ? <Icon name="x" size={14} /> : null}
                {state === "uncertain" ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
              </span>
              <span className={`t-label-md ${isToday ? "font-bold text-primary" : "text-on-surface-variant"}`}>
                {isToday ? "امروز" : dayNum}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-card bg-secondary-container/40 p-3">
        <Icon name="leaf" size={16} className="mt-0.5 shrink-0 text-secondary" />
        <p className="t-label-lg text-on-secondary-container">{banner}</p>
      </div>
    </SectionCard>
  );
}

/* ------------------------------- mood card -------------------------------- */

const MOOD_TILES: { emoji: string; title: string; sub: string }[] = [
  { emoji: "😌", title: "آرام و پایدار", sub: "تعادل جسمی" },
  { emoji: "😞", title: "خسته یا بی‌حال", sub: "انرژی پایین" },
  { emoji: "🤔", title: "هوس یا وسوسه", sub: "نیاز به مدیریت" },
  { emoji: "😖", title: "نگرانی یا اضطراب", sub: "تنش عصبی" },
];

function MoodCard() {
  const { data } = useApp();
  const today = todayIso();
  const done = data?.symptomLogs.some((l) => l.date === today) ?? false;
  return (
    <SectionCard
      icon="brain"
      iconTone="bg-rose-soft text-rose-ink"
      title="ارزیابی حال جسمی و روحی"
      subtitle="چند سؤال کوتاه — همه اختیاری"
      trailing={<span className="chip bg-surface-container-high text-on-surface-variant">۱ دقیقه</span>}
    >
      <p className="t-label-lg mt-3 text-on-surface">
        {done ? "امروز ثبت شده است — می‌توانید ویرایش کنید:" : "امروز از نظر جسمی و ذهنی چه حالی دارید؟"}
      </p>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {MOOD_TILES.map((m) => (
          <Link
            key={m.title}
            href="/checkin"
            className="rounded-card border border-surface-container-high bg-surface-container-low px-3 py-2.5 transition-transform active:scale-[0.97]"
          >
            <span className="flex items-center justify-between">
              <span className="text-lg" aria-hidden="true">{m.emoji}</span>
              <Icon name="chevron-left" size={14} className="text-on-surface-variant" />
            </span>
            <p className="t-label-lg mt-1 text-on-surface">{m.title}</p>
            <p className="t-label-sm text-on-surface-variant">{m.sub}</p>
          </Link>
        ))}
      </div>
      <p className="t-label-sm mt-3 flex items-start gap-1.5 text-on-surface-variant">
        <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
        این ثبت جای مشورت درمانی را نمی‌گیرد؛ فقط روند شما را برای گفتگو با درمانگر روشن می‌کند.
      </p>
    </SectionCard>
  );
}

/* ------------------------------ support card ------------------------------ */

function SupportCard() {
  return (
    <SectionCard
      icon="shield"
      iconTone="bg-rose-soft text-rose-ink"
      title="پشتیبانی و ایمنی درمانی"
      subtitle="همراهی ۲۴ ساعته و بدون قضاوت"
    >
      <div className="mt-3 space-y-2">
        <Link
          href="/safety"
          className="flex items-center justify-between rounded-card border border-surface-container-high bg-surface-container-lowest px-3 py-3"
        >
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-on-surface">
              <Icon name="note" size={16} />
            </span>
            <span className="t-label-lg text-on-surface">راهنمای نوبت فراموش‌شده</span>
          </span>
          <Icon name="chevron-left" size={16} className="text-on-surface-variant" />
        </Link>

        <Link
          href="/safety"
          className="flex items-center justify-between rounded-card border border-error/30 bg-error-container/40 px-3 py-3"
        >
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-error/15 text-error">
              <Icon name="phone" size={16} />
            </span>
            <span>
              <span className="t-label-lg block font-semibold text-error">تماس با اورژانس (۱۱۵)</span>
              <span className="t-label-sm block text-on-surface-variant">موارد فوری — اورژانس پیش‌بینی‌نشده را جدی بگیرید</span>
            </span>
          </span>
          <span className="chip bg-error text-white">فوری</span>
        </Link>
      </div>
    </SectionCard>
  );
}

/* -------------------------- attention / welcome --------------------------- */

function PlanAttentionStrip({ today }: { today: string }) {
  const { data } = useApp();
  const plan = data ? currentPlan(data.treatmentPlans) : null;
  const displayed = plan ? deriveDisplayedPlan(plan, today) : null;
  if (!plan || !displayed) return null;
  if (!displayed.flags.reviewOverdue) return null;
  return (
    <Link
      href="/plan"
      className="card flex items-center justify-between border-tertiary-fixed p-4"
    >
      <span className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-card bg-tertiary-fixed text-tertiary">
          <Icon name="alert" size={18} />
        </span>
        <span>
          <span className="t-label-lg block font-semibold text-on-surface">مرور برنامه گذشته است</span>
          <span className="t-label-md block text-on-surface-variant">
            برنامه خودبه‌خود جلو برده نمی‌شود — با درمانگر مرور کنید
          </span>
        </span>
      </span>
      <Icon name="chevron-left" size={16} className="text-on-surface-variant" />
    </Link>
  );
}

function ReturningAfterGap({ today }: { today: string }) {
  const { data } = useApp();
  const lastLog = data?.medicationLogs.at(-1)?.date;
  if (!lastLog) return null;
  const gapDays = Math.round((new Date(today).getTime() - new Date(lastLog).getTime()) / 86400000);
  if (gapDays < 7) return null;
  return (
    <div className="card border-rose-border bg-rose-soft/50 p-4">
      <p className="t-label-lg font-semibold text-rose-ink">خوش آمدید — وقفه‌ای در ثبت پیش آمده</p>
      <p className="t-label-lg mt-1 text-rose-ink/90">
        حدود {gapDays.toLocaleString("fa-IR")} روز ثبت جدیدی نداریم. این اتفاق محکوم‌کردنی
        نیست؛ هر وقت آماده بودید از همین‌جا ادامه دهید.
      </p>
    </div>
  );
}

/* --------------------------------- page ----------------------------------- */

export default function DashboardPage() {
  const { data, ready } = useApp();
  const today = todayIso();

  if (!ready) return <PageLoading />;
  if (!data || !data.profile.onboardedAt) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="t-headline-md text-on-surface">سلام 🌿</h1>
        <p className="t-label-md text-on-surface-variant">
          رسا، همراه مسیر پایدار بهبود — همه‌چیز روی همین دستگاه می‌ماند.
        </p>
        <section className="card p-4">
          <EmptyState
            icon="heart"
            title="به رسا خوش آمدید"
            body="برای شروع، چند دقیقه درباره دارو و برنامه‌تان اطلاعات اولیه ثبت کنید. هر مرحله می‌تواند بعداً کامل شود."
            action={
              <Link href="/onboarding">
                <Button>شروع تنظیم اولیه</Button>
              </Link>
            }
          />
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Greeting
        name={data.profile.displayName}
        isDemo={data.mode === "demo"}
        today={today}
        regimenStart={data.medicationProfile?.regimenStartDate ?? null}
      />
      <ReturningAfterGap today={today} />
      <DoseCard today={today} />
      <WeekCard today={today} />
      <MoodCard />
      <SupportCard />
      <PlanAttentionStrip today={today} />
    </div>
  );
}
