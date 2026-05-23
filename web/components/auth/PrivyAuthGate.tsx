"use client";

import { usePrivy } from "@privy-io/react-auth";
import { LoaderCircle, ShieldCheck, Wallet } from "lucide-react";
import { ReactNode } from "react";

export function PrivyAuthGate({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, error } = usePrivy();

  if (!ready) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center px-6">
        <div className="flex items-center gap-3 text-text-muted">
          <LoaderCircle size={18} className="animate-spin" />
          <span className="text-sm">Loading wallet gate…</span>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-dvh bg-bg text-text flex items-center justify-center px-4 py-8 sm:px-6">
        <section className="w-full max-w-xl rounded-[28px] border border-border bg-bg-elevated shadow-sm overflow-hidden">
          <div className="px-6 sm:px-8 pt-8 pb-6 border-b border-border">
            <p className="microlabel">SerraRWA</p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
              Connect a wallet to continue
            </h1>
            <p className="mt-3 text-sm sm:text-base text-text-muted leading-6 max-w-prose">
              This demo only accepts wallet authentication on Base Sepolia. Do not deposit real funds.
            </p>
          </div>

          <div className="px-6 sm:px-8 py-6 grid gap-4">
            <div className="rounded-2xl border border-border bg-bg p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-text text-surface">
                  <Wallet size={18} strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Wallet-only access</p>
                  <p className="mt-1 text-sm text-text-muted leading-6">
                    No email, passkey, or social login. Just connect a wallet to enter the dashboard.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => login()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-text px-4 py-3 text-sm font-medium text-surface transition-colors hover:bg-text/90"
            >
              <Wallet size={16} strokeWidth={1.8} />
              Connect wallet
            </button>

            <div className="flex items-start gap-2 rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text-muted leading-6">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-accent" />
              <span>
                Base Sepolia only. The app is read-only until you connect a wallet, and it is not
                intended for real-value deposits.
              </span>
            </div>

            {error ? (
              <p className="text-sm text-red-500">
                Wallet login error: {error.message}
              </p>
            ) : null}
          </div>
        </section>
      </main>
    );
  }

  return (
    <>{children}</>
  );
}
