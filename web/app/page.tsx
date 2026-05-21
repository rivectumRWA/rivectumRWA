"use client";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { KpiStrip } from "@/components/KpiStrip";
import { DepositCard } from "@/components/DepositCard";
import { WithdrawCard } from "@/components/WithdrawCard";
import { AllocationCard } from "@/components/AllocationCard";
import { PerformanceCard } from "@/components/PerformanceCard";
import { ApyCard } from "@/components/ApyCard";
import { ActivityCard } from "@/components/ActivityCard";
import { StrategyCard } from "@/components/StrategyCard";
import { ContractCard } from "@/components/ContractCard";
import { OwnerCard } from "@/components/OwnerCard";
import { UnderlyingsCard } from "@/components/UnderlyingsCard";
import { OpsStrip } from "@/components/OpsStrip";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export default function Home() {
  return (
    <div className="min-h-dvh flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileTopBar />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1280px] w-full mx-auto">
          <PageHeader />

          <div className="mt-5">
            <KpiStrip />
          </div>

          {/* Section 1: VAULT — deposit + performance on the left, withdraw + allocation on the right */}
          <SectionLabel title="vault" />
          <section className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
            <div className="lg:col-span-2 grid gap-3">
              <DepositCard featured />
              <PerformanceCard />
            </div>
            <div className="grid gap-3">
              <WithdrawCard />
              <AllocationCard />
            </div>
          </section>

          {/* Section 2: AGENT — apy + strategy in a 2/1 split, activity full-width below */}
          <SectionLabel title="agent" />
          <section className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
            <div className="lg:col-span-2">
              <ApyCard />
            </div>
            <StrategyCard />
          </section>
          <section className="mt-3">
            <ActivityCard />
          </section>

          {/* Section 3: REGISTRY — underlyings + contracts */}
          <SectionLabel title="registry" />
          <section className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
            <div className="lg:col-span-2">
              <UnderlyingsCard />
            </div>
            <ContractCard />
          </section>

          {/* Section 4: OWNER (renders only when connected wallet === owner) */}
          <OwnerSection />

          <div className="mt-6">
            <OpsStrip />
          </div>
          <p className="mt-6 text-[11px] font-mono text-text-subtle text-center">
            unaudited demo · base sepolia · do not deposit real funds
          </p>
        </main>
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <header className="space-y-3">
      <button
        type="button"
        className="hidden lg:inline-flex items-center gap-1.5 h-8 px-2 -ml-2 text-text-muted text-sm rounded-md cursor-not-allowed"
        disabled
        title="back navigation enabled when more pages exist"
      >
        <ArrowLeft size={14} strokeWidth={1.5} />
        back
      </button>
      <div className="flex items-center gap-3">
        <Badge variant="info" className="border-text text-text">
          F-001 · UNAUDITED DEMO
        </Badge>
      </div>
      <h1 className="text-3xl sm:text-[34px] lg:text-[40px] font-bold tracking-tight lowercase leading-[1.05]">
        agent rwa vault
      </h1>
      <p className="text-sm text-text-muted max-w-[60ch]">
        Off-chain TS agent rebalances an ERC-4626 USDC vault across whitelisted
        underlying vaults via signed intents. Read-only without a connected wallet.
      </p>
    </header>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <div className="mt-7 mb-1 flex items-center gap-3">
      <span className="microlabel">{title}</span>
      <span className="flex-1 h-px bg-border" />
    </div>
  );
}

function OwnerSection() {
  return (
    <section className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3">
      <OwnerCard />
    </section>
  );
}
