"use client";
import {
  Building2,
  Landmark,
  Home,
  CreditCard,
  Shield,
  Coins,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { Address } from "@/components/vault/AddressLink";
import { lookupRwaMeta, type RwaAssetMeta } from "@/lib/rwa-registry";
import { DEMO_UNDERLYING_LIST } from "@/lib/demo";

const META_ICONS: Record<string, React.ComponentType<any>> = {
  Building2,
  Landmark,
  Home,
  CreditCard,
  Shield,
  Coins,
};

const RISK_COLOR: Record<string, string> = {
  low: "text-success",
  medium: "text-risk-med",
  high: "text-danger",
};

export default function RegistryPage() {
  const underlyings = DEMO_UNDERLYING_LIST;

  return (
    <div className="min-h-dvh flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileTopBar />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1280px] w-full mx-auto">
          <PageHeader />

          <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {underlyings.map((u) => {
              const meta = lookupRwaMeta(u.address);
              if (!meta) return null;
              return <AssetCard key={u.address} underlying={u} meta={meta} />;
            })}
          </section>

          <section className="mt-8">
            <Divider title="risk disclosure" />
            <Card>
              <div className="space-y-3 text-sm text-text-muted leading-6">
                <p>
                  <span className="font-medium text-text">naive apy proxy. </span>
                  the agent uses <code className="text-[11px] font-mono bg-surface-muted px-1 rounded">convertToAssets(1e18)</code> —
                  a read-only call that estimates how many USDC you get per share deposited.
                  this is not a true annualized yield. production deployments should track
                  share-price velocity over rolling windows.
                </p>
                <p>
                  <span className="font-medium text-text">no guarantee of returns. </span>
                  yield varies with market conditions, protocol health, and smart-contract
                  risk. past performance does not predict future returns. rwa tokenization
                  introduces legal, custodial, and regulatory risks beyond purely on-chain
                  factors.
                </p>
                <p>
                  <span className="font-medium text-text">unaudited demo. </span>
                  this vault and agent have not been formally audited. base sepolia testnet
                  only. do not deposit real funds.
                </p>
              </div>
            </Card>
          </section>

          <p className="mt-8 text-[11px] font-mono text-text-subtle text-center">
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
      <Link
        href="/"
        className="hidden lg:inline-flex items-center gap-1.5 h-8 px-2 -ml-2 text-text-muted hover:text-text text-sm rounded-md transition-colors"
      >
        <ArrowLeft size={14} strokeWidth={1.5} />
        back to overview
      </Link>
      <div className="flex items-center gap-2">
        <Badge variant="info" className="border-text text-text">
          F-014 · RWA REGISTRY
        </Badge>
      </div>
      <h1 className="text-3xl sm:text-[34px] lg:text-[40px] font-bold tracking-tight lowercase leading-[1.05]">
        rwa registry
      </h1>
      <p className="text-sm text-text-muted max-w-[60ch]">
        Real-world asset metadata for each whitelisted underlying vault —
        asset class, backing collateral, risk profile, and yield methodology.
      </p>
    </header>
  );
}

function AssetCard({
  underlying,
  meta,
}: {
  underlying: { address: string; symbol: string; name: string };
  meta: RwaAssetMeta;
}) {
  const Icon = META_ICONS[meta.iconName] ?? Coins;
  const riskTier = meta.riskLabel.split("·")[0]?.trim() ?? "medium";

  return (
    <Card featured>
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-text text-surface">
          <Icon size={22} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-base font-semibold text-text">
              {underlying.symbol}
            </h3>
            <span className="text-sm text-text-muted">{underlying.name}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-0.5 text-[11px] font-mono uppercase tracking-[0.06em] text-text">
              {meta.category}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px] font-mono uppercase tracking-[0.06em] ${
                RISK_COLOR[riskTier] ?? "text-text-muted"
              } ${riskTier === "low" ? "border-success/30" : riskTier === "high" ? "border-danger/30" : "border-border"}`}
            >
              {meta.riskLabel}
            </span>
          </div>

          <p className="mt-3 text-sm text-text-muted leading-6">
            {meta.description}
          </p>

          <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-[11px] font-mono text-text-subtle flex-wrap">
            <span>
              contract: <Address address={underlying.address} />
            </span>
            <a
              href={`https://sepolia.basescan.org/address/${underlying.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-text-muted hover:text-text transition-colors"
            >
              <ExternalLink size={10} />
              basescan
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Divider({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="microlabel">{title}</span>
      <span className="flex-1 h-px bg-border" />
    </div>
  );
}
