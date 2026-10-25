"use client";

/**
 * Onboarding wizard — step 1 mirrors the approved Stitch welcome screen.
 * Draft is auto-saved so the user can continue later. No sensitive personal
 * data is collected (no real name, no location, no ID).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/features/app-store";
import { Button, Chip, Field, TextField, NumberField, TimeField, ToggleSwitch, SelectField, ErrorBox, Card } from "@/components/ui/primitives";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { Icon } from "@/components/ui/icons";
import { uid } from "@/lib/store/demo-data";
import { readDraft, writeDraft, clearDraft } from "@/lib/store/local-store";
import { parsePositiveDecimal } from "@/lib/medication-units";
import { todayIso } from "@/lib/dates";
import type { Formulation, PlanSource, TreatmentPlan } from "@/types";
import { PLAN_SOURCE_LABELS } from "@/lib/plan/status";
import { APP_NAME, APP_NAME_LATIN } from "@/lib/store/empty-data";

interface Draft {
  step: number;
  displayName: string;
  personalGoal: string;
  formulation: Formulation;
  productName: string;
  strength: string;
  prescribed: string;
  times: string[];
  regimenStart: string | null;
  hasPlan: boolean | null;
  planTitle: string;
  planSource: PlanSource;
  authorizedBy: string;
  effectiveDate: string | null;
  nextReviewDate: string | null;
  planNote: string;
  checkin: boolean;
  checkinTime: string;
  consent: boolean;
}

const EMPTY_DRAFT: Draft = {
  step: 0,
  displayName: "",
  personalGoal: "",
  formulation: "liquid",
  productName: "",
  strength: "",
  prescribed: "",
  times: ["08:00"],
  regimenStart: "",
  hasPlan: null,
  planTitle: "",
  planSource: "clinician-approved",
  authorizedBy: "",
  effectiveDate: "",
  nextReviewDate: "",
  planNote: "",
  checkin: true,
  checkinTime: "20:00",
  consent: false,
};

const STEPS = ["خوش‌آمد", "حریم خصوصی", "درباره شما", "دارو", "برنامه درمان", "یادآورها"];

function Logo() {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="لوگوی رسا" className="h-20 w-20" />
      <h1 className="t-headline-lg-mobile text-center text-on-surface">
        {APP_NAME} ({APP_NAME_LATIN}) — همراه مسیر پایدار بهبود
      </h1>
    </div>
  );
}

const VALUE_CARDS = [
  {
    icon: "note" as const,
    tone: "bg-secondary-container text-on-secondary-container",
    title: "ثبت آگاهانه و صادقانه",
    body: "این اپ جای داوری و پاداش نیست؛ ثبت درست و شفاف، پایه مسیر امن شماست.",
  },
  {
    icon: "shield" as const,
    tone: "bg-rose-soft text-rose-ink",
    title: "محافظ دستور پزشک شما",
    body: "تنها برنامه‌ای که درمانگرتان تعیین کرده نمایش داده می‌شود؛ نه کمتر، نه بیشتر.",
  },
  {
    icon: "heart" as const,
    tone: "bg-tertiary-fixed text-tertiary",
    title: "حفظ خصوصیت در اولویت",
    body: "داده‌ها فقط روی دستگاه شما می‌ماند؛ امکان خروجی و پاک‌کردن کامل همیشه هست.",
  },
  {
    icon: "chart" as const,
    tone: "bg-surface-container-high text-on-surface",
    title: "یادگیری برای زندگی",
    body: "روندها و نکات کوتاه آگاهی‌بخش برای حمایت از تغییر پایدار و رشد روزمره.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data, ready, mode, actions } = useApp();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [resumed, setResumed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const d = readDraft<Draft>(window.localStorage);
    if (d && !resumed) {
      setDraft({ ...EMPTY_DRAFT, ...d });
      setResumed(true);
    } else if (!resumed) {
      setResumed(true);
    }
  }, [ready, resumed]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (typeof window !== "undefined") writeDraft(window.localStorage, next);
      return next;
    });
  };

  const isDemo = mode === "demo" && data?.profile.isDemo;

  /* ------------------------------ step: welcome --------------------------- */
  if (draft.step === 0) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col gap-5 px-margin-mobile pt-safe pb-10 md:px-margin">
        <div className="flex justify-between pt-3">
          <Chip tone="neutral">خوش‌آمد</Chip>
          {isDemo ? <Chip tone="caution">حالت نمایشی فعال است</Chip> : null}
        </div>
        <Logo />
        <p className="t-body-md text-center text-on-surface-variant">
          ثبت درست، برنامه روشن، پشتیبانی پیوسته — بدون قضاوت و با حفظ کامل حریم خصوصی.
        </p>
        <div className="flex flex-col gap-3">
          {VALUE_CARDS.map((c) => (
            <Card key={c.title} className="flex items-start gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${c.tone}`}>
                <Icon name={c.icon} size={18} />
              </span>
              <div>
                <p className="t-label-lg text-on-surface">{c.title}</p>
                <p className="t-body-md mt-0.5 text-on-surface-variant">{c.body}</p>
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-2 flex flex-col gap-2">
          <Button
            full
            size="lg"
            onClick={() => set("step", 1)}
          >
            شروع تنظیم اولیه
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                setBusy(true);
                const res = await actions.enterDemo("liquid");
                setBusy(false);
                if (res.ok) router.push("/");
                else setError(res.error);
              }}
              disabled={busy}
            >
              داده نمایشی (شربت)
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                setBusy(true);
                const res = await actions.enterDemo("tablet");
                setBusy(false);
                if (res.ok) router.push("/");
                else setError(res.error);
              }}
              disabled={busy}
            >
              داده نمایشی (قرص)
            </Button>
          </div>
          <p className="t-body-sm text-center text-on-surface-variant">
            حالت نمایشی با داده‌های مصنوعی کار می‌کند و جدای از داده‌های شخصی شما نگه‌داری می‌شود.
          </p>
        </div>
        {error ? <ErrorBox message={error} onClose={() => setError(null)} /> : null}
      </div>
    );
  }

  /* ------------------------------ step: privacy --------------------------- */
  if (draft.step === 1) {
    return (
      <WizardFrame step={1} draft={draft} set={set}>
        <h2 className="t-headline-md mb-2">حریم خصوصی و محدودیت‌ها</h2>
        <ul className="t-body-md list-disc space-y-2 pr-5 text-on-surface-variant">
          <li>داده‌ها فقط روی همین دستگاه ذخیره می‌شوند؛ در این نسخه سروری وجود ندارد.</li>
          <li>نیازی به نام واقعی، آدرس یا مدرک هویتی نیست.</li>
          <li>این اپ <b>جایگزین پزشک نیست</b>؛ هیچ دوزی را تغییر نمی‌دهد و برنامه درمانی نمی‌سازد.</li>
          <li>هر برنامه‌ای که نمایش داده می‌شود باید قبلاً توسط درمانگر شما تأیید و ثبت شده باشد.</li>
          <li>در موارد اورژانسی همیشه با اورژانس ۱۱۵ تماس بگیرید؛ اپ جای آن را نمی‌گیرد.</li>
        </ul>
        <div className="mt-4 rounded-card bg-secondary-container/40 p-3">
          <ToggleSwitch
            checked={draft.consent}
            onChange={(v) => set("consent", v)}
            label="می‌خوانم و می‌پذیرم"
            description="مفاد بالا را خواندم و استفاده از اپ را با همین محدودیت‌ها می‌پذیرم."
          />
        </div>
      </WizardFrame>
    );
  }

  /* ------------------------------ step: about ----------------------------- */
  if (draft.step === 2) {
    return (
      <WizardFrame step={2} draft={draft} set={set}>
        <h2 className="t-headline-md mb-2">درباره شما (اختیاری)</h2>
        <Field label="نام مستعار (اختیاری)" hint="برای صمیمی‌تر شدن پیام‌ها؛ نام واقعی لازم نیست.">
          <TextField value={draft.displayName} onChange={(v) => set("displayName", v)} placeholder="مثلاً: دوست عزیز" />
        </Field>
        <Field label="هدف شخصی شما (اختیاری)" hint="این متن فقط برای یادآوری خودتان است و به‌عنوان دستور درمان استفاده نمی‌شود.">
          <TextField value={draft.personalGoal} onChange={(v) => set("personalGoal", v)} placeholder="مثلاً: پیگیری منظم برنامه‌ام" />
        </Field>
      </WizardFrame>
    );
  }

  /* --------------------------- step: medication --------------------------- */
  if (draft.step === 3) {
    const strengthInvalid =
      draft.formulation === "tablet" &&
      draft.strength.trim() !== "" &&
      !parsePositiveDecimal(draft.strength).ok;
    const concInvalid =
      draft.formulation === "liquid" &&
      draft.strength.trim() !== "" &&
      !parsePositiveDecimal(draft.strength).ok;
    const canNext =
      draft.productName.trim() !== "" &&
      (draft.formulation === "tablet" ? parsePositiveDecimal(draft.strength).ok : parsePositiveDecimal(draft.strength).ok) &&
      (draft.prescribed === "" || parsePositiveDecimal(draft.prescribed, { allowZero: true }).ok);
    return (
      <WizardFrame step={3} draft={draft} set={set}>
        <h2 className="t-headline-md mb-2">داروی شما</h2>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {(["liquid", "tablet"] as Formulation[]).map((f) => (
            <button
              key={f}
              onClick={() => set("formulation", f)}
              className={`rounded-card border px-3 py-3 t-label-lg transition-colors ${
                draft.formulation === f
                  ? "border-secondary bg-secondary-container text-on-secondary-container"
                  : "border-outline-variant bg-surface-container-lowest text-on-surface-variant"
              }`}
            >
              {f === "liquid" ? "شربت / محلول خوراکی" : "قرص"}
            </button>
          ))}
        </div>
        <Field label="نام دقیق روی بسته">
          <TextField value={draft.productName} onChange={(v) => set("productName", v)} placeholder="مثلاً: شربت متادون ۱mg/mL" />
        </Field>
        {draft.formulation === "tablet" ? (
          <Field label="قدرت هر قرص (طبق بسته)" error={strengthInvalid ? "عدد معتبر وارد کنید." : null} hint="واحد: میلی‌گرم در هر قرص">
            <NumberField value={draft.strength} onChange={(v) => set("strength", v)} unit="mg" invalid={strengthInvalid} />
          </Field>
        ) : (
          <Field label="غلظت (طبق بسته)" error={concInvalid ? "عدد معتبر وارد کنید." : null} hint="واحد: میلی‌گرم در هر میلی‌لیتر — بدون این عدد، تبدیل mL به mg انجام نمی‌شود.">
            <NumberField value={draft.strength} onChange={(v) => set("strength", v)} unit="mg/mL" invalid={concInvalid} />
          </Field>
        )}
        <Field label="مقدار تجویزی روزانه (طبق دستور درمانگر)" hint={draft.formulation === "liquid" ? "به میلی‌لیتر" : "تعداد قرص در روز"}>
          <NumberField value={draft.prescribed} onChange={(v) => set("prescribed", v)} unit={draft.formulation === "liquid" ? "mL" : "قرص"} />
        </Field>
        <Field label="ساعت مصرف">
          <TimeField value={draft.times[0] ?? "08:00"} onChange={(v) => set("times", [v])} />
        </Field>
        <JalaliDatePicker
          label="شروع این رژیم (اختیاری)"
          hint="تقویم شمسی — امروز یا قبل از امروز"
          value={draft.regimenStart}
          onChange={(iso) => set("regimenStart", iso)}
          max={todayIso()}
          placeholder="مثلاً: ۱۴۰۵/۰۶/۱۵"
        />
        {!canNext ? (
          <p className="t-body-sm mt-3 text-tertiary">
            برای ادامه، نام محصول و مقدار طبق بسته لازم است.
          </p>
        ) : null}
      </WizardFrame>
    );
  }

  /* ------------------------------ step: plan ------------------------------ */
  if (draft.step === 4) {
    return (
      <WizardFrame step={4} draft={draft} set={set}>
        <h2 className="t-headline-md mb-2">برنامه درمان شما</h2>
        <p className="t-body-md mb-3 text-on-surface-variant">
          اپ هیچ برنامه‌ای نمی‌سازد. اگر درمانگرتان برنامه‌ای تعیین کرده، آن را ثبت کنید تا
          فقط همان نمایش داده شود.
        </p>
        <div className="mb-4 grid gap-2">
          <button
            onClick={() => set("hasPlan", true)}
            className={`rounded-card border px-3 py-3 text-right t-label-lg ${draft.hasPlan === true ? "border-secondary bg-secondary-container text-on-secondary-container" : "border-outline-variant bg-surface-container-lowest"}`}
          >
            بله، برنامه تأییدشده دارم
          </button>
          <button
            onClick={() => set("hasPlan", false)}
            className={`rounded-card border px-3 py-3 text-right t-label-lg ${draft.hasPlan === false ? "border-secondary bg-secondary-container text-on-secondary-container" : "border-outline-variant bg-surface-container-lowest"}`}
          >
            فعلاً برنامه‌ای ندارم / نمی‌دانم
          </button>
        </div>
        {draft.hasPlan ? (
          <>
            <Field label="عنوان برنامه">
              <TextField value={draft.planTitle} onChange={(v) => set("planTitle", v)} placeholder="مثلاً: پایدارسازی با دوز فعلی" />
            </Field>
            <Field label="منبع برنامه">
              <SelectField
                value={draft.planSource}
                onChange={(v) => set("planSource", v)}
                options={(Object.keys(PLAN_SOURCE_LABELS) as PlanSource[]).map((s) => ({ value: s, label: PLAN_SOURCE_LABELS[s] }))}
              />
            </Field>
            {draft.planSource === "clinician-approved" ? (
              <Field label="نام/عنوان تأییدکننده" hint="فقط برای مستندسازی؛ در این نسخه تأیید هویت انجام نمی‌شود.">
                <TextField value={draft.authorizedBy} onChange={(v) => set("authorizedBy", v)} placeholder="مثلاً: دکتر ..." />
              </Field>
            ) : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <JalaliDatePicker
                label="تاریخ اجرا"
                value={draft.effectiveDate}
                onChange={(iso) => set("effectiveDate", iso)}
                placeholder="مثلاً: ۱۴۰۵/۰۸/۰۱"
              />
              <JalaliDatePicker
                label="مرور بعدی"
                hint="تاریخ مرور بعدی با درمانگر — امروز یا بعد از امروز"
                value={draft.nextReviewDate}
                onChange={(iso) => set("nextReviewDate", iso)}
                min={todayIso()}
                placeholder="مثلاً: ۱۴۰۵/۱۱/۱۵"
              />
            </div>
            <Field label="نکته برنامه (اختیاری)">
              <TextField value={draft.planNote} onChange={(v) => set("planNote", v)} placeholder="خلاصه دستور درمانگر" />
            </Field>
            <p className="t-body-sm mb-2 text-on-surface-variant">
              نقاط عطف دقیق (مقدار هر هفته و…) بعداً در صفحه «برنامه» قابل ثبت است.
            </p>
          </>
        ) : null}
      </WizardFrame>
    );
  }

  /* --------------------------- step: reminders ---------------------------- */
  if (draft.step === 5) {
    return (
      <WizardFrame step={5} draft={draft} set={set}>
        <h2 className="t-headline-md mb-2">یادآورها</h2>
        <p className="t-body-md mb-3 text-on-surface-variant">
          متن اعلان‌ها عمداً کلی است تا محتوای درمانی شما روی قفل صفحه دیده نشود.
        </p>
        <ToggleSwitch checked={draft.checkin} onChange={(v) => set("checkin", v)} label="یادآور چک‌این روزانه" description="دقیقه‌ای برای ثبت حال امروز" />
        <Field label="ساعت چک‌این">
          <TimeField value={draft.checkinTime} onChange={(v) => set("checkinTime", v)} />
        </Field>
        <p className="t-body-sm text-on-surface-variant">
          یادآورهای دارو به‌طور خودکار از ساعت‌های مصرف شما ساخته می‌شوند و در تنظیمات قابل
          تغییرند. اعلان پس‌زمینه‌ی تضمینی در وب محدود است؛ جزئیات در تنظیمات آمده.
        </p>
      </WizardFrame>
    );
  }

  return null;
}

