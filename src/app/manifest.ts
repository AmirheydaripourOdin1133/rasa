import type { MetadataRoute } from "next";

/** PWA manifest — served at /manifest.webmanifest by Next.js. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "رسا | RASA — همراه مسیر پایدار بهبود",
    short_name: "رسا",
    description:
      "ثبت دقیق مصرف، پیگیری برنامه درمان و چک‌این روزانه — با حفظ کامل حریم خصوصی.",
    lang: "fa",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    launch_handler: { client_mode: "navigate-existing" },
    prefer_related_applications: false,
    background_color: "#f9f9ff",
    theme_color: "#003644",
    categories: ["health", "medical"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      { name: "ثبت داروی امروز", url: "/medication", description: "ثبت مصرف نوبت امروز" },
      { name: "چک‌این امروز", url: "/checkin", description: "ثبت حال و علائم امروز" },
      { name: "گزارش و روند", url: "/reports", description: "نمودار‌ها و خلاصه شاخص‌ها" },
    ],
  };
}
