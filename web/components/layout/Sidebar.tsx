"use client";
import {
  LayoutDashboard,
  Vault,
  PieChart,
  Activity,
  ScrollText,
  ShieldCheck,
  Wallet,
  Library,
  Sparkles,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { clsx } from "@/lib/clsx";

interface NavItem {
  id: string;
  label?: string;
  separatorLabel?: string;
  icon?: typeof LayoutDashboard;
  href?: string;
  action?: () => void;
}

const NAV: ReadonlyArray<NavItem> = [
  { id: "sep-protocol", separatorLabel: "protocol" },
  { id: "overview", label: "overview", icon: LayoutDashboard, href: "/" },
  { id: "vault", label: "vault", icon: Vault, href: "/vault" },
  { id: "allocations", label: "allocations", icon: PieChart, href: "/allocations" },
  { id: "activity", label: "activity", icon: Activity, href: "/activity" },
  { id: "strategy", label: "strategy", icon: ScrollText, href: "/strategy" },
  { id: "risk", label: "risk", icon: AlertTriangle, href: "/risk" },
  { id: "sep-reference", separatorLabel: "reference" },
  { id: "registry", label: "registry", icon: Library, href: "/registry" },
  { id: "sep-system", separatorLabel: "system" },
  { id: "settings", label: "settings", icon: ShieldCheck, href: "/settings" },
  { id: "analytics", label: "analytics", icon: BarChart3, href: "/analytics" },
  { id: "copilot", label: "copilot", icon: Sparkles, action: copilotAction },
];

function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.action) return false;
  if (!item.href) return false;
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function copilotAction() {
  window.dispatchEvent(new CustomEvent("serra-copilot-toggle"));
}

export function Sidebar() {
  const pathname = usePathname() ?? "/";
  const { ready, authenticated, user, logout } = usePrivy();
  const walletAddress = user?.wallet?.address;
  return (
    <aside className="hidden lg:flex w-60 shrink-0 border-r border-border bg-bg-elevated flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-accent rounded-full" />
          <span className="microlabel">SerraRWA</span>
        </div>
        <p className="mt-3 text-base font-semibold">SerraRWA</p>
        <p className="text-xs text-text-muted mt-0.5">
          autonomous RWA allocation protocol
        </p>
        <p className="text-[11px] text-text-subtle mt-2 font-mono">
          base · sepolia
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        <ul className="px-2 space-y-0.5">
          {NAV.map((item) => {
            // Separator
            if (item.separatorLabel) {
              return (
                <li key={item.id} className="pt-5 first:pt-1 pb-1">
                  <span className="block px-3 text-[10px] font-mono uppercase tracking-[0.1em] text-text-subtle">
                    {item.separatorLabel}
                  </span>
                </li>
              );
            }

            const Icon = item.icon!;
            const enabled = !!item.href || !!item.action;
            const isActive = enabled && isItemActive(item, pathname);
            const baseClasses = clsx(
              "group w-full flex items-center gap-2.5 h-9 px-3 rounded-md text-sm relative transition-colors duration-150",
              isActive
                ? "text-surface font-medium bg-text"
                : enabled
                  ? "text-text hover:bg-surface-muted cursor-pointer"
                  : "text-text-subtle cursor-not-allowed",
            );
            const inner = (
              <>
                <Icon size={16} strokeWidth={1.5} />
                <span className="lowercase">{item.label}</span>
                {!enabled && (
                  <span className="ml-auto text-[10px] text-text-subtle uppercase tracking-[0.08em]">
                    soon
                  </span>
                )}
              </>
            );

            if (item.action) {
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={item.action}
                    className={baseClasses}
                  >
                    {inner}
                  </button>
                </li>
              );
            }

            return (
              <li key={item.id}>
                {enabled ? (
                  <Link
                    href={item.href!}
                    aria-current={isActive ? "page" : undefined}
                    className={baseClasses}
                  >
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className={baseClasses}
                    title="coming soon"
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-3 py-3 border-t border-border">
        <button
          type="button"
          onClick={() => logout()}
          disabled={!ready || !authenticated}
          className={clsx(
            "w-full flex items-center gap-2 h-10 px-3 rounded-md text-[13px] font-medium transition-colors duration-150 cursor-pointer",
            ready && authenticated
              ? "bg-surface border border-border text-text hover:bg-surface-muted"
              : "bg-text text-surface opacity-80",
          )}
        >
          <Wallet size={14} strokeWidth={1.5} className="shrink-0" />
          <span className="truncate font-mono text-[12px] flex-1 text-left min-w-0">
            {walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "wallet connected"}
          </span>
          <span
            className={clsx(
              "w-1.5 h-1.5 rounded-full shrink-0",
              ready && authenticated ? "bg-accent" : "bg-surface/50",
            )}
          />
        </button>
      </div>
    </aside>
  );
}
