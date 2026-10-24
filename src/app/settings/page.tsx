"use client";

/**
 * Profile / Settings — following the approved design (screen 03):
 * privacy banner, avatar hero with stat chips, current-plan summary,
 * privacy facts, treatment contacts, personalization/reminders, about,
 * dark backup CTA and a red full-wipe link.
 * All previous capabilities (profile/medication edit, reminders, export,
 * wipe, mode switch, audit) are preserved.
 */

import { useState } from "react";
import { useApp } from "@/features/app-store";
import { Card, Chip, Button, Field, TextField, NumberField, TimeField, ToggleSwitch, SelectField, ConfirmDialog, ErrorBox, SectionCard, InfoRow, PageLoading } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";
import { faDate, faTime } from "@/lib/dates";
import { parsePositiveDecimal, normalizeNumericInput, formatAmount, formatMg } from "@/lib/medication-units";
import { convertVolumeToMg, convertTabletsToMg } from "@/lib/medication-units";
import { validateReminderPrefs } from "@/lib/validation/reminders";
import { uid } from "@/lib/store/demo-data";
import { APP_NAME, APP_NAME_LATIN } from "@/lib/store/empty-data";
import { currentPlan } from "@/lib/plan/status";
import { InfoSource, ReminderPrefs, EmergencyContact } from "@/types";

const INFO_SOURCE_LABELS: Record<InfoSource, string> = {
  "self-reported": "اطلاعات شخصی (پزشک تأیید نکرده)",
  "imported-record": "پرونده/سند واردشده",
  "clinician-approved": "طبق دستور درمانگر",
};

