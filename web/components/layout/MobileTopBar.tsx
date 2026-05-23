"use client";
import { usePrivy } from "@privy-io/react-auth";
import {
  Activity,
  LayoutDashboard,
  Menu,
  PieChart,
  ScrollText,
  ShieldCheck,
  Vault,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clsx } from "@/lib/clsx";

const NAV = [
  { href: "/", label: "overview", icon: LayoutDashboard },
  { href: "/vault", label: "vault", icon: Vault },
  { href: "/allocations", label: "allocations", icon: PieChart },
  { href: "/activity", label: "activity", icon: Activity },
  { href: "/strategy", label: "strategy", icon: ScrollText },
  { href: "/settings", label: "settings", icon: ShieldCheck },
] as const;

export function MobileTopBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "/";
  const { ready, authenticated, user, logout } = usePrivy();
  const walletAddress = user?.wallet?.address;

  return (
    <header className="lg:hidden relative flex items-center justify-between gap-3 px-4 h-14 bg-bg-elevated border-b border-border sticky top-0 z-20">
      <button
        type="button"
        className="p-2 -ml-2 text-text-muted hover:text-text"
        aria-label={open ? "close menu" : "open menu"}
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
      </button>
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 bg-accent rounded-full" />
        <span className="microlabel">SerraRWA</span>
      </div>
      <button
        type="button"
        onClick={() => logout()}
        disabled={!ready || !authenticated}
        className={clsx(
          "h-9 px-3 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer font-mono",
          ready && authenticated
            ? "bg-surface border border-border text-text"
            : "bg-text text-surface opacity-80",
        )}
      >
        {walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "wallet"}
      </button>

      {open && (
        <div
          id="mobile-nav"
          className="absolute left-0 right-0 top-full z-30 border-b border-border bg-bg-elevated shadow-lg"
        >
          <nav className="px-3 py-3">
            <div className="grid gap-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "flex items-center gap-2.5 h-10 px-3 rounded-md text-sm transition-colors",
                      active ? "bg-text text-surface font-medium" : "text-text hover:bg-surface-muted",
                    )}
                  >
                    <Icon size={16} strokeWidth={1.5} />
                    <span className="lowercase">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
