/**
 * Persian RTL rendering & numeric input direction (requirement 11.13).
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NumberField, Chip, PlanStatusBadge } from "@/components/ui/primitives";
import { SafetyNotice } from "@/components/ui/safety-notice";
import { missedDoseGuidance } from "@/lib/safety";

describe("RTL & direction", () => {
  it("numeric input uses the LTR num-input class inside an RTL container", () => {
    render(
      <div dir="rtl">
        <NumberField value="35" onChange={() => {}} unit="mL" />
      </div>,
    );
    const input = document.querySelector("input")!;
    expect(input.closest("[dir='rtl']")).not.toBeNull();
    // .num-input applies `direction: ltr` in globals.css (visual layer).
    expect(input.className).toContain("num-input");
    expect(input.getAttribute("inputmode")).toBe("decimal");
  });

  it("renders Persian safety copy and disclaimer", () => {
    render(<SafetyNotice flag={missedDoseGuidance()} />);
    expect(screen.getByRole("status").textContent).toContain("دوبرابر نکنید");
    expect(screen.getByRole("status").textContent).toContain("تشخیص یا دستور دارویی نیست");
  });

  it("plan status badge shows Persian label", () => {
    render(<PlanStatusBadge status="review-required" />);
    expect(screen.getByText("نیازمند بررسی")).toBeInTheDocument();
  });

  it("chip accepts tone classes without crashing", () => {
    render(<Chip tone="rose">تماس اضطراری</Chip>);
    expect(screen.getByText("تماس اضطراری")).toBeInTheDocument();
  });
});
