"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";

/** Sub-page header with back action (inside the fixed shell header area). */
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();
  return (
    <div className="mb-4 flex items-start gap-3">
      <button
        onClick={() => router.back()}
        aria-label="بازگشت"
        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface shadow-card hover:bg-surface-container-low"
      >
        <Icon name="chevron-right" size={20} />
      </button>
      <div>
        <h1 className="t-headline-md text-on-surface">{title}</h1>
        {subtitle ? <p className="t-body-md text-on-surface-variant">{subtitle}</p> : null}
      </div>
    </div>
  );
}
