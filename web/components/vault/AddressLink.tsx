"use client";
import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { clsx } from "@/lib/clsx";

interface AddressProps {
  address: string;
  /** Default true: shows copy + basescan icons next to the truncated address. */
  withActions?: boolean;
  /** Override truncation (default 6/4). */
  start?: number;
  end?: number;
  className?: string;
}

export function Address({
  address,
  withActions = true,
  start = 6,
  end = 4,
  className,
}: AddressProps) {
  const [copied, setCopied] = useState(false);
  const truncated =
    address.length > start + end + 3
      ? `${address.slice(0, start)}…${address.slice(-end)}`
      : address;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore copy failure on insecure context */
    }
  };

  return (
    <span className={clsx("inline-flex items-center gap-1.5 font-mono text-sm", className)}>
      <span className="tabular text-text" title={address}>
        {truncated}
      </span>
      {withActions && (
        <>
          <button
            type="button"
            onClick={onCopy}
            className="text-text-subtle hover:text-text transition-colors"
            aria-label={copied ? "copied" : "copy address"}
            title={copied ? "copied!" : "copy"}
          >
            {copied ? (
              <Check size={12} strokeWidth={1.5} className="text-success" />
            ) : (
              <Copy size={12} strokeWidth={1.5} />
            )}
          </button>
          <a
            href={`https://sepolia.basescan.org/address/${address}`}
            target="_blank"
            rel="noreferrer"
            className="text-text-subtle hover:text-text transition-colors"
            aria-label="open in basescan"
            title="basescan ↗"
          >
            <ExternalLink size={12} strokeWidth={1.5} />
          </a>
        </>
      )}
    </span>
  );
}
