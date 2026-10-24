"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icons";
import { faDate } from "@/lib/dates";
import { useApp } from "@/features/app-store";
import { ErrorBox } from "@/components/ui/primitives";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "خانه", icon: "home" },
  { href: "/medication", label: "دارو", icon: "pill" },
  { href: "/plan", label: "برنامه", icon: "plan" },
  { href: "/reports", label: "گزارش", icon: "chart" },
  { href: "/settings", label: "تنظیمات", icon: "gear" },
];

function RasaLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="لوگوی رسا" className="h-9 w-9 rounded-lg" />
      <span className="flex flex-col leading-tight">
        <span className="t-label-lg text-on-surface">
          رسا <span className="ltr-inline text-on-surface-variant">| RASA</span>
        </span>
        {compact ? null : (
          <span className="t-label-sm text-on-surface-variant">همراه مسیر پایدار بهبود</span>
        )}
      </span>
    </span>
  );
}

function Header() {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    setToday(new Date().toISOString().slice(0, 10));
  }, []);
  return (
    <header className="no-print fixed inset-x-0 top-0 z-40 bg-surface/85 pt-safe backdrop-blur-xl shadow-[0_2px_12px_rgba(19,78,94,0.05)]">
      <div className="mx-auto flex h-16 max-w-xl items-center justify-between px-margin-mobile md:px-margin">
        <Link href="/" aria-label="خانه — رسا">
          <RasaLogo />
        </Link>
        {today ? (
          <span className="chip bg-surface-container-high text-on-surface">
            <Icon name="clock" size={14} />
            {faDate(today, { withWeekday: true })}
          </span>
        ) : (
          <span className="chip bg-surface-container-high text-on-surface-variant">…</span>
        )}
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-40 flex justify-center pb-safe"
      aria-label="ناوبری اصلی"
    >
      <div className="mb-3 flex items-center gap-1 rounded-pill bg-inverse-surface px-2 py-1.5 shadow-[0_8px_24px_rgba(19,78,94,0.28)]">
        {NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-14 flex-col items-center gap-0.5 rounded-pill px-3 py-1.5 transition-colors ${
                active
                  ? "bg-inverse-primary/20 text-inverse-primary"
                  : "text-inverse-on-surface/70 hover:text-inverse-on-surface"
              }`}
            >
              <Icon name={item.icon} size={20} />
              <span className="t-label-sm">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { lastError, ready } = useApp();
  const pathname = usePathname();
  const isOnboarding = pathname.startsWith("/onboarding");
  const [dismissed, setDismissed] = useState(false);

  if (isOnboarding) {
    return <div className="min-h-dvh bg-surface">{children}</div>;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <Header />
      {!ready ? (
        <main className="mx-auto w-full max-w-xl px-margin-mobile pt-24 pb-28">
          <div className="card h-40 animate-pulse" aria-hidden="true" />
        </main>
      ) : (
        <main className="mx-auto w-full max-w-xl px-margin-mobile pt-24 pb-32 md:px-margin">
          {lastError && !dismissed ? (
            <ErrorBox message={lastError} onClose={() => setDismissed(true)} />
          ) : null}
          {children}
        </main>
      )}
      <BottomNav />
    </div>
  );
}
