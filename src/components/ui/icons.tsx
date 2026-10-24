import type { SVGProps } from "react";

/** Minimal original icon set (stroke, 24px grid) — no external icon lib. */
export type IconName =
  | "home"
  | "pill"
  | "plan"
  | "chart"
  | "gear"
  | "shield"
  | "bell"
  | "plus"
  | "minus"
  | "check"
  | "x"
  | "chevron-left"
  | "chevron-right"
  | "phone"
  | "download"
  | "print"
  | "alert"
  | "heart"
  | "note"
  | "clock"
  | "leaf"
  | "lock"
  | "calendar"
  | "sliders"
  | "sun"
  | "moon"
  | "users"
  | "droplet"
  | "brain"
  | "user"
  | "file"
  | "zap";

const PATHS: Record<IconName, string> = {
  home: "M4 11.5 12 4l8 7.5M6 10v9h12v-9",
  pill: "M10.5 4.5a4.24 4.24 0 0 1 6 6l-6 6a4.24 4.24 0 0 1-6-6l6-6Zm-3 3 6 6",
  plan: "M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1Zm3 5h4",
  chart: "M4 19h16M7 16v-5m5 5V7m5 9v-8",
  gear: "M12 9.5A2.5 2.5 0 1 0 12 14.5 2.5 2.5 0 0 0 12 9.5Zm7 2.5-1.8-.5m-10.4-.5L5 12m7-7-.5 1.8m.5 10.4-.5-1.8m6.7-8.3-1.6 1.1M6.9 7.7 5.3 6.6m10.4 10.4 1.6 1.1M6.9 16.3l-1.6 1.1",
  shield: "M12 4l7 2.5v5c0 4.5-3 7.5-7 8.5-4-1-7-4-7-8.5v-5L12 4Zm-2.5 8 2 2 3.5-4",
  bell: "M6 16v-5a6 6 0 1 1 12 0v5l1.5 2.5h-15L6 16Zm4.5 2.5a1.5 1.5 0 0 0 3 0",
  plus: "M12 5v14M5 12h14",
  minus: "M6 12h12",
  check: "M5 13l4.5 4.5L19 7",
  x: "M6 6l12 12M18 6 6 18",
  "chevron-left": "M14.5 5 8 12l6.5 7",
  "chevron-right": "M9.5 5 16 12l-6.5 7",
  phone: "M6 4h3l1.5 4-2 1.5a12 12 0 0 0 6 6L16 13.5 20 15v3a1.5 1.5 0 0 1-1.7 1.5C10.6 18.7 5.3 13.4 4.5 5.7A1.5 1.5 0 0 1 6 4Z",
  download: "M12 4v11m0 0 4-4m-4 4-4-4M5 20h14",
  print: "M7 8V4h10v4M7 17H5V9h14v8h-2m-10-3h10v6H7v-6Z",
  alert: "M12 5 3 19h18L12 5Zm0 6v4m0 2.5v.5",
  heart: "M12 19s-7-4.3-7-9.3A4 4 0 0 1 12 7a4 4 0 0 1 7 2.7c0 5-7 9.3-7 9.3Z",
  note: "M7 4h10v16l-5-3-5 3V4Zm3 5h4m-4 4h4",
  clock: "M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 3v4l3 2",
  leaf: "M5 19c0-8 5-13 14-14 .5 9-4 14-12 14m-2 0c2-5 5-8 9-10",
  lock: "M7 11V8a5 5 0 0 1 10 0v3m-11 0h12v9H6v-9Zm6 4v2",
  calendar: "M5 6h14v14H5V6Zm3-2v3m8-3v3M5 10h14m-9 4h4",
  sliders: "M5 7h9m3 0h2M5 12h3m3 0h8M5 17h11m3 0h0M14 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM8 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm11 4.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z",
  sun: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8-1.4 1.4m-10 10-1.4 1.4",
  moon: "M19 14.5A8 8 0 0 1 9.5 5 8 8 0 1 0 19 14.5Z",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-5.5 8c.5-3.5 2.5-5 5.5-5s5 1.5 5.5 5m1-13.4a3.5 3.5 0 0 1 0 6.8m1.5 1.7c2 .7 3.2 2.3 3.5 4.9",
  droplet: "M12 4s6 6.3 6 10.3a6 6 0 1 1-12 0C6 10.3 12 4 12 4Z",
  brain: "M9.5 5A3.5 3.5 0 0 0 6 8.5c-2 .5-3 2-3 3.5 0 1.6 1 3 2.5 3.5.2 1.9 1.7 3.5 3.7 3.5 1.3 0 2.3-.6 2.8-1.5V4.9C11.5 5.3 10.6 5 9.5 5Zm5 0A3.5 3.5 0 0 1 18 8.5c2 .5 3 2 3 3.5 0 1.6-1 3-2.5 3.5-.2 1.9-1.7 3.5-3.7 3.5-1.3 0-2.3-.6-2.8-1.5V4.9c.5.4 1.4.1 2.5.1Z",
  user: "M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-7 9c.6-4 3-6 7-6s6.4 2 7 6",
  file: "M7 3h7l4 4v14H7V3Zm7 0v4h4M10 12h5m-5 4h5",
  zap: "M13 3 5 14h6l-1 7 8-11h-6l1-7Z",
};

export function Icon({
  name,
  size = 20,
  ...rest
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
