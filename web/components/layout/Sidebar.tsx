"use client";
import {
  LayoutDashboard,
  Vault,
  PieChart,
  Activity,
  ScrollText,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { clsx } from "@/lib/clsx";

const NAV: ReadonlyArray<{
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  active?: boolean;
}> = [
  { id: "overview", label: "overview", icon: LayoutDashboard, active: true },
  { id: "vault", label: "vault", icon: Vault },
  { id: "allocations", label: "allocations", icon: PieChart },
  { id: "activity", label: "activity", icon: Activity },
  { id: "strategy", label: "strategy", icon: ScrollText },
  { id: "settings", label: "settings", icon: ShieldCheck },
];

export function Sidebar() {
  return (
    <aside className="hidden lg:flex w-60 shrink-0 border-r border-border bg-bg-elevated flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-accent rounded-full" />
          <span className="microlabel">agent · vault</span>
        </div>
        <p className="mt-3 text-base font-semibold lowercase">agent rwa</p>
        <p className="text-xs text-text-muted mt-0.5">
          autonomous erc-4626 rebalancer
        </p>
        <p className="text-[11px] text-text-subtle mt-2 font-mono">
          base · sepolia
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        <ul className="px-2 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = item.active;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={!isActive}
                  className={clsx(
                    "group w-full flex items-center gap-2.5 h-9 px-3 rounded-md text-sm relative transition-colors duration-150",
                    isActive
                      ? "text-surface font-medium bg-text"
                      : "text-text-subtle hover:text-text-muted cursor-not-allowed",
                  )}
                  aria-current={isActive ? "page" : undefined}
                  title={!isActive ? "coming soon" : undefined}
                >
                  <Icon size={16} strokeWidth={1.5} />
                  <span className="lowercase">{item.label}</span>
                  {!isActive && (
                    <span className="ml-auto text-[10px] text-text-subtle uppercase tracking-[0.08em]">
                      soon
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-3 py-3 border-t border-border">
        <ConnectButton.Custom>
          {({ account, openConnectModal, openAccountModal, mounted }) => {
            const ready = mounted;
            const connected = ready && account;
            return (
              <button
                type="button"
                onClick={connected ? openAccountModal : openConnectModal}
                className={clsx(
                  "w-full flex items-center gap-2 h-10 px-3 rounded-md text-[13px] font-medium transition-colors duration-150 cursor-pointer",
                  connected
                    ? "bg-surface border border-border text-text hover:bg-surface-muted"
                    : "bg-text text-surface hover:bg-text/90 border border-text",
                )}
              >
                <Wallet size={14} strokeWidth={1.5} className="shrink-0" />
                <span className="truncate font-mono text-[12px] flex-1 text-left min-w-0">
                  {connected ? account.displayName : "connect wallet"}
                </span>
                <span
                  className={clsx(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    connected ? "bg-accent" : "bg-surface/50",
                  )}
                />
              </button>
            );
          }}
        </ConnectButton.Custom>
      </div>
    </aside>
  );
}
