"use client";
import { ArrowLeft, Hash, Wallet, Coins } from "lucide-react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { VaultStateGrid } from "@/components/vault/VaultStateGrid";
import { UnderlyingsBreakdown } from "@/components/vault/UnderlyingsBreakdown";
import { PreviewSimulator } from "@/components/vault/PreviewSimulator";
import { YieldLeaderboard } from "@/components/vault/YieldLeaderboard";
import { VaultAbiTable } from "@/components/vault/VaultAbiTable";
import { Address } from "@/components/vault/AddressLink";
import { useVaultSnapshot } from "@/lib/useVaultSnapshot";

export default function VaultPage() {
  return (
    <div className="min-h-dvh flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileTopBar />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1280px] w-full mx-auto">
          <PageHeader />

          <div className="mt-5">
            <KpiBanner />
          </div>

          <SectionLabel title="state" />
          <section className="mt-3">
            <VaultStateGrid />
          </section>

          <SectionLabel title="composition" />
          <section className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
            <div className="lg:col-span-2">
              <UnderlyingsBreakdown />
            </div>
            <PreviewSimulator />
          </section>

          <SectionLabel title="yield" />
          <section className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
            <div className="lg:col-span-2">
              <YieldLeaderboard />
            </div>
            <Card compact>
              <p className="text-sm text-text-muted leading-6">
                <span className="font-medium text-text">how apy works</span>
                <br />
                the agent probes each underlying vault&apos;s{" "}
                <code className="text-[11px] font-mono bg-surface-muted px-1 rounded">
                  convertToAssets(1e18)
                </code>
                {" "}— a read-only call that estimates how many USDC you get per
                share deposited. higher values signal stronger returns.
              </p>
              <p className="mt-3 text-xs text-text-subtle leading-5">
                this is a naive proxy. production would track share-price
                velocity (dw/dt) over rolling windows for a true annualized rate.
              </p>
            </Card>
          </section>

          <SectionLabel title="reference" />
          <section className="mt-3">
            <VaultAbiTable />
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
  const { data } = useVaultSnapshot();
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
          F-002 · VAULT DETAIL
        </Badge>
        {data?.source === "demo" && <Badge variant="neutral">demo data</Badge>}
      </div>
      <h1 className="text-3xl sm:text-[34px] lg:text-[40px] font-bold tracking-tight lowercase leading-[1.05]">
        vault detail
      </h1>
      <p className="text-sm text-text-muted max-w-[60ch]">
        Live read of the deployed Vault contract — state flags, asset
        composition, ERC-4626 previews, and the full read-surface for
        verification.
      </p>
      {data?.vaultAddress && (
        <p className="text-[12px] font-mono text-text-muted">
          contract: <Address address={data.vaultAddress} />
        </p>
      )}
    </header>
  );
}

function KpiBanner() {
  const { data, isLoading } = useVaultSnapshot();
  return (
    <Card compact>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <Kpi
          icon={<Coins size={14} strokeWidth={1.5} />}
          label="vault tvl"
          value={
            isLoading
              ? "—"
              : data
                ? `${formatNumber(data.totalAssets)} usdc`
                : "—"
          }
        />
        <Kpi
          icon={<Wallet size={14} strokeWidth={1.5} />}
          label="total supply"
          value={
            isLoading
              ? "—"
              : data
                ? `${formatNumber(data.totalSupply)} shares`
                : "—"
          }
        />
        <Kpi
          icon={<Hash size={14} strokeWidth={1.5} />}
          label="share price"
          value={
            isLoading
              ? "—"
              : data
                ? `${data.sharePrice.toFixed(6)} usdc / share`
                : "—"
          }
        />
        <Kpi
          icon={<Hash size={14} strokeWidth={1.5} />}
          label="next nonce"
          value={isLoading ? "—" : data ? `#${data.nextNonce}` : "—"}
        />
      </div>
    </Card>
  );
}

function Kpi({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <span className="microlabel flex items-center gap-1.5">
        <span className="text-text-subtle">{icon}</span>
        {label}
      </span>
      <span className="mt-1.5 block text-base font-mono tabular text-text">
        {value}
      </span>
    </div>
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

function formatNumber(s: string): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}k`;
  return n.toFixed(2);
}
