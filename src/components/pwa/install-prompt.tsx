"use client";

/**
 * InstallPrompt — makes the PWA installable entry visible:
 *  - Android / desktop Chrome-family: captures `beforeinstallprompt` and
 *    offers a one-tap «نصب اپ» button.
 *  - iOS Safari: shows the short «افزودن به صفحه اصلی» instruction path.
 *  - Hidden when already running standalone, or dismissed within 30 days.
 */

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icons";
import {
  isStandalone,
  isIOS,
  dismissalActive,
  readDismissedAt,
  writeDismissedAt,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa/install";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [showIosSteps, setShowIosSteps] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const dismissedAt = readDismissedAt();
    if (dismissalActive(Date.now(), dismissedAt)) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS never fires the event — show the manual path instead.
    const t = window.setTimeout(() => {
      if (isIOS()) {
        setIos(true);
        setHidden(false);
      }
    }, 1200);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.clearTimeout(t);
    };
  }, []);

  if (hidden || isStandalone()) return null;

  const dismiss = () => {
    writeDismissedAt(Date.now());
    setHidden(true);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setHidden(true);
    setDeferred(null);
  };

  return (
    <div className="no-print fixed inset-x-0 bottom-24 z-40 mx-auto flex w-[min(92%,30rem)] items-center gap-2 rounded-card border border-secondary/30 bg-surface-container-lowest/95 p-3 shadow-raised backdrop-blur-xl">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-secondary-container text-on-secondary-container">
        <Icon name="download" size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="t-label-lg font-semibold text-on-surface">نصب رسا روی گوشی</p>
        <p className="t-label-sm text-on-surface-variant">
          {ios
            ? "از منوی اشتراک‌گذاری سافاری: «افزودن به صفحه اصلی»"
            : "دسترسی سریع و آفلاین — بدون نیاز به فروشگاه اپ"}
        </p>
      </div>
      {ios ? (
        <button
          onClick={() => setShowIosSteps((s) => !s)}
          className="chip shrink-0 bg-secondary-container text-on-secondary-container"
          aria-expanded={showIosSteps}
        >
          راهنما
        </button>
      ) : (
        <button
          onClick={install}
          disabled={!deferred}
          className="chip shrink-0 bg-primary text-on-primary disabled:opacity-50"
        >
          نصب
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="بستن"
        className="shrink-0 p-1 text-on-surface-variant hover:text-on-surface"
      >
        <Icon name="x" size={16} />
      </button>

      {showIosSteps ? (
        <ol className="t-label-md absolute inset-x-3 top-full mt-1 space-y-1 rounded-card border border-surface-container-high bg-surface-container-lowest p-3 text-on-surface-variant shadow-raised">
          <li>۱. در سافاری روی آیکون «اشتراک‌گذاری» (مربع با فلش بالا) بزنید</li>
          <li>۲. گزینهٔ «افزودن به صفحه اصلی» را انتخاب کنید</li>
          <li>۳. نام «رسا» را تأیید کنید — اپ مثل بقیهٔ اپ‌ها باز می‌شود</li>
        </ol>
      ) : null}
    </div>
  );
}
