import type { ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "@/lib/clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  active?: boolean;
}

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-text text-surface border border-text hover:bg-text/90 disabled:bg-text-subtle disabled:border-text-subtle disabled:cursor-not-allowed",
  secondary:
    "bg-surface text-text border border-border hover:bg-surface-muted disabled:text-text-subtle disabled:cursor-not-allowed",
  ghost:
    "bg-transparent text-text border border-transparent hover:bg-surface-muted",
  danger:
    "bg-danger text-surface border border-danger hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
};

const SIZE: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  iconLeft,
  iconRight,
  active,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 cursor-pointer",
        SIZE[size],
        VARIANT[variant],
        active && "bg-text text-surface border-text",
        className,
      )}
      {...rest}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
