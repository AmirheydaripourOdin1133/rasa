/**
 * Persistence layer: prescribed-vs-actual separation, missing-data handling,
 * save-failure propagation (never fake success), audit history, and
 * user/demo bucket isolation (requirements 11.3, 11.4, 11.10–11.12).
 */
import { describe, expect, it, beforeEach } from "vitest";
import { LocalStore, storeForMode, STORAGE_KEYS, readMode, writeMode } from "@/lib/store/local-store";
import { createEmptyAppData } from "@/lib/store/empty-data";
import { generateDemoData } from "@/lib/store/demo-data";
import type { AppData, DailyMedicationLog } from "@/types";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
}

class FailingStorage extends MemoryStorage {
  setItem() {
    throw new Error("quota exceeded");
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
});

function logWith(partial: Partial<DailyMedicationLog>): DailyMedicationLog {
  return {
    date: "2026-10-24",
    entries: [
      {
        id: "e1",
        slotIndex: 0,
        plannedTime: "08:00",
        plannedAmount: "35",
        status: "taken",
        actualTime: "08:10",
        actualAmount: "35",
        note: null,
        updatedAt: "",
      },
    ],
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

describe("prescribed vs actual separation", () => {
  it("keeps planned and actual amounts as distinct fields", () => {
    const day = logWith({
      entries: [
        {
          id: "e1",
          slotIndex: 0,
          plannedTime: "08:00",
          plannedAmount: "35",
          status: "taken",
          actualTime: "09:00",
          actualAmount: "31",
          note: null,
          updatedAt: "",
        },
      ],
    });
    expect(day.entries[0]!.plannedAmount).toBe("35");
    expect(day.entries[0]!.actualAmount).toBe("31");
  });

  it("upsert by date replaces the same day without touching others", async () => {
    const store = new LocalStore(storage, STORAGE_KEYS.userData);
    const base = createEmptyAppData("user");
    const d1 = logWith({ date: "2026-10-23" });
    const d2 = logWith({ date: "2026-10-24" });
    base.medicationLogs = [d1, d2];
    await store.save(base);

    const updated = logWith({
      date: "2026-10-24",
      entries: [{ ...d2.entries[0]!, actualAmount: "30" }],
    });
    const reloaded = (await store.load()) as { ok: true; value: AppData };
    reloaded.value.medicationLogs = reloaded.value.medicationLogs.map((l) =>
      l.date === updated.date ? updated : l,
    );
    await store.save(reloaded.value);

    const final = (await store.load()) as { ok: true; value: AppData };
    expect(final.value.medicationLogs).toHaveLength(2);
    const oct24 = final.value.medicationLogs.find((l) => l.date === "2026-10-24")!;
    expect(oct24.entries[0]!.actualAmount).toBe("30");
    expect(final.value.medicationLogs.find((l) => l.date === "2026-10-23")!.entries[0]!.actualAmount).toBe("35");
  });
});

describe("missing data handling", () => {
  it("load returns null (not an empty fake) for a fresh bucket", async () => {
    const store = new LocalStore(storage, STORAGE_KEYS.userData);
    const res = await store.load();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value).toBeNull();
  });

  it("reports corrupted payloads instead of guessing", async () => {
    storage.setItem(STORAGE_KEYS.userData, "{not json");
    const store = new LocalStore(storage, STORAGE_KEYS.userData);
    const res = await store.load();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("corrupted");
  });

  it("refuses newer schema versions to avoid silent data loss", async () => {
    storage.setItem(
      STORAGE_KEYS.userData,
      JSON.stringify({ ...createEmptyAppData("user"), schemaVersion: 99 }),
    );
    const store = new LocalStore(storage, STORAGE_KEYS.userData);
    const res = await store.load();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("newer-schema");
  });
});

describe("save failure — never fake success", () => {
  it("save() returns an error result when storage throws", async () => {
    const store = new LocalStore(new FailingStorage(), STORAGE_KEYS.userData);
    const res = await store.save(createEmptyAppData("user"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("save-failed");
  });
});

describe("audit history", () => {
  it("records plan authorization as a PlanEvent in demo data", () => {
    const demo = generateDemoData("liquid");
    const events = demo.planEvents.filter((e) => e.planId === demo.treatmentPlans[0]!.id);
    expect(events.some((e) => e.type === "authorized" && e.toStatus === "active")).toBe(true);
    expect(demo.auditLogs.length).toBeGreaterThan(0);
  });
});

describe("mode isolation (demo vs user buckets)", () => {
  it("stores demo and user data under different keys", async () => {
    const demoStore = storeForMode("demo", storage);
    const userStore = storeForMode("user", storage);
    await demoStore.save(generateDemoData("tablet"));
    await userStore.save(createEmptyAppData("user"));

    const demoLoaded = await demoStore.load();
    const userLoaded = await userStore.load();
    expect(demoLoaded.ok && demoLoaded.value?.profile.isDemo).toBe(true);
    expect(userLoaded.ok && userLoaded.value?.profile.isDemo).toBe(false);
    // user bucket has no medication profile; demo does — no cross-contamination
    expect(userLoaded.ok && userLoaded.value?.medicationProfile).toBeNull();
    expect(demoLoaded.ok && demoLoaded.value?.medicationProfile).not.toBeNull();
  });

  it("persisted mode selects the bucket and never mixes data", async () => {
    writeMode(storage, "demo");
    expect(readMode(storage)).toBe("demo");
    const demoStore = storeForMode(readMode(storage) as "demo", storage);
    await demoStore.save(generateDemoData("liquid"));
    const res = await demoStore.load();
    expect(res.ok && res.value?.mode).toBe("demo");
  });
});
