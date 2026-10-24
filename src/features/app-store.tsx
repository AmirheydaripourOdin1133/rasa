"use client";

/**
 * App-wide state: explicit two-mode data (user / demo), persistence through
 * DataStore, audit trail, and strict "never fake success" error handling.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AppData,
  AppMode,
  AuditLog,
  DailyMedicationLog,
  MedicationProfile,
  PlanEvent,
  PlanStatus,
  Profile,
  ReminderPrefs,
  SafetyEvent,
  SymptomLog,
  TreatmentPlan,
} from "@/types";
import {
  err,
  ok,
  readMode,
  storeForMode,
  writeMode,
  clearDraft,
  type Result,
} from "@/lib/store/local-store";
import { createEmptyAppData } from "@/lib/store/empty-data";
import { generateDemoData, uid } from "@/lib/store/demo-data";
import { validateTransition } from "@/lib/plan/status";

export interface OnboardingPayload {
  profile: Partial<Profile>;
  medicationProfile: MedicationProfile | null;
  plan: TreatmentPlan | null;
  reminders: ReminderPrefs | null;
}

export interface AppActions {
  hydrate(): Promise<void>;
  setMode(mode: AppMode): Promise<Result<null>>;
  /** Creates fresh synthetic demo data in the demo bucket ONLY. */
  enterDemo(formulation: "liquid" | "tablet"): Promise<Result<null>>;
  resetDemo(): Promise<Result<null>>;
  wipeAll(): Promise<Result<null>>;
  /** First-time setup: builds the initial user-bucket document atomically. */
  completeOnboarding(payload: OnboardingPayload): Promise<Result<null>>;
  updateProfile(patch: Partial<Profile>): Promise<Result<null>>;
  saveMedicationProfile(next: MedicationProfile): Promise<Result<null>>;
  upsertMedicationLog(day: DailyMedicationLog): Promise<Result<null>>;
  upsertSymptomLog(log: SymptomLog): Promise<Result<null>>;
  savePlan(
    plan: TreatmentPlan,
    eventType: PlanEvent["type"],
    summary: string,
  ): Promise<Result<null>>;
  transitionPlan(planId: string, to: PlanStatus, note: string): Promise<Result<null>>;
  updateReminders(prefs: ReminderPrefs): Promise<Result<null>>;
  addSafetyEvent(type: SafetyEvent["type"], detail: string): Promise<Result<null>>;
}

interface AppContextValue {
  data: AppData | null;
  ready: boolean;
  mode: AppMode | null;
  lastError: string | null;
  actions: AppActions;
}

const AppContext = createContext<AppContextValue | null>(null);

