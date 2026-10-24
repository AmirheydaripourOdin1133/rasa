import type { MetadataRoute } from "next";

/** PWA manifest — served at /manifest.webmanifest by Next.js. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "رسا | RASA — همراه مسیر پایدار بهبود",
    short_name: "رسا",
    description:
      "ثبت دقیق مصرف، پیگیری برنامه درمان و چک‌این روزانه — با حفظ کامل حریم خصوصی.",
    lang: "fa",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f9f9ff",
    theme_color: "#003644",
    categories: ["health", "medical"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "ثبت داروی امروز", url: "/medication" },
      { name: "چک‌این امروز", url: "/checkin" },
    ],
  };
}
