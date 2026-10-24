"use client";

/**
 * App shell — header and bottom navigation following the approved design:
 *  - header: starburst mark (visual left), centered stack (امن badge, brand,
 *    per-page subtitle), leaf action (visual right);
 *  - bottom nav: 4 light tabs — خانه / ثبت مصرف / گزارش و روند / پروفایل
 *    (برنامه و ایمنی stay reachable from dashboard + profile content links).
 */

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icons";
import { useApp } from "@/features/app-store";
import { ErrorBox, PageLoading } from "@/components/ui/primitives";

const PAGE_SUBTITLES: { prefix: string; label: string }[] = [
  { prefix: "/medication", label: "ثبت مصرف" },
  { prefix: "/reports", label: "گزارش و روند درمان" },
  { prefix: "/settings", label: "پروفایل" },
  { prefix: "/plan", label: "برنامه درمان" },
  { prefix: "/safety", label: "ایمنی و پشتیبانی" },
  { prefix: "/checkin", label: "چک‌این روزانه" },
  { prefix: "/", label: "داشبورد روزانه" },
];

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "خانه", icon: "home" },
  { href: "/medication", label: "ثبت مصرف", icon: "pill" },
  { href: "/reports", label: "گزارش و روند", icon: "chart" },
  { href: "/settings", label: "پروفایل", icon: "user" },
];

function subtitleFor(pathname: string): string {
  return PAGE_SUBTITLES.find((p) => pathname.startsWith(p.prefix))?.label ?? "داشبورد روزانه";
}

function Header({ pathname }: { pathname: string }) {
  return (
    <header className="no-print fixed inset-x-0 top-0 z-40 border-b border-outline-variant/40 bg-surface/90 pt-safe backdrop-blur-xl">
      <div className="mx-auto flex h-[64px] max-w-xl items-center justify-between px-margin-mobile md:px-margin">
        {/* visual right (RTL start): leaf action */}
        <Link
          href="/reports"
          aria-label="گزارش و روند درمان"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container/70 text-on-secondary-container transition-transform active:scale-95"
        >
          <Icon name="leaf" size={19} />
        </Link>

        {/* centered brand stack */}
        <div className="flex flex-col items-center leading-tight">
          <span className="mb-0.5 flex items-center gap-1 rounded-pill bg-secondary-container/60 px-2 py-px text-on-secondary-container">
            <Icon name="lock" size={11} />
            <span className="t-label-sm font-semibold">امن</span>
          </span>
          <span className="t-title-md font-bold text-on-surface">
            رسا <span className="ltr-inline text-on-surface-variant">| RASA</span>
          </span>
          <span className="t-label-sm text-on-surface-variant">{subtitleFor(pathname)}</span>
        </div>

        {/* visual left (RTL end): starburst mark */}
        <Link href="/" aria-label="خانه — رسا" className="transition-transform active:scale-95">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="h-9 w-9" />
        </Link>
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant/40 bg-surface/95 pb-safe backdrop-blur-xl"
      aria-label="ناوبری اصلی"
    >
      <div className="mx-auto flex max-w-xl items-stretch justify-around px-2 py-1.5">
        {NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-16 flex-col items-center gap-1 rounded-card px-3 py-1.5 transition-colors ${
                active ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span
                className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
                  active ? "bg-secondary-container/80 text-on-secondary-container" : ""
                }`}
              >
                <Icon name={item.icon} size={20} />
              </span>
              <span className="t-label-sm font-medium">{item.label}</span>
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
      <Header pathname={pathname} />
      <main className="mx-auto w-full max-w-xl flex-1 px-margin-mobile pt-[88px] pb-28 md:px-margin">
        {!ready ? (
          <PageLoading />
        ) : (
          <>
            {lastError && !dismissed ? (
              <ErrorBox message={lastError} onClose={() => setDismissed(true)} />
            ) : null}
            {children}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