function auditEntry(
  action: string,
  entity: string,
  entityId: string | null,
  summary: string,
  now = new Date(),
): AuditLog {
  return { id: uid(), at: now.toISOString(), action, entity, entityId, summary };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setModeState] = useState<AppMode | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const storageRef = useRef<Storage | null>(null);

  useEffect(() => {
    try {
      storageRef.current = window.localStorage;
    } catch {
      storageRef.current = null;
    }
  }, []);

  const commit = useCallback(
    async (next: AppData, extraAudit?: AuditLog): Promise<Result<null>> => {
      const storage = storageRef.current;
      if (mode === null) return err("mode-not-initialized");
      const store = storeForMode(mode, storage);
      const withAudit: AppData = extraAudit
        ? { ...next, auditLogs: [extraAudit, ...next.auditLogs].slice(0, 500) }
        : next;
      const res = await store.save(withAudit);
      if (!res.ok) {
        setLastError("ذخیره‌سازی ناموفق بود: " + res.error);
        return err("ذخیره‌سازی ناموفق بود (" + res.error + "). تغییرات اعمال نشد.");
      }
      setLastError(null);
      setData(withAudit);
      return ok(null);
    },
    [mode],
  );

  const loadMode = useCallback(async (target: AppMode): Promise<Result<AppData | null>> => {
    const storage = storageRef.current;
    const store = storeForMode(target, storage);
    const res = await store.load();
    if (!res.ok) return res;
    return ok(res.value);
  }, []);

  const hydrate = useCallback(async () => {
    const storage = storageRef.current;
    const m = readMode(storage) ?? "user";
    const res = await loadMode(m);
    if (!res.ok) {
      setLastError("خواندن داده‌ها ناموفق بود: " + res.error);
      setModeState(m);
      setReady(true);
      return;
    }
    let loaded = res.value;
    // Demo bucket self-heals: synthetic data is generated on first use.
    if (m === "demo" && loaded === null) {
      loaded = generateDemoData("liquid");
      const store = storeForMode(m, storage);
      const saveRes = await store.save(loaded);
      if (!saveRes.ok) {
        setLastError("تولید داده نمایشی ناموفق بود: " + saveRes.error);
      }
    }
    setModeState(m);
    setData(loaded);
    setReady(true);
  }, [loadMode]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const actions = useMemo<AppActions>(() => {
    return {
      hydrate,

      async setMode(target) {
        const res = await loadMode(target);
        if (!res.ok) return err("خواندن داده‌های حالت «" + (target === "demo" ? "نمایشی" : "شخصی") + "» ناموفق بود.");
        const storage = storageRef.current;
        let loaded = res.value;
        if (target === "demo" && loaded === null) {
          loaded = generateDemoData("liquid");
          const store = storeForMode(target, storage);
          const saveRes = await store.save(loaded);
          if (!saveRes.ok) return err("تولید داده نمایشی ناموفق بود.");
        }
        writeMode(storage, target);
        setModeState(target);
        setData(loaded);
        setLastError(null);
        return ok(null);
      },

      async enterDemo(formulation) {
        const storage = storageRef.current;
        const demo = generateDemoData(formulation);
        const store = storeForMode("demo", storage);
        const saveRes = await store.save(demo);
        if (!saveRes.ok) return err("تولید داده نمایشی ناموفق بود: " + saveRes.error);
        writeMode(storage, "demo");
        setModeState("demo");
        setData(demo);
        setLastError(null);
        return ok(null);
      },

      async resetDemo() {
        const demo = generateDemoData("liquid");
        return commit(demo, auditEntry("demo.reset", "appData", null, "داده نمایشی بازتولید شد."));
      },

      async wipeAll() {
        if (mode === null) return err("mode-not-initialized");
        const fresh = createEmptyAppData(mode);
        const res = await commit(fresh, auditEntry("data.wiped", "appData", null, "همه داده‌های این حالت پاک شد."));
        if (res.ok) clearDraft(storageRef.current);
        return res;
      },

      async completeOnboarding(payload) {
        const storage = storageRef.current;
        const base = createEmptyAppData("user");
        const now = new Date();
        const next: AppData = {
          ...base,
          profile: {
            ...base.profile,
            ...payload.profile,
            onboardedAt: now.toISOString(),
            isDemo: false,
          },
          medicationProfile: payload.medicationProfile,
          treatmentPlans: payload.plan ? [payload.plan] : [],
          planEvents:
            payload.plan
              ? [
                  {
                    id: uid(),
                    planId: payload.plan.id,
                    type: "created",
                    fromStatus: null,
                    toStatus: payload.plan.status,
                    summary: "ایجاد برنامه در تنظیم اولیه",
                    at: now.toISOString(),
                  },
                ]
              : [],
          reminders: payload.reminders ?? base.reminders,
        };
        if (payload.medicationProfile) {
          next.reminders = {
            ...next.reminders,
            medication: true,
            medicationTimes: payload.medicationProfile.administrationTimes,
          };
        }
        const store = storeForMode("user", storage);
        const saveRes = await store.save(next);
        if (!saveRes.ok) {
          setLastError("ذخیره تنظیمات اولیه ناموفق بود: " + saveRes.error);
          return err("ذخیره تنظیمات اولیه ناموفق بود — دوباره تلاش کنید.");
        }
        clearDraft(storage);
        writeMode(storage, "user");
        setModeState("user");
        setData(next);
        setLastError(null);
        return ok(null);
      },

      async updateProfile(patch) {
        if (!data) return err("داده‌ها هنوز آماده نیستند.");
        const nextProfile: Profile = { ...data.profile, ...patch, updatedAt: new Date().toISOString() };
        return commit(
          { ...data, profile: nextProfile },
          auditEntry("profile.updated", "profile", null, "پروفایل به‌روزرسانی شد."),
        );
      },

      async saveMedicationProfile(next) {
        if (!data) return err("داده‌ها هنوز آماده نیستند.");
        const prev = data.medicationProfile;
        const changes: string[] = [];
        if (prev) {
          if (prev.prescribedDailyAmount !== next.prescribedDailyAmount)
            changes.push("دوز تجویزی ثبت‌شده");
          if (prev.tabletStrengthMg !== next.tabletStrengthMg) changes.push("قدرت قرص");
          if (prev.concentrationMgPerMl !== next.concentrationMgPerMl) changes.push("غلظت");
          if (prev.administrationTimes.join(",") !== next.administrationTimes.join(","))
            changes.push("ساعت‌های مصرف");
        }
        const summary = changes.length
          ? `پروفایل دارو به‌روزرسانی شد: ${changes.join("، ")}.`
          : "پروفایل دارو به‌روزرسانی شد.";
        return commit(
          { ...data, medicationProfile: { ...next, updatedAt: new Date().toISOString() } },
          auditEntry("medication_profile.updated", "medicationProfile", next.id, summary),
        );
      },

      async upsertMedicationLog(day) {
        if (!data) return err("داده‌ها هنوز آماده نیستند.");
        const others = data.medicationLogs.filter((l) => l.date !== day.date);
        const sorted = [...others, { ...day, updatedAt: new Date().toISOString() }].sort((a, b) =>
          a.date.localeCompare(b.date),
        );
        return commit(
          { ...data, medicationLogs: sorted },
          auditEntry("med_log.upserted", "dailyMedicationLog", day.date, `ثبت داروی ${day.date} ذخیره شد.`),
        );
      },

      async upsertSymptomLog(log) {
        if (!data) return err("داده‌ها هنوز آماده نیستند.");
        const others = data.symptomLogs.filter((l) => l.date !== log.date);
        const sorted = [...others, { ...log, updatedAt: new Date().toISOString() }].sort((a, b) =>
          a.date.localeCompare(b.date),
        );
        return commit(
          { ...data, symptomLogs: sorted },
          auditEntry("symptom_log.upserted", "dailySymptomLog", log.date, `چک‌این ${log.date} ذخیره شد.`),
        );
      },

      async savePlan(plan, eventType, summary) {
        if (!data) return err("داده‌ها هنوز آماده نیستند.");
        const exists = data.treatmentPlans.some((p) => p.id === plan.id);
        const plans = exists
          ? data.treatmentPlans.map((p) => (p.id === plan.id ? plan : p))
          : [plan, ...data.treatmentPlans];
        const event: PlanEvent = {
          id: uid(),
          planId: plan.id,
          type: eventType,
          fromStatus: eventType === "created" ? null : plan.status,
          toStatus: plan.status,
          summary,
          at: new Date().toISOString(),
        };
        return commit(
          { ...data, treatmentPlans: plans, planEvents: [event, ...data.planEvents] },
          auditEntry("plan.saved", "treatmentPlan", plan.id, summary),
        );
      },

      async transitionPlan(planId, to, note) {
        if (!data) return err("داده‌ها هنوز آماده نیستند.");
        const plan = data.treatmentPlans.find((p) => p.id === planId);
        if (!plan) return err("برنامه موردنظر پیدا نشد.");
        const check = validateTransition(plan.status, to);
        if (!check.ok) return err(check.error);
        const updated: TreatmentPlan = {
          ...plan,
          status: to,
          updatedAt: new Date().toISOString(),
        };
        const event: PlanEvent = {
          id: uid(),
          planId,
          type: "status-changed",
          fromStatus: plan.status,
          toStatus: to,
          summary: note || `تغییر وضعیت به «${to}»`,
          at: new Date().toISOString(),
        };
        return commit(
          {
            ...data,
            treatmentPlans: data.treatmentPlans.map((p) => (p.id === planId ? updated : p)),
            planEvents: [event, ...data.planEvents],
          },
          auditEntry("plan.status_changed", "treatmentPlan", planId, event.summary),
        );
      },

      async updateReminders(prefs) {
        if (!data) return err("داده‌ها هنوز آماده نیستند.");
        return commit(
          { ...data, reminders: prefs },
          auditEntry("reminders.updated", "reminders", null, "تنظیمات یادآور ذخیره شد."),
        );
      },

      async addSafetyEvent(type, detail) {
        if (!data) return err("داده‌ها هنوز آماده نیستند.");
        const ev: SafetyEvent = { id: uid(), type, at: new Date().toISOString(), detail };
        return commit({ ...data, safetyEvents: [ev, ...data.safetyEvents].slice(0, 200) });
      },
    };
  }, [data, commit, hydrate, loadMode, mode]);

  const value = useMemo<AppContextValue>(
    () => ({ data, ready, mode, lastError, actions }),
    [data, ready, mode, lastError, actions],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
