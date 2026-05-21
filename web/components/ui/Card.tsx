import type { ReactNode } from "react";
import { clsx } from "@/lib/clsx";

interface CardProps {
  children: ReactNode;
  className?: string;
  span?: 1 | 2 | 3;
  /** Strong black border for the focal card on the page. Use sparingly. */
  featured?: boolean;
  /** Tighter padding for utility cards like ContractCard / OwnerCard. */
  compact?: boolean;
}

interface CardHeaderProps {
  icon: ReactNode;
  title: string;
  badge?: ReactNode;
  /** Right-aligned actions slot, replaces badge if both present. */
  right?: ReactNode;
}

export function Card({
  children,
  className,
  span = 1,
  featured,
  compact,
}: CardProps) {
  const spanClass =
    span === 3 ? "lg:col-span-3" : span === 2 ? "lg:col-span-2" : "";
  return (
    <section
      className={clsx(
        "card-glyph relative bg-surface rounded-lg",
        compact ? "p-4" : "p-6",
        featured ? "border-2 border-text" : "border border-border",
        spanClass,
        className,
      )}
    >
      <span className="glyph-tr">+</span>
      <span className="glyph-bl">+</span>
      {children}
    </section>
  );
}

export function CardHeader({ icon, title, badge, right }: CardHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-border">
      <div className="flex items-center gap-2.5 text-text">
        <span className="text-text">{icon}</span>
        <h2 className="text-base font-medium lowercase">{title}</h2>
      </div>
      {right ?? badge}
    </header>
  );
}
