import type { ReactNode } from "react";
import { clsx } from "@/lib/clsx";

type Variant =
  | "enabled"
  | "blocked"
  | "ready"
  | "fresh"
  | "empty"
  | "low"
  | "medium"
  | "high"
  | "info"
  | "neutral";

const VARIANT: Record<Variant, string> = {
  enabled: "text-success border-success",
  blocked: "text-danger border-danger",
  ready: "text-text border-border-strong",
  fresh: "text-text-muted border-border",
  empty: "text-text-subtle border-border",
  low: "text-risk-low border-risk-low",
  medium: "text-risk-med border-risk-med",
  high: "text-risk-high border-risk-high",
  info: "text-info border-info",
  neutral: "text-text-muted border-border",
};

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.08em] rounded-sm border bg-transparent",
        VARIANT[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
