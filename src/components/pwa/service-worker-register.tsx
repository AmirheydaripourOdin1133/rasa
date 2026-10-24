"use client";

import { useEffect, useState } from "react";

/**
 * Registers the PWA service worker. Kept deliberately minimal: offline shell
 * caching only. Background push scheduling is NOT implemented — reminders
 * work while the app/tab is open; this limitation is documented in the README
 * and surfaced in Settings.
 */
export function ServiceWorkerRegister() {
  const [registered, setRegistered] = useState(false);
  useEffect(() => {
    if (registered) return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return;
    const id = window.setTimeout(() => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then(() => setRegistered(true))
        .catch(() => setRegistered(true)); // non-fatal
    }, 1200);
    return () => window.clearTimeout(id);
  }, [registered]);
  return null;
}
