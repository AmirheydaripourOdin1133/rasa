"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "inverse";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-container active:opacity-90 shadow-[0_4px_16px_rgba(19,78,94,0.25)]",
  secondary:
    "bg-secondary-container text-on-secondary-container hover:brightness-95 active:brightness-90",
  outline:
    "bg-surface-container-lowest text-on-surface border border-outline-variant hover:bg-surface-container-low",
  ghost: "bg-transparent text-secondary hover:bg-surface-container-low",
  danger:
    "bg-rose-soft text-rose-ink border border-rose-border hover:brightness-97",
  inverse:
    "bg-inverse-surface text-inverse-on-surface hover:opacity-90",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1",
  md: "h-11 px-5 text-sm gap-1.5",
  lg: "h-13 px-6 text-base gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  full = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-pill font-semibold transition-[background,filter,opacity] duration-150 disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${full ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
