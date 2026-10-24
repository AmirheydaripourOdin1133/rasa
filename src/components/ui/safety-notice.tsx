"use client";

import { Icon } from "@/components/ui/icons";
import type { ClinicalFlag } from "@/lib/clinical/rules";

/**
 * Safety / guidance notice. Neutral, nonjudgmental presentation:
 * caution = warm amber (care), urgent = soft error container (never blaring red).
 */
export function SafetyNotice({
  flag,
  onAcknowledge,
}: {
  flag: ClinicalFlag;
  onAcknowledge?: () => void;
}) {
  const urgent = flag.severity === "urgent";
  const styles = urgent
    ? "border-error-container bg-error-container/50 text-on-error-container"
    : "border-tertiary-fixed bg-tertiary-fixed/40 text-tertiary";
  return (
    <div className={`rounded-card border px-4 py-3 ${styles}`} role="status">
      <div className="flex items-start gap-2.5">
        <Icon name={urgent ? "alert" : "shield"} size={20} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="t-label-lg">{flag.title}</p>
          <p className="t-body-md mt-1 opacity-90">{flag.body}</p>
          {flag.disclaimerRequired ? (
            <p className="t-body-sm mt-1.5 opacity-75">
              این پیام تشخیص یا دستور دارویی نیست.
            </p>
          ) : null}
          {onAcknowledge ? (
            <button
              onClick={onAcknowledge}
              className="t-label-md mt-2 rounded-pill border border-current/30 px-3 py-1 hover:brightness-95"
            >
              متوجه شدم
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