export default function SettingsPage() {
  const { data, ready, mode, actions } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [contactDraft, setContactDraft] = useState({ label: "", phone: "" });

  if (!ready || !data) return <PageLoading />;

  const mp = data.medicationProfile;
  const prefs = data.reminders;
  const plan = currentPlan(data.treatmentPlans);
  const unit = mp?.formulation === "tablet" ? "tablet" : "mL";
  const companionDays = data.medicationLogs.length;

  // informational mg equivalent from labelled values only
  const mgEquivalent = (() => {
    if (!mp || mp.prescribedDailyAmount === null) return null;
    if (mp.formulation === "liquid" && mp.concentrationMgPerMl) {
      const r = convertVolumeToMg(mp.concentrationMgPerMl, mp.prescribedDailyAmount);
      return r.ok ? r.value.totalMg : null;
    }
    if (mp.formulation === "tablet" && mp.tabletStrengthMg) {
      const r = convertTabletsToMg(mp.tabletStrengthMg, mp.prescribedDailyAmount);
      return r.ok ? r.value.totalMg : null;
    }
    return null;
  })();

  const remindersActive =
    (!prefs.muted ? 1 : 0) +
    (prefs.medication && !prefs.muted ? 1 : 0) +
    (prefs.checkin && !prefs.muted ? 1 : 0) +
    (prefs.logReview && !prefs.muted ? 1 : 0);

  const flash = (m: string) => {
    setSavedMsg(m);
    setError(null);
    window.setTimeout(() => setSavedMsg(null), 2500);
  };

  const saveProfilePatch = async (patch: Parameters<typeof actions.updateProfile>[0]) => {
    const res = await actions.updateProfile(patch);
    if (res.ok) flash("ذخیره شد ✓");
    else setError(res.error);
  };

  const saveReminders = async (next: ReminderPrefs) => {
    const check = validateReminderPrefs(next);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    const res = await actions.updateReminders(next);
    if (res.ok) flash("یادآورها ذخیره شد ✓");
    else setError(res.error);
  };

  const saveMedication = async () => {
    if (!mp) return;
    const res = await actions.saveMedicationProfile({ ...mp });
    if (res.ok) flash("پروفایل دارو ذخیره شد ✓");
    else setError(res.error);
  };

  const addContact = async () => {
    if (contactDraft.label.trim() === "" || contactDraft.phone.trim().length < 3) {
      setError("عنوان و شماره تماس را کامل وارد کنید.");
      return;
    }
    const contacts: EmergencyContact[] = [
      ...data.profile.emergencyContacts,
      { id: uid(), label: contactDraft.label.trim(), phone: contactDraft.phone.trim() },
    ];
    setContactDraft({ label: "", phone: "" });
    await saveProfilePatch({ emergencyContacts: contacts });
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rasa-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const displayName = data.profile.displayName ?? "کاربر رسا";

  return (
    <>
      {/* privacy banner (design: green strip under header) */}
      <div className="mb-4 flex items-center justify-between rounded-card bg-secondary-container/50 px-4 py-2.5">
        <p className="t-label-md text-on-secondary-container">
          <b>پروفایل شخصی شما</b> • همه‌چیز روی همین دستگاه ذخیره می‌شود
        </p>
        <Icon name="gear" size={16} className="shrink-0 text-on-secondary-container" />
      </div>

      {/* avatar hero */}
      <section className="card bg-gradient-to-b from-secondary-container/40 to-surface-container-lowest p-5 text-center">
        <div className="relative mx-auto w-fit">
          <span className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-secondary-container bg-surface-container-high text-on-surface">
            <Icon name="user" size={36} />
          </span>
          <span className="absolute -bottom-1 -end-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary">
            <Icon name="shield" size={15} />
          </span>
        </div>
        <h1 className="t-headline-sm mt-3 text-on-surface">{displayName}</h1>
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
          {data.profile.onboardedAt ? (
            <span className="chip bg-surface-container-high text-on-surface-variant">
              <Icon name="calendar" size={12} />
              عضو از {faDate(data.profile.onboardedAt.slice(0, 10))}
            </span>
          ) : null}
          {mode === "demo" ? <span className="chip bg-rose-soft text-rose-ink">حالت نمایشی</span> : null}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: "روز همراهی", value: companionDays.toLocaleString("fa-IR") },
            { label: "دوز ثبت فعلی", value: mp?.prescribedDailyAmount !== null && mp?.prescribedDailyAmount !== undefined ? formatAmount(mp.prescribedDailyAmount, unit) : "—" },
            { label: "یادآور فعال", value: remindersActive.toLocaleString("fa-IR") },
          ].map((s) => (
            <div key={s.label} className="rounded-card bg-surface-container-lowest px-2 py-2.5">
              <p className="t-title-md font-bold text-primary">{s.value}</p>
              <p className="t-label-sm text-on-surface-variant">{s.label}</p>
            </div>
          ))}
        </div>
        {mode === "demo" ? (
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={async () => {
              const res = await actions.setMode("user");
              if (!res.ok) setError(res.error);
            }}
          >
            رفتن به حالت شخصی
          </Button>
        ) : null}
      </section>

      {/* current plan summary */}
      <SectionCard
        icon="plan"
        iconTone="bg-primary text-on-primary"
        title="خلاصه برنامه درمان فعلی"
        subtitle={plan ? undefined : "برنامه‌ای ثبت نشده است"}
        trailing={plan ? <span className="chip bg-secondary-container text-on-secondary-container">برنامه ثبت‌شده</span> : undefined}
        className="mt-4"
      >
        <div className="mt-3 space-y-2">
          {mp ? (
            <>
              <InfoRow icon="pill" label="نوع دارو / تجویز" value={`${mp.productName} — ${mp.formulation === "tablet" ? "قرص" : "شربت (خوراکی)"}`} />
              <InfoRow
                icon="droplet"
                label="دوز مصرفی روزانه (ثبت‌شده)"
                value={
                  mp.prescribedDailyAmount !== null
                    ? `${formatAmount(mp.prescribedDailyAmount, unit)}${mgEquivalent !== null ? ` (≈ ${formatMg(mgEquivalent)})` : ""}`
                    : "ثبت نشده"
                }
              />
              <InfoRow icon="clock" label="زمان معمول مصرف" value={mp.administrationTimes[0] ? faTime(mp.administrationTimes[0]) : "ثبت نشده"} />
            </>
          ) : (
            <p className="t-body-md text-on-surface-variant">
              برای نمایش خلاصه درمان، ابتدا از <a className="text-secondary underline" href="/onboarding">تنظیم اولیه</a> پروفایل دارو را بسازید.
            </p>
          )}
          <InfoRow icon="file" label="مشاهده جزئیات، مجوز و سابقه برنامه" href="/plan" />
        </div>
      </SectionCard>

      {/* medication edit (previous capability, restyled) */}
      <SectionCard
        icon="gear"
        title="ویرایش اطلاعات درمان"
        subtitle="مقادیر دقیقاً طبق بسته دارو ثبت شوند"
        className="mt-4"
      >
        <div className="mt-3 space-y-3">
          <Field label="نام مستعار (اختیاری)">
            <TextField
              value={data.profile.displayName ?? ""}
              onChange={(v) => void saveProfilePatch({ displayName: v || null })}
              placeholder="مثلاً: دوست عزیز"
            />
          </Field>
          <Field label="هدف شخصی (اختیاری)">
            <TextField
              value={data.profile.personalGoal ?? ""}
              onChange={(v) => void saveProfilePatch({ personalGoal: v || null })}
            />
          </Field>

          {!mp ? (
            <p className="t-body-md text-on-surface-variant">
              پروفایل دارو ساخته نشده — از <a className="underline" href="/onboarding">تنظیم اولیه</a> شروع کنید.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Chip tone="neutral">{mp.formulation === "tablet" ? "قرص" : "شربت/محلول"}</Chip>
                <Chip tone={mp.infoSource === "clinician-approved" ? "success" : "caution"}>
                  {INFO_SOURCE_LABELS[mp.infoSource]}
                </Chip>
              </div>
              <Field label="نام دقیق محصول (طبق بسته)">
                <TextField value={mp.productName} onChange={(v) => void actions.saveMedicationProfile({ ...mp, productName: v }).then((r) => r.ok && flash("نام محصول ذخیره شد ✓"))} />
              </Field>
              {mp.formulation === "tablet" ? (
                <Field label="قدرت هر قرص (mg)" hint="از روی بسته؛ اپ این عدد را از نام محصول حدس نمی‌زند.">
                  <NumberField
                    value={mp.tabletStrengthMg ?? ""}
                    unit="mg"
                    onChange={(v) => {
                      const check = parsePositiveDecimal(v);
                      if (v === "" || check.ok) void actions.saveMedicationProfile({ ...mp, tabletStrengthMg: v === "" ? null : normalizeNumericInput(v) }).then((r) => r.ok && flash("قدرت قرص ذخیره شد ✓"));
                      else setError("عدد معتبر وارد کنید.");
                    }}
                  />
                </Field>
              ) : (
                <Field label="غلظت (mg/mL)" hint="بدون غلظت، تبدیل میلی‌لیتر به میلی‌گرم انجام نمی‌شود.">
                  <NumberField
                    value={mp.concentrationMgPerMl ?? ""}
                    unit="mg/mL"
                    onChange={(v) => {
                      const check = parsePositiveDecimal(v);
                      if (v === "" || check.ok) void actions.saveMedicationProfile({ ...mp, concentrationMgPerMl: v === "" ? null : normalizeNumericInput(v) }).then((r) => r.ok && flash("غلظت ذخیره شد ✓"));
                      else setError("عدد معتبر وارد کنید.");
                    }}
                  />
                </Field>
              )}
              <Field label="مقدار تجویزی روزانه" hint={mp.formulation === "liquid" ? "میلی‌لیتر در روز" : "قرص در روز"}>
                <NumberField
                  value={mp.prescribedDailyAmount ?? ""}
                  unit={mp.formulation === "liquid" ? "mL" : "قرص"}
                  onChange={(v) => {
                    const check = parsePositiveDecimal(v, { allowZero: true });
                    if (v === "" || check.ok) void actions.saveMedicationProfile({ ...mp, prescribedDailyAmount: v === "" ? null : normalizeNumericInput(v) }).then((r) => r.ok && flash("دوز تجویزی ذخیره شد ✓"));
                    else setError("عدد معتبر وارد کنید.");
                  }}
                />
              </Field>
              <Field label="منبع اطلاعات درمانی">
                <SelectField
                  value={mp.infoSource}
                  onChange={(v) => void actions.saveMedicationProfile({ ...mp, infoSource: v }).then((r) => r.ok && flash("منبع اطلاعات ذخیره شد ✓"))}
                  options={(Object.keys(INFO_SOURCE_LABELS) as InfoSource[]).map((s) => ({ value: s, label: INFO_SOURCE_LABELS[s] }))}
                />
              </Field>
              <Button variant="outline" size="sm" onClick={saveMedication}>
                ذخیره پروفایل دارو
              </Button>
            </>
          )}
        </div>
      </SectionCard>

      {/* privacy facts (honest, no fake toggles) */}
      <SectionCard icon="shield" iconTone="bg-primary text-on-primary" title="امنیت و حریم خصوصی" className="mt-4">
        <div className="mt-3 space-y-2">
          <InfoRow icon="lock" label="همهٔ داده‌ها فقط روی همین دستگاه ذخیره می‌شوند" />
          <InfoRow icon="leaf" label="هیچ داده‌ای به هیچ سروری ارسال نمی‌شود — اپ کاملاً آفلاین کار می‌کند" />
          <InfoRow icon="user" label="بدون حساب کاربری، بدون ثبت‌نام، بدون آنالیتیکس" />
        </div>
        <p className="t-label-sm mt-2.5 text-on-surface-variant">
          یادآورها عمداً بدون نام دارو نمایش داده می‌شوند تا حریم خصوصی روی قفل صفحه حفظ شود.
        </p>
      </SectionCard>

      {/* treatment contacts */}
      <SectionCard icon="phone" iconTone="bg-secondary-container text-on-secondary-container" title="تم درمانی و پشتیبانی" className="mt-4">
        <div className="mt-3 space-y-2">
          {data.profile.emergencyContacts.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-card bg-surface-container-low p-3">
              <div>
                <p className="t-label-lg text-on-surface">{c.label}</p>
                <p className="ltr-inline t-body-md text-on-surface-variant">{c.phone}</p>
              </div>
              <button
                aria-label={`حذف ${c.label}`}
                onClick={() => void saveProfilePatch({ emergencyContacts: data.profile.emergencyContacts.filter((x) => x.id !== c.id) })}
                className="text-on-error-container"
              >
                <Icon name="x" size={18} />
              </button>
            </div>
          ))}

          <a
            href="/safety"
            className="flex items-center justify-between rounded-card border border-error/30 bg-error-container/40 px-3 py-3 transition-transform active:scale-[0.99]"
          >
            <span className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-error/15 text-error">
                <Icon name="phone" size={16} />
              </span>
              <span>
                <span className="t-label-lg block font-semibold text-error">اورژانس و راهنمای موارد فوری (۱۱۵)</span>
                <span className="t-label-sm block text-on-surface-variant">پشتیبانی ۲۴ ساعته مراکز درمانی</span>
              </span>
            </span>
            <span className="chip bg-error text-white">فوری</span>
          </a>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <TextField value={contactDraft.label} onChange={(v) => setContactDraft((p) => ({ ...p, label: v }))} placeholder="عنوان (مثلاً دکتر)" />
          <TextField value={contactDraft.phone} onChange={(v) => setContactDraft((p) => ({ ...p, phone: v }))} placeholder="شماره تماس" inputMode="tel" />
        </div>
        <Button variant="outline" size="sm" className="mt-2" onClick={addContact}>
          <Icon name="plus" size={16} />
          افزودن تماس درمان/اضطراری
        </Button>
      </SectionCard>

      {/* reminders (previous capability, restyled) */}
      <SectionCard icon="bell" title="شخصی‌سازی و یادآورها" subtitle="زمان‌های یادآوری و نمایش" className="mt-4">
        <div className="mt-3 space-y-3">
          <ToggleSwitch
            checked={!prefs.muted}
            onChange={(v) => void saveReminders({ ...prefs, muted: !v })}
            label="یادآورها فعال"
            description="متن اعلان‌ها عمداً کلی است (بدون نام دارو) تا حریم خصوصی روی قفل صفحه حفظ شود."
          />
          <ToggleSwitch
            checked={prefs.medication}
            onChange={(v) => void saveReminders({ ...prefs, medication: v })}
            label="یادآور ثبت دارو"
            description={`بر اساس ساعت‌های مصرف: ${prefs.medicationTimes.join("، ") || "—"}`}
          />
          {prefs.medication ? (
            <div className="flex flex-wrap gap-2">
              {prefs.medicationTimes.map((t, i) => (
                <span key={i} className="chip bg-surface-container-high text-on-surface">
                  {t.replace(":", "٫")}
                </span>
              ))}
            </div>
          ) : null}
          <ToggleSwitch
            checked={prefs.checkin}
            onChange={(v) => void saveReminders({ ...prefs, checkin: v })}
            label="یادآور چک‌این روزانه"
          />
          {prefs.checkin ? (
            <Field label="ساعت چک‌این">
              <TimeField value={prefs.checkinTime} onChange={(v) => void saveReminders({ ...prefs, checkinTime: v })} />
            </Field>
          ) : null}
          <ToggleSwitch
            checked={prefs.logReview}
            onChange={(v) => void saveReminders({ ...prefs, logReview: v })}
            label="مرور ثبت‌های روز"
          />
          <Field label="یادآور مرور برنامه (روز قبل)" hint="۰ تا ۱۴ روز قبل از تاریخ مرور برنامه">
            <NumberField
              value={String(prefs.reviewLeadDays)}
              unit="روز"
              onChange={(v) => {
                const n = Number(normalizeNumericInput(v));
                if (v !== "" && Number.isInteger(n) && n >= 0 && n <= 14) void saveReminders({ ...prefs, reviewLeadDays: n });
                else if (v !== "") setError("عددی بین ۰ تا ۱۴ وارد کنید.");
              }}
            />
          </Field>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (!("Notification" in window)) {
                setError("مرورگر شما از اعلان پشتیبانی نمی‌کند.");
                return;
              }
              const perm = await Notification.requestPermission();
              if (perm === "granted") {
                new Notification("یادآور رسا", { body: "اعلان‌های این اپ فعال شد." });
                flash("دسترسی اعلان فعال شد ✓");
              } else {
                setError("دسترسی اعلان داده نشد — یادآورها فقط داخل اپ نمایش داده می‌شوند.");
              }
            }}
          >
            فعال‌سازی اعلان مرورگر
          </Button>
          <p className="t-body-sm text-on-surface-variant">
            محدودیت وب: اعلان فقط وقتی اپ/تب باز یا نصب‌شده (PWA) باشد نشان داده می‌شود؛
            زمان‌بندی پس‌زمینه تضمینی نیاز به سرویس Push دارد که در این نسخه نیست.
          </p>
        </div>
      </SectionCard>

      {/* data ownership + audit */}
      <SectionCard icon="download" title="مالکیت داده‌ها" subtitle="خروجی، پاک‌کردن و شفافیت" className="mt-4">
        <div className="mt-3 space-y-2">
          <button
            onClick={() => setShowAudit((s) => !s)}
            className="flex w-full items-center justify-between rounded-card bg-surface-container-low px-3 py-2.5 text-start transition-transform active:scale-[0.99]"
            aria-expanded={showAudit}
          >
            <span className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card bg-surface-container-high text-on-surface">
                <Icon name="note" size={16} />
              </span>
              <span className="t-label-lg font-semibold text-on-surface">تاریخچه کامل تغییرات (Audit)</span>
            </span>
            <Icon name={showAudit ? "chevron-right" : "chevron-left"} size={15} className="text-on-surface-variant" />
          </button>
          {showAudit ? (
            <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-card bg-surface-container-low p-3">
              {data.auditLogs.length === 0 ? (
                <p className="t-body-md text-on-surface-variant">هنوز رویدادی ثبت نشده است.</p>
              ) : (
                data.auditLogs.slice(0, 30).map((a) => (
                  <p key={a.id} className="t-label-md text-on-surface-variant">
                    <span className="text-on-surface">{faDate(a.at.slice(0, 10))}</span> — {a.summary}
                  </p>
                ))
              )}
              <p className="t-label-sm text-on-surface-variant">
                هر تغییر در این اپ با تاریخ و خلاصه ثبت می‌شود (۳۰ مورد اخیر نمایش داده شده است).
              </p>
            </div>
          ) : null}
          <p className="t-body-md text-on-surface-variant">
            داده‌ها فقط روی این دستگاه ذخیره می‌شوند. خروجی کامل (JSON) یا پاک‌کردن همه‌چیز در اختیار شماست.
          </p>
        </div>
      </SectionCard>

      <button
        onClick={exportJson}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-pill bg-primary py-3.5 text-on-primary transition-transform active:scale-[0.98]"
      >
        <Icon name="download" size={18} />
        <span className="t-title-md font-semibold">دانلود نسخه پشتیبان کامل (JSON)</span>
      </button>

      <button
        onClick={() => setConfirmWipe(true)}
        className="mx-auto mt-4 block t-label-lg font-semibold text-error"
      >
        حذف کامل داده‌های «این حالت» از این دستگاه
      </button>

      <Card className="mt-4 bg-surface-container-low text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="لوگوی رسا" className="mx-auto mb-2 h-12 w-12 opacity-80" />
        <p className="t-label-lg text-on-surface">
          برنامه همراه درمان {APP_NAME} <span className="ltr-inline">({APP_NAME_LATIN})</span>
        </p>
        <p className="t-body-sm text-on-surface-variant">
          نسخه ۰٫۱٫۰ — ابزار پیگیری شخصی؛ جایگزین درمان، تشخیص یا نسخه پزشک نیست.
        </p>
      </Card>

      {error ? <ErrorBox message={error} onClose={() => setError(null)} /> : null}
      {savedMsg ? (
        <div className="fixed inset-x-0 bottom-24 z-50 mx-auto w-fit rounded-pill bg-inverse-surface px-4 py-2 t-label-md text-inverse-on-surface shadow-raised" role="status">
          {savedMsg}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmWipe}
        danger
        title="پاک‌کردن همه داده‌ها"
        body="همه ثبت‌ها، چک‌این‌ها و برنامه‌های «این حالت» برای همیشه حذف می‌شوند و قابل بازگشت نیستند. ابتدا خروجی بگیرید اگر لازم دارید."
        confirmLabel="بله، پاک کن"
        onCancel={() => setConfirmWipe(false)}
        onConfirm={async () => {
          setConfirmWipe(false);
          const res = await actions.wipeAll();
          if (!res.ok) setError(res.error);
          else flash("همه داده‌های این حالت پاک شد.");
        }}
      />
    </>
  );
}
