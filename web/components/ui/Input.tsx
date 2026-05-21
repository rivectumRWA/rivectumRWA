import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { clsx } from "@/lib/clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  suffix?: ReactNode;
  mono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { suffix, mono, className, ...rest },
  ref,
) {
  return (
    <div
      className={clsx(
        "flex items-center h-11 w-full rounded-md border border-border bg-surface focus-within:bg-surface-muted focus-within:border-text transition-colors duration-150",
        className,
      )}
    >
      <input
        ref={ref}
        className={clsx(
          "flex-1 h-full bg-transparent px-3 outline-none text-text placeholder:text-text-subtle text-sm tabular",
          mono && "font-mono",
        )}
        {...rest}
      />
      {suffix && (
        <span className="microlabel pr-3">{suffix}</span>
      )}
    </div>
  );
});
