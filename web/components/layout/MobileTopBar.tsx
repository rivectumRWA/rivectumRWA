"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Menu } from "lucide-react";
import { clsx } from "@/lib/clsx";

export function MobileTopBar() {
  return (
    <header className="lg:hidden flex items-center justify-between gap-3 px-4 h-14 bg-bg-elevated border-b border-border sticky top-0 z-10">
      <button
        type="button"
        className="p-2 -ml-2 text-text-muted hover:text-text"
        aria-label="open menu (coming soon)"
        disabled
      >
        <Menu size={18} strokeWidth={1.5} />
      </button>
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 bg-accent rounded-full" />
        <span className="microlabel">agent · vault</span>
      </div>
      <ConnectButton.Custom>
        {({ account, openConnectModal, openAccountModal, mounted }) => {
          const ready = mounted;
          const connected = ready && account;
          return (
            <button
              type="button"
              onClick={connected ? openAccountModal : openConnectModal}
              className={clsx(
                "h-9 px-3 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer font-mono",
                connected
                  ? "bg-surface border border-border text-text"
                  : "bg-text text-surface",
              )}
            >
              {connected ? account.displayName : "connect"}
            </button>
          );
        }}
      </ConnectButton.Custom>
    </header>
  );
}
