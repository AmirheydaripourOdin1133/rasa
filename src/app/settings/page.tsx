"use client";

/**
 * Settings (approved screen 04 style): profile, medication details with
 * source labels, reminders with explicit limits, emergency contacts, data
 * ownership (export / wipe), mode indicator (user vs demo).
 */

import { useState } from "react";
import { useApp } from "@/features/app-store";
import { Card, SectionTitle, Chip, Button, Field, TextField, NumberField, TimeField, ToggleSwitch, SelectField, ConfirmDialog, ErrorBox } from "@/components/ui/primitives";
import { PageHeader } from "@/components/layout/page-header";
import { Icon } from "@/components/ui/icons";
import { faDate } from "@/lib/dates";
import { parsePositiveDecimal, normalizeNumericInput } from "@/lib/medication-units";
import { validateReminderPrefs } from "@/lib/validation/reminders";
import { uid } from "@/lib/store/demo-data";
import { APP_NAME, APP_NAME_LATIN } from "@/lib/store/empty-data";
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
  const [contactDraft, setContactDraft] = useState({ label: "", phone: "" });

  if (!ready || !data) return null;

  const mp = data.medicationProfile;
  const prefs = data.reminders;

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

  return (
    <>
      <PageHeader title="تنظیمات" subtitle="پروفایل، یادآورها و مالکیت داده" />

      {mode === "demo" ? (
        <div className="mb-4 flex items-center justify-between rounded-card bg-tertiary-fixed/40 px-4 py-3">
          <p className="t-body-md text-tertiary">
            <b>حالت نمایشی</b> — همه داده‌ها مصنوعی‌اند و جدای از حالت شخصی ذخیره می‌شوند.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              const res = await actions.setMode("user");
              if (!res.ok) setError(res.error);
            }}
          >
            رفتن به حالت شخصی
          </Button>
        </div>
      ) : null}

      {/* Profile */}
      <Card className="mb-4">
        <SectionTitle icon="heart">پروفایل</SectionTitle>
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
        {data.profile.onboardedAt ? (
          <p className="t-body-sm text-on-surface-variant">
            عضویت از {faDate(data.profile.onboardedAt.slice(0, 10))}
          </p>
        ) : null}
      </Card>

      {/* Medication profile */}
      <Card className="mb-4">
        <SectionTitle icon="pill">پروفایل دارو</SectionTitle>
        {!mp ? (
          <p className="t-body-md text-on-surface-variant">
            پروفایل دارو ساخته نشده — از <a className="underline" href="/onboarding">تنظیم اولیه</a> شروع کنید.
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
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
            {mp.nextReviewDate ? (
              <p className="t-body-sm text-on-surface-variant">بررسی بعدی پروفایل: {faDate(mp.nextReviewDate)}</p>
            ) : null}
            <Button variant="outline" size="sm" onClick={saveMedication}>
              ذخیره پروفایل
            </Button>
          </>
        )}
      </Card>

      {/* Reminders */}
      <Card className="mb-4">
        <SectionTitle icon="bell">یادآورها</SectionTitle>
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
          <div className="mb-3 flex flex-wrap gap-2">
            {prefs.medicationTimes.map((t, i) => (
              <span key={i} className="chip bg-surface-container-high text-on-surface">
                {t}
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
        <p className="t-body-sm text-on-surface-variant">
          محدودیت وب: اعلان فقط وقتی اپ/تب باز یا نصب‌شده (PWA) باشد نشان داده می‌شود؛
          زمان‌بندی پس‌زمینه تضمینی نیاز به سرویس Push دارد که در این نسخه نیست.
        </p>
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
      </Card>

      {/* Emergency contacts */}
      <Card className="mb-4">
        <SectionTitle icon="phone">تماس‌های اضطراری من</SectionTitle>
        <div className="mb-3 flex flex-col gap-2">
          {data.profile.emergencyContacts.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg bg-surface-container-low p-3">
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
        </div>
        <div className="grid grid-cols-2 gap-2">
          <TextField value={contactDraft.label} onChange={(v) => setContactDraft((p) => ({ ...p, label: v }))} placeholder="عنوان (مثلاً دکتر)" />
          <TextField value={contactDraft.phone} onChange={(v) => setContactDraft((p) => ({ ...p, phone: v }))} placeholder="شماره تماس" inputMode="tel" />
        </div>
        <Button variant="danger" size="sm" className="mt-2" onClick={addContact}>
          <Icon name="plus" size={16} />
          افزودن تماس اضطراری
        </Button>
      </Card>

      {/* Data ownership */}
      <Card className="mb-4">
        <SectionTitle icon="download">داده‌های من</SectionTitle>
        <p className="t-body-md mb-3 text-on-surface-variant">
          داده‌ها فقط روی این دستگاه ذخیره می‌شوند. خروجی کامل (JSON) یا پاک‌کردن همه‌چیز در
          اختیار شماست.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportJson}>
            <Icon name="download" size={16} />
            خروجی کامل (JSON)
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirmWipe(true)}>
            پاک‌کردن همه داده‌های این حالت
          </Button>
        </div>
      </Card>

      <Card className="mb-4 bg-surface-container-low text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="لوگوی رسا" className="mx-auto mb-2 h-12 w-12 opacity-80" />
        <p className="t-label-lg text-on-surface">
          {APP_NAME} <span className="ltr-inline">| {APP_NAME_LATIN}</span>
        </p>
        <p className="t-body-sm text-on-surface-variant">
          نسخه ۰٫۱٫۰ (MVP) — ابزار پیگیری؛ جایگزین درمان نیست.
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
