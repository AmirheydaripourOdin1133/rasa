import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppProvider } from "@/features/app-store";
import { AppShell } from "@/components/layout/app-shell";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { InstallPrompt } from "@/components/pwa/install-prompt";

/**
 * PeydaFaNum — Persian typeface that renders Latin digits as Persian numerals.
 * Bundled locally (no external font CDN, no runtime network dependency).
 */
const peyda = localFont({
  src: [
    { path: "./fonts/PeydaFaNumWeb-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/PeydaFaNumWeb-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/PeydaFaNumWeb-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/PeydaFaNumWeb-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-peyda",
  display: "swap",
  fallback: ["Tahoma", "Segoe UI", "sans-serif"],
});

export const metadata: Metadata = {
  title: "رسا | RASA — همراه مسیر پایدار بهبود",
  description:
    "ثبت دقیق مصرف، پیگیری برنامه درمان، چک‌این روزانه و راهنمای ایمن — با حفظ کامل حریم خصوصی. جایگزین نظر پزشک نیست.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "رسا",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#003644",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body className={`${peyda.variable} antialiased`}>
        <AppProvider>
          <AppShell>{children}</AppShell>
          <InstallPrompt />
        </AppProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
