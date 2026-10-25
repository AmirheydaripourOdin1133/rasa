/**
 * PWA install helpers — pure logic separated from UI for testability.
 * The app is installable on Android/desktop Chrome via `beforeinstallprompt`
 * and on iOS Safari via "Add to Home Screen" (apple-touch-icon + appleWebApp).
 */

export const INSTALL_DISMISS_KEY = "rasa-install-dismissed-at";
/** Re-show the banner after 30 days. */
export const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** True when the app already runs as an installed PWA. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return window.matchMedia?.("(display-mode: standalone)").matches ?? false;
}

/** iOS Safari cannot fire `beforeinstallprompt`; it needs manual steps. */
export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document);
}

/** Banner dismissed recently (within TTL)? */
export function dismissalActive(now: number, dismissedAt: number | null): boolean {
  if (dismissedAt === null) return false;
  return now - dismissedAt < DISMISS_TTL_MS;
}

export function readDismissedAt(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(INSTALL_DISMISS_KEY);
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function writeDismissedAt(now: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INSTALL_DISMISS_KEY, String(now));
}
