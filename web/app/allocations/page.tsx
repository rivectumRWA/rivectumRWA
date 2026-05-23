"use client";
import { ArrowLeft, PieChart, Layers3 } from "lucide-react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { Badge } from "@/components/ui/Badge";
import { AllocationCard } from "@/components/AllocationCard";
import { UnderlyingsCard } from "@/components/UnderlyingsCard";

export default function AllocationsPage() {
  return (
    <div className="min-h-dvh flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileTopBar />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1280px] w-full mx-auto">
          <PageHeader />

          <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
            <div className="lg:col-span-2">
              <AllocationCard />
            </div>
            <UnderlyingsCard />
          </div>

          <p className="mt-8 text-[11px] font-mono text-text-subtle text-center">
            unaudited demo · base sepolia · allocation view updates with each rebalance
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
          F-004 · ALLOCATION MAP
        </Badge>
      </div>
      <h1 className="text-3xl sm:text-[34px] lg:text-[40px] font-bold tracking-tight lowercase leading-[1.05]">
        allocations
      </h1>
      <p className="text-sm text-text-muted max-w-[60ch]">
        The live split across approved underlyings. This view mirrors the latest
        rebalance outcome and the registry entries the agent is allowed to use.
      </p>
      <div className="flex items-center gap-2 text-[11px] font-mono text-text-subtle">
        <Layers3 size={12} strokeWidth={1.5} />
        <span>approved underlyings + target weights</span>
      </div>
    </header>
  );
}
