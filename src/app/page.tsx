"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useApp } from "@/features/app-store";
import { Card, SectionTitle, Chip, EmptyState, Button, PageLoading } from "@/components/ui/primitives";
import { Icon, type IconName } from "@/components/ui/icons";
import { LineChart } from "@/components/charts/line-chart";
import { todayIso, faDate } from "@/lib/dates";
import { currentPlan, deriveDisplayedPlan, PLAN_STATUS_LABELS } from "@/lib/plan/status";
import { nextOccurrence, REMINDER_TYPE_LABELS } from "@/lib/reminders";
import { formatAmount } from "@/lib/medication-units";

/* ------------------------------ small pieces ------------------------------ */

function HeroGreeting({ name, isDemo }: { name: string | null; isDemo: boolean }) {
  const hour = new Date().getHours();
  const part = hour < 12 ? "روز" : hour < 18 ? "بعدازظهر" : "شب";
  return (
    <div className="hero-card p-5">
      <p className="t-label-md text-inverse-primary">
        {faDate(todayIso(), { withWeekday: true })}
        {isDemo ? " · داده نمایشی" : ""}
      </p>
      <h1 className="t-headline-md mt-1 text-white">
        {part} آرام و متمرکز{name ? `، ${name}` : ""} 🌿
      </h1>
      <p className="t-body-md mt-1 text-white/80">
        هر ثبت کوچک، یک قدم مطمئن در مسیر درمان است — بدون قضاوت.
      </p>
    </div>
  );
}

function StatusChips({
  planLabel,
  lastDose,
}: {
  planLabel: string | null;
  lastDose: string | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-card bg-secondary-container/60 p-3">
        <p className="t-label-sm text-on-secondary-container">برنامه درمان</p>
        <p className="t-label-lg mt-0.5 text-on-secondary-container">{planLabel ?? "ثبت نشده"}</p>
      </div>
      <div className="rounded-card bg-rose-soft p-3">
        <p className="t-label-sm text-rose-ink">آخرین ثبت دارو</p>
        <p className="t-label-lg mt-0.5 text-rose-ink">{lastDose ?? "هنوز ثبت نشده"}</p>
      </div>
    </div>
  );
}

function TodayLogCard({ today }: { today: string }) {
  const { data } = useApp();
  const log = data?.medicationLogs.find((l) => l.date === today);
  const profile = data?.medicationProfile ?? null;
  const unit = profile?.formulation === "tablet" ? "tablet" : "mL";

  if (!profile) {
    return (
      <Card>
        <SectionTitle icon="pill">ثبت داروی امروز</SectionTitle>
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
      </Card>
    );
  }

  const taken = log?.entries.filter((e) => e.status === "taken").length ?? 0;
  const total = log?.entries.length ?? profile.administrationsPerDay;
  const last = log?.entries.at(-1);
  const summary =
    taken === total && total > 0
      ? `هر ${total.toLocaleString("fa-IR")} نوبت امروز ثبت شد ✓`
      : last
        ? `آخرین نوبت: ${formatAmount(last.actualAmount ?? last.plannedAmount, unit)} — ${
            last.status === "taken"
              ? "مصرف‌شده"
              : last.status === "delayed"
                ? "با تأخیر"
                : last.status === "missed"
                  ? "ثبت نشده"
                  : "نامطمئن"
          }`
        : "ثبت امروز انجام نشده — هر وقت آماده بودید.";

  return (
    <Card>
      <SectionTitle
        icon="pill"
        action={
          <Link href="/medication" className="t-label-md text-secondary">
            ثبت / جزئیات
          </Link>
        }
      >
        داروی امروز
      </SectionTitle>
      <p className="t-body-md text-on-surface">{summary}</p>
      <div className="mt-2 flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-2.5 flex-1 rounded-pill ${i < taken ? "bg-secondary" : "bg-surface-container-highest"}`}
          />
        ))}
      </div>
    </Card>
  );
}

function PlanCard({ today }: { today: string }) {
  const { data } = useApp();
  const plan = data ? currentPlan(data.treatmentPlans) : null;
  const displayed = plan ? deriveDisplayedPlan(plan, today) : null;

  if (!plan || !displayed) {
    return (
      <Card>
        <SectionTitle icon="plan">برنامه درمان</SectionTitle>
        <p className="t-body-md text-on-surface-variant">
          برنامه‌ای ثبت نشده است. اپ بدون دستور درمانگر، هیچ برنامه‌ای نمی‌سازد — فقط آنچه
          ثبت و تأیید شده را نمایش می‌دهد.
        </p>
        <Link href="/plan" className="t-label-md mt-3 inline-block text-secondary">
          ثبت وضعیت برنامه →
        </Link>
      </Card>
    );
  }

  const overdue = displayed.flags.reviewOverdue;
  return (
    <Card className={overdue ? "border-tertiary-fixed" : ""}>
      <div className="mb-2 flex items-center justify-between">
        <Chip tone={overdue ? "caution" : "success"}>{PLAN_STATUS_LABELS[displayed.status]}</Chip>
        <Link href="/plan" className="t-label-md text-secondary">
          جزئیات برنامه
        </Link>
      </div>
      <p className="t-headline-sm text-on-surface">{plan.title}</p>
      {overdue ? (
        <p className="t-body-md mt-2 text-tertiary">
          تاریخ مرور برنامه گذشته است؛ برنامه به‌صورت خودکار جلو برده نمی‌شود. برای ادامه،
          با درمانگر خود مرور کنید.
        </p>
      ) : displayed.reviewInDays !== null ? (
        <p className="t-body-md mt-2 text-on-surface-variant">
          مرور بعدی: {faDate(plan.nextReviewDate)} — {Math.abs(displayed.reviewInDays).toLocaleString("fa-IR")} روز دیگر
        </p>
      ) : (
        <p className="t-body-md mt-2 text-on-surface-variant">تاریخ مرور ثبت نشده است.</p>
      )}
    </Card>
  );
}

