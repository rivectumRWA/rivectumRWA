"use client";
import { ArrowLeft, ShieldCheck, Cpu } from "lucide-react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ContractCard } from "@/components/ContractCard";
import { OwnerCard } from "@/components/OwnerCard";

export default function SettingsPage() {
  return (
    <div className="min-h-dvh flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileTopBar />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1280px] w-full mx-auto">
          <PageHeader />

          <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
            <div className="lg:col-span-2 grid gap-3">
              <ContractCard />
              <OwnerCard />
            </div>
            <Card compact>
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-border">
                <ShieldCheck size={16} strokeWidth={1.5} />
                <h2 className="text-base font-medium lowercase">settings notes</h2>
              </div>
              <div className="space-y-3 text-sm text-text-muted leading-relaxed">
                <p>
                  This surface stays intentionally narrow: contract identity,
                  owner-only controls, and network context.
                </p>
                <p>
                  Connect the owner wallet to reveal the pause and emergency
                  actions. Other wallets stay read-only.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-text-subtle">
                <Cpu size={12} strokeWidth={1.5} />
                <span>control plane for vault operators</span>
              </div>
            </Card>
          </div>

          <p className="mt-8 text-[11px] font-mono text-text-subtle text-center">
            unaudited demo · base sepolia · owner actions require connected wallet
          </p>
        </main>
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <header className="space-y-3">
      <Link
        href="/"
        className="hidden lg:inline-flex items-center gap-1.5 h-8 px-2 -ml-2 text-text-muted hover:text-text text-sm rounded-md transition-colors"
      >
        <ArrowLeft size={14} strokeWidth={1.5} />
        back to overview
      </Link>
      <div className="flex items-center gap-2">
        <Badge variant="info" className="border-text text-text">
          F-006 · CONTROL PLANE
        </Badge>
      </div>
      <h1 className="text-3xl sm:text-[34px] lg:text-[40px] font-bold tracking-tight lowercase leading-[1.05]">
        settings
      </h1>
      <p className="text-sm text-text-muted max-w-[60ch]">
        Vault identity, network details, and the owner-only operational surface.
        Nothing here changes the strategy — it only governs access.
      </p>
    </header>
  );
}
