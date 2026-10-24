"use client";

/**
 * Safety & support page. Static, evidence-linked education + emergency
 * escalation. No fabricated hotlines: user-configurable contacts + 115 (IR
 * emergency number, jurisdiction field defaults to "ir").
 */

import { useApp } from "@/features/app-store";
import { Card, SectionTitle, Chip } from "@/components/ui/primitives";
import { PageHeader } from "@/components/layout/page-header";
import { Icon } from "@/components/ui/icons";
import { emergencyCriteria, emergencyCallToAction, GENERAL_DISCLAIMER } from "@/lib/safety";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const REDUCED_TOLERANCE_POINTS = [
  "پس از یک دوره کاهش یا قطع مصرف، تحمل بدن به مواد افیونی کم می‌شود؛",
  "مقداری که قبلاً «معمول» بود، پس از یک وقفه می‌تواند خطرناک باشد؛",
  "اگر بعد از مدتی به مصرف برگشتید، از مقدارهای بسیار کمتر شروع نکنید و اول با درمانگر صحبت کنید؛",
  "دسترسی به نالوکسان و آموزش استفاده از آن برای شما و نزدیکانتان ارزشمند است (طبق توصیه WHO).",
];

const MISSED_DOSE_POINTS = [
  "دوز جاافتاده را دوبرابر نکنید؛",
  "زمان‌بندی دوز جاافتاده فقط با پزشک یا داروساز خود مشخص کنید؛",
  "اگر مطمئن نیستید مقداری مصرف شده یا نه، آن را «نامطمئن» ثبت کنید و اضافه مصرف نکنید؛",
  "تغییر خودسرانه برنامه می‌تواند خطرناک باشد — برنامه فقط با تأیید درمانگر تغییر می‌کند.",
];

export default function SafetyPage() {
  const { data, actions } = useApp();
  const pathname = usePathname();

  // Audit: emergency info was opened (no content changes, just a record).
  useEffect(() => {
    void actions.addSafetyEvent("emergency-info-opened", "صفحه ایمنی باز شد.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const contacts = data?.profile.emergencyContacts ?? [];
  const isIr = (data?.profile.jurisdiction ?? "ir") === "ir";

  return (
    <>
      <PageHeader title="ایمنی و پشتیبانی" subtitle="اطلاعات آموزشی + مسیر کمک در موارد نگران‌کننده" />

      {/* Emergency card — must be the most prominent element */}
      <div className="mb-4 rounded-card border-2 border-error-container bg-error-container/40 p-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-error text-on-error">
            <Icon name="alert" size={20} />
          </span>
          <h2 className="t-headline-sm text-on-error-container">موارد اورژانسی — فوراً کمک بگیرید</h2>
        </div>
        <ul className="t-body-md list-disc space-y-1.5 pr-5 text-on-error-container">
          {emergencyCriteria().map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <p className="t-label-lg mt-3 text-on-error-container">{emergencyCallToAction()}</p>
        {isIr ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip tone="danger">اورژانس: ۱۱۵</Chip>
            <Chip tone="danger">اورژانس اجتماعی: ۱۲۳</Chip>
          </div>
        ) : null}
        <p className="t-body-sm mt-2 text-on-error-container/80">
          اعلان یا هشدار داخل اپ جایگزین تماس با خدمات اورژانس نیست.
        </p>
      </div>

      {/* Emergency contacts */}
      <Card className="mb-4">
        <SectionTitle icon="phone">تماس‌های پشتیبان شما</SectionTitle>
        {contacts.length === 0 ? (
          <p className="t-body-md text-on-surface-variant">
            هنوز تماسی ثبت نکرده‌اید. در <a className="underline" href="/settings">تنظیمات</a>{" "}
            می‌توانید شماره پزشک/کلینیک یا فرد مورد اعتماد را اضافه کنید.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {contacts.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-lg bg-surface-container-low p-3">
                <span className="t-label-lg text-on-surface">{c.label}</span>
                <span className="ltr-inline t-label-lg text-secondary">{c.phone}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Missed dose guidance */}
      <Card className="mb-4">
        <SectionTitle icon="pill">دوز جاافتاده یا نامطمئن</SectionTitle>
        <ul className="t-body-md list-disc space-y-1.5 pr-5 text-on-surface">
          {MISSED_DOSE_POINTS.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </Card>

      {/* Abrupt change warning */}
      <Card className="mb-4 border-tertiary-fixed bg-tertiary-fixed/30">
        <SectionTitle icon="alert">تغییر ناگهانی و بدون نظارت ممنوع</SectionTitle>
        <p className="t-body-md text-tertiary">
          قطع ناگهانی یا کاهش سریع دوز بدون نظر درمانگر می‌تواند نشانه‌های ترک شدید و
          خطرناک ایجاد کند. کاهش‌های تدریجی، فردی‌شده و زیر نظر متخصص تعریف می‌شوند؛ اپ هیچ
          برنامه کاهشی نمی‌سازد و فقط برنامه تأییدشده شما را نمایش می‌دهد.
        </p>
      </Card>

      {/* Reduced tolerance */}
      <Card className="mb-4">
        <SectionTitle icon="shield">تحمل کاهش‌یافته و خطر مصرف مجدد</SectionTitle>
        <ul className="t-body-md list-disc space-y-1.5 pr-5 text-on-surface">
          {REDUCED_TOLERANCE_POINTS.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </Card>

      {/* Nonjudgmental return path */}
      <Card className="mb-4 bg-secondary-container/30">
        <SectionTitle icon="heart">اگر مسیرتان لغزید — بازگشت آسان است</SectionTitle>
        <p className="t-body-md text-on-secondary-container">
          لغزیدن بخشی از مسیر تغییر است، نه شکست شخصی. می‌توانید همین امروز بدون قضاوت
          ادامه دهید: ثبت‌هایتان را از سر بگیرید، با درمانگر یا مرکز درمانی خود تماس بگیرید،
          و در صورت نیاز برنامه را با آن‌ها مرور کنید. اپ هیچ پیام سرزنش‌آمیزی نشان نمی‌دهد.
        </p>
      </Card>

      <p className="t-body-sm text-on-surface-variant">{GENERAL_DISCLAIMER}</p>
    </>
  );
}