function TrendCard() {
  const { data } = useApp();
  const points = useMemo(() => {
    if (!data) return [];
    return data.symptomLogs.slice(-14).map((s) => ({
      date: s.date,
      value: s.mood,
    }));
  }, [data]);
  if (points.length < 3) return null;
  return (
    <Card>
      <SectionTitle icon="chart">روند حال عمومی (۱۴ روز اخیر)</SectionTitle>
      <LineChart
        series={[{ label: "حال عمومی", color: "#006a60", points }]}
        height={110}
        yLabel="۰ = خیلی بد، ۴ = خیلی خوب — فقط روند ثبت‌های خودتان، نه معیار بهبودی"
      />
    </Card>
  );
}

function QuickActions() {
  const items: { href: string; label: string; icon: IconName; tone: string }[] = [
    { href: "/medication", label: "ثبت مصرف", icon: "pill", tone: "bg-secondary-container text-on-secondary-container" },
    { href: "/checkin", label: "حال امروز", icon: "heart", tone: "bg-rose-soft text-rose-ink" },
    { href: "/plan", label: "برنامه درمان", icon: "plan", tone: "bg-surface-container-high text-on-surface" },
    { href: "/safety", label: "ایمنی و کمک", icon: "shield", tone: "bg-tertiary-fixed text-tertiary" },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className="flex flex-col items-center gap-1.5 rounded-card px-1 py-3 text-center transition-transform active:scale-95"
        >
          <span className={`flex h-11 w-11 items-center justify-center rounded-full ${it.tone}`}>
            <Icon name={it.icon} size={20} />
          </span>
          <span className="t-label-sm text-on-surface">{it.label}</span>
        </Link>
      ))}
    </div>
  );
}

function ReminderAndCheckin({ today }: { today: string }) {
  const { data } = useApp();
  if (!data) return null;
  const plan = currentPlan(data.treatmentPlans);
  const nowHhmm = new Date().toTimeString().slice(0, 5);
  const next = nextOccurrence(data.reminders, plan, today, nowHhmm);
  const checkinDone = data.symptomLogs.some((l) => l.date === today);

  return (
    <Card>
      <SectionTitle icon="bell">یادآور بعدی و چک‌این</SectionTitle>
      <div className="flex flex-wrap items-center gap-2">
        {next ? (
          <Chip tone="info">
            {REMINDER_TYPE_LABELS[next.occurrence.type]} — {next.tomorrow ? "فردا" : "امروز"} ساعت{" "}
            {next.occurrence.time.replace(":", "٫")}
          </Chip>
        ) : (
          <Chip tone="neutral">یادآور فعالی نیست</Chip>
        )}
        {checkinDone ? (
          <Chip tone="success">چک‌این امروز ثبت شد ✓</Chip>
        ) : (
          <Link href="/checkin">
            <Button size="sm" variant="secondary">
              ثبت حال امروز
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}

function ReturningAfterGap({ today }: { today: string }) {
  const { data } = useApp();
  const lastLog = data?.medicationLogs.at(-1)?.date;
  if (!lastLog) return null;
  const gapDays = Math.round(
    (new Date(today).getTime() - new Date(lastLog).getTime()) / 86400000,
  );
  if (gapDays < 7) return null;
  return (
    <Card className="border-rose-border bg-rose-soft/50">
      <p className="t-label-lg text-rose-ink">خوش آمدید — وقفه‌ای در ثبت پیش آمده</p>
      <p className="t-body-md mt-1 text-rose-ink/90">
        حدود {gapDays.toLocaleString("fa-IR")} روز ثبت جدیدی نداریم. این اتفاق محکوم‌کردنی
        نیست؛ هر وقت آماده بودید از همین‌جا ادامه دهید و اگر لازم شد با درمانگر خود هماهنگ
        کنید.
      </p>
    </Card>
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
        <HeroGreeting name={null} isDemo={false} />
        <Card>
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
        </Card>
      </div>
    );
  }

  const lastDose = data.medicationLogs.at(-1);
  const unit = data.medicationProfile?.formulation === "tablet" ? "tablet" : "mL";
  const plan = currentPlan(data.treatmentPlans);

  return (
    <div className="flex flex-col gap-4">
      <HeroGreeting name={data.profile.displayName} isDemo={data.mode === "demo"} />
      <StatusChips
        planLabel={plan ? PLAN_STATUS_LABELS[plan.status] : null}
        lastDose={
          lastDose
            ? `${faDate(lastDose.date)} — ${formatAmount(
                lastDose.entries.at(-1)?.actualAmount ?? lastDose.entries.at(-1)?.plannedAmount,
                unit,
              )}`
            : null
        }
      />
      <ReturningAfterGap today={today} />
      <PlanCard today={today} />
      <TodayLogCard today={today} />
      <TrendCard />
      <ReminderAndCheckin today={today} />
      <SectionTitle icon="note">دسترسی سریع</SectionTitle>
      <QuickActions />
      <Card className="bg-surface-container-low">
        <SectionTitle icon="shield">راهنما و پشتیبانی</SectionTitle>
        <p className="t-body-md mb-2 text-on-surface-variant">
          این اپ جایگزین پزشک نیست. برای هر تغییر دوز یا تصمیم درمانی با درمانگر خود مشورت
          کنید.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/safety">
            <Chip tone="rose">راهنمای ایمنی و موارد اورژانسی</Chip>
          </Link>
          <Link href="/settings">
            <Chip tone="neutral">تنظیم یادآورها</Chip>
          </Link>
        </div>
      </Card>
    </div>
  );
}
