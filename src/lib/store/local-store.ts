/**
 * Persistence layer. In MVP: explicit two-mode storage.
 *  - "user"  → key `hd:data:user:v1`
 *  - "demo"  → key `hd:data:demo:v1`  (synthetic, always labeled, NEVER mixes
 *              with user data; switching never overwrites the other bucket)
 *
 * The backend adapter (Supabase) implements the same `DataStore` interface
 * once credentials are configured. A failed save NEVER masquerades as
 * success: every method returns `Result`.
 */

import type { AppData, AppMode } from "@/types";

export const SCHEMA_VERSION = 1;

export const STORAGE_KEYS = {
  userData: "hamrah-darman:data:user:v1",
  demoData: "hamrah-darman:data:demo:v1",
  mode: "hamrah-darman:mode",
  onboardingDraft: "hamrah-darman:onboarding-draft",
  swDemoted: "hamrah-darman:sw-opt-out",
} as const;

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<T = never>(error: string): Result<T> {
  return { ok: false, error };
}

export interface DataStore {
  load(): Promise<Result<AppData | null>>;
  save(data: AppData): Promise<Result<null>>;
}

export type LoadFailureReason =
  | "storage-unavailable"
  | "corrupted"
  | "newer-schema"
  | "unknown";

/**
 * localStorage-backed store. Constructor-injected storage keeps it testable
 * (jsdom provides one; unit tests can inject an in-memory fake).
 */
export class LocalStore implements DataStore {
  constructor(
    private storage: Storage | null,
    private key: string,
  ) {}

  async load(): Promise<Result<AppData | null>> {
    if (!this.storage) return err("storage-unavailable");
    let raw: string | null;
    try {
      raw = this.storage.getItem(this.key);
    } catch {
      return err("storage-unavailable");
    }
    if (raw === null) return ok(null);
    try {
      const parsed = JSON.parse(raw) as AppData;
      if (typeof parsed !== "object" || parsed === null || !("schemaVersion" in parsed)) {
        return err("corrupted");
      }
      if (parsed.schemaVersion > SCHEMA_VERSION) return err("newer-schema");
      return ok(parsed);
    } catch {
      return err("corrupted");
    }
  }

  async save(data: AppData): Promise<Result<null>> {
    if (!this.storage) return err("storage-unavailable");
    try {
      this.storage.setItem(this.key, JSON.stringify(data));
      return ok(null);
    } catch {
      return err("save-failed");
    }
  }
}

export function storeKeyForMode(mode: AppMode): string {
  return mode === "demo" ? STORAGE_KEYS.demoData : STORAGE_KEYS.userData;
}

export function storeForMode(mode: AppMode, storage: Storage | null): LocalStore {
  return new LocalStore(storage, storeKeyForMode(mode));
}

/* ------------------------------ onboarding draft ------------------------- */

export function readDraft<T>(storage: Storage | null): T | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEYS.onboardingDraft);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeDraft(storage: Storage | null, draft: unknown): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEYS.onboardingDraft, JSON.stringify(draft));
  } catch {
    // draft is best-effort; never blocks onboarding
  }
}

export function clearDraft(storage: Storage | null): void {
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEYS.onboardingDraft);
  } catch {
    // ignore
  }
}

/* --------------------------------- mode ---------------------------------- */

export function readMode(storage: Storage | null): AppMode | null {
  if (!storage) return null;
  const v = storage.getItem(STORAGE_KEYS.mode);
  return v === "demo" || v === "user" ? v : null;
}

export function writeMode(storage: Storage | null, mode: AppMode): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEYS.mode, mode);
  } catch {
    // ignore
  }
}