/* ------------------------------ wizard frame ------------------------------ */

function WizardFrame({
  step,
  draft,
  set,
  children,
}: {
  step: number;
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { actions, data, mode } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const back = () => set("step", Math.max(0, step - 1));
  const next = async () => {
    setBusy(true);
    setError(null);
    try {
      if (step === STEPS.length - 1) {
        // finish
        if (mode === "demo") {
          // Demo users finishing the wizard just go home (demo data stays).
          router.push("/");
          return;
        }
        const medId = uid();
        const times = draft.times.length ? draft.times : ["08:00"];
        const med =
          draft.productName.trim() === ""
            ? null
            : {
                id: medId,
                productName: draft.productName.trim(),
                ingredientName: draft.productName.includes("متادون") ? "متادون" : draft.productName.trim(),
                formulation: draft.formulation,
                tabletStrengthMg: draft.formulation === "tablet" && draft.strength.trim() !== "" ? draft.strength : null,
                concentrationMgPerMl: draft.formulation === "liquid" && draft.strength.trim() !== "" ? draft.strength : null,
                prescribedDailyAmount: draft.prescribed.trim() !== "" ? draft.prescribed : null,
                administrationsPerDay: 1,
                administrationTimes: times,
                regimenStartDate: draft.regimenStart || null,
                durationOfUseMonths: null,
                infoSource: draft.planSource === "clinician-approved" && draft.hasPlan ? ("clinician-approved" as const) : ("self-reported" as const),
                lastReviewDate: null,
                nextReviewDate: draft.nextReviewDate || null,
                otherMedicationsNote: null,
                isDemo: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
        const plan: TreatmentPlan | null =
          draft.hasPlan && draft.planTitle.trim()
            ? {
                id: uid(),
                version: 1,
                title: draft.planTitle.trim(),
                status: "awaiting-review",
                source: draft.planSource,
                authorization: draft.planSource === "clinician-approved" && draft.authorizedBy.trim() ? "authorized" : "pending",
                authorizedBy: draft.planSource === "clinician-approved" && draft.authorizedBy.trim() ? draft.authorizedBy.trim() : null,
                authorizedAt: draft.planSource === "clinician-approved" && draft.authorizedBy.trim() ? new Date().toISOString() : null,
                effectiveDate: draft.effectiveDate || todayIso(),
                nextReviewDate: draft.nextReviewDate || null,
                goal: "stabilize-then-decide",
                milestones: [],
                notes: draft.planNote || null,
                isDemo: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : null;
        const res = await actions.completeOnboarding({
          profile: {
            displayName: draft.displayName.trim() || null,
            personalGoal: draft.personalGoal.trim() || null,
          },
          medicationProfile: med,
          plan,
          reminders: {
            medication: Boolean(med),
            medicationTimes: times,
            checkin: draft.checkin,
            checkinTime: draft.checkinTime,
            logReview: true,
            logReviewTime: "21:30",
            reviewLeadDays: 3,
            muted: false,
          },
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        router.push("/");
        return;
      }
      if (step === 1 && !draft.consent) {
        setError("برای ادامه، پذیرش محدودیت‌ها لازم است.");
        return;
      }
      set("step", step + 1);
    } finally {
      setBusy(false);
    }
  };

  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-margin-mobile pt-safe pb-8 md:px-margin">
      <div className="flex items-center justify-between py-3">
        <button onClick={back} className="t-label-md flex items-center gap-1 text-secondary" disabled={busy}>
          <Icon name="chevron-right" size={16} />
          {step === 1 ? "بازگشت" : "قبلی"}
        </button>
        <Chip tone="neutral">{STEPS[step]}</Chip>
        <button
          onClick={() => {
            clearDraft(window.localStorage);
            set("step", 0);
            router.push("/");
          }}
          className="t-label-md text-on-surface-variant"
          disabled={busy}
        >
          بعداً
        </button>
      </div>
      <div className="mb-5 h-1.5 rounded-pill bg-surface-container-high">
        <div className="h-1.5 rounded-pill bg-secondary transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex-1">{children}</div>
      {error ? <ErrorBox message={error} onClose={() => setError(null)} /> : null}
      {data && mode === "user" && !isLast ? null : null}
      <div className="mt-6">
        <Button full size="lg" onClick={next} disabled={busy}>
          {isLast ? "پایان و رفتن به خانه" : "ادامه"}
        </Button>
      </div>
    </div>
  );
}
