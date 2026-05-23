"use client";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { usePrivy } from "@privy-io/react-auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { RiskOverview } from "@/app/api/risk/route";

const RISK_COLORS: Record<string, string> = {
  low: "text-success",
  medium: "text-risk-med",
  high: "text-danger",
};

const RISK_BADGE: Record<string, "enabled" | "medium" | "high"> = {
  low: "enabled",
  medium: "medium",
  high: "high",
};

const OVERALL_BADGE: Record<string, "enabled" | "high" | "neutral"> = {
  low: "enabled",
  medium: "neutral",
  high: "high",
};

export default function RiskPage() {
  const { getAccessToken } = usePrivy();

  const fetcher = async (url: string): Promise<RiskOverview> => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`risk ${r.status}`);
    return r.json();
  };

  const { data, isLoading, error } = useSWR<RiskOverview>(
    "/api/risk",
    fetcher,
    { refreshInterval: 60_000, dedupingInterval: 15_000 },
  );

  return (
    <div className="min-h-dvh flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileTopBar />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1280px] w-full mx-auto">
          <header className="space-y-3">
            <Link
              href="/"
              className="hidden lg:inline-flex items-center gap-1.5 h-8 px-2 -ml-2 text-text-muted text-sm rounded-md hover:bg-surface-muted transition-colors"
            >
              <ArrowLeft size={14} strokeWidth={1.5} />
              back
            </Link>
            <div className="flex items-center gap-3">
              <Badge variant="info" className="border-text text-text">
                RISK · COMPLIANCE
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-[34px] lg:text-[40px] font-bold tracking-tight leading-[1.05]">
              risk center
            </h1>
            <p className="text-sm text-text-muted max-w-[60ch]">
              per-asset risk scoring, exposure limits, and compliance status for
              every underlying vault in the SerraRWA allocation protocol.
            </p>
          </header>

          {isLoading ? (
            <div className="mt-8 flex items-center gap-2 text-sm text-text-muted">
              <span className="inline-block w-2 h-2 bg-text-muted rounded-full animate-pulse" />
              loading risk data…
            </div>
          ) : error ? (
            <Card className="mt-8">
              <div className="flex items-center gap-2 text-sm text-danger">
                <XCircle size={16} />
                failed to load risk data
              </div>
            </Card>
          ) : data ? (
            <>
              {/* Overall Risk Score */}
              <section className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-3">
                <Card featured className="lg:col-span-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-[0.1em] text-text-subtle">
                        overall risk
                      </p>
                      <div className="mt-2 flex items-baseline gap-3">
                        <span
                          className={`text-5xl font-bold tracking-tight ${
                            RISK_COLORS[data.overallRisk]
                          }`}
                        >
                          {data.score}
                        </span>
                        <Badge variant={OVERALL_BADGE[data.overallRisk]}>
                          {data.overallRisk}
                        </Badge>
                      </div>
                    </div>
                    <Shield size={24} strokeWidth={1.5} className="text-text-muted" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-mono text-text-muted">
                    <div>
                      <span className="block text-text-subtle">assets</span>
                      {data.totalAllocations}
                    </div>
                    <div>
                      <span className="block text-text-subtle">issues</span>
                      <span
                        className={
                          data.complianceIssues > 0 ? "text-danger" : "text-success"
                        }
                      >
                        {data.complianceIssues}
                      </span>
                    </div>
                    <div>
                      <span className="block text-text-subtle">updated</span>
                      {data.lastDecisionTs
                        ? fmtAge(
                            Math.round((Date.now() - data.lastDecisionTs) / 1000),
                          )
                        : "—"}
                    </div>
                  </div>
                </Card>

                <Card className="lg:col-span-2">
                  <p className="text-sm text-text-muted leading-6">
                    <span className="font-medium text-text">
                      how risk is scored
                    </span>
                    <br />
                    each underlying asset is rated from its on-chain allocation
                    history, the RWA metadata registry, and compliance checks.
                    low-risk assets (sovereign bonds) get higher exposure caps;
                    high-risk assets (private credit, exotic yield) are capped.
                    the overall score is a weighted average across all active
                    positions.
                  </p>
                  <p className="mt-3 text-xs text-text-subtle leading-5">
                    this is a demo heuristic. production requires formal risk
                    models, oracle attestations, and independent NAV feeds.
                  </p>
                </Card>
              </section>

              {/* Per-Asset Risk Cards */}
              <section className="mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="microlabel">assets</span>
                  <span className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {data.assets.map((asset) => (
                    <Card key={asset.address}>
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Left: identity */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-surface-muted text-text-muted">
                              <Shield size={14} strokeWidth={1.5} />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {asset.name}
                              </p>
                              <p className="text-xs text-text-subtle font-mono truncate">
                                {asset.address.slice(0, 10)}…
                                {asset.address.slice(-6)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Center: stats */}
                        <div className="flex items-center gap-6 shrink-0">
                          <div className="text-center">
                            <p className="text-xs text-text-subtle">risk</p>
                            <Badge variant={RISK_BADGE[asset.riskLevel]}>
                              {asset.riskLevel}
                            </Badge>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-text-subtle">allocation</p>
                            <p
                              className={`text-sm font-medium font-mono ${
                                asset.exposureOk
                                  ? "text-text"
                                  : "text-danger"
                              }`}
                            >
                              {asset.currentAllocPct}%
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-text-subtle">limit</p>
                            <p className="text-sm font-mono text-text-muted">
                              {asset.exposureLimitBps / 100}%
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-text-subtle">success</p>
                            <p className="text-sm font-mono text-text">
                              {asset.successRate}%
                            </p>
                          </div>
                        </div>

                        {/* Right: status */}
                        <div className="shrink-0">
                          {asset.exposureOk ? (
                            <span className="inline-flex items-center gap-1 text-xs text-success">
                              <CheckCircle2 size={12} />
                              within limit
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-danger">
                              <AlertTriangle size={12} />
                              over limit
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Risk detail bar */}
                      <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs text-text-muted">
                        <span className="font-mono">{asset.riskLabel}</span>
                        <span className="text-text-subtle">
                          category: {asset.category}
                        </span>
                        {asset.lastRebalanceAgoSec !== null && (
                          <span className="ml-auto text-text-subtle">
                            last rebalance {fmtAge(asset.lastRebalanceAgoSec)} ago
                          </span>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </section>

              {/* Compliance Summary */}
              <section className="mt-6">
                <Card>
                  <CardHeader
                    icon={
                      data.complianceIssues === 0 ? (
                        <CheckCircle2 size={18} className="text-success" />
                      ) : (
                        <AlertTriangle size={18} className="text-danger" />
                      )
                    }
                    title="compliance"
                    badge={
                      <Badge
                        variant={
                          data.complianceIssues === 0 ? "enabled" : "high"
                        }
                      >
                        {data.complianceIssues === 0
                          ? "all clear"
                          : `${data.complianceIssues} issues`}
                      </Badge>
                    }
                  />
                  <div className="space-y-2 text-sm text-text-muted">
                    {data.complianceIssues === 0 ? (
                      <p className="flex items-center gap-2 text-success">
                        <CheckCircle2 size={14} />
                        all allocations within exposure limits
                      </p>
                    ) : (
                      <p className="text-danger">
                        <AlertTriangle size={14} className="inline mr-1.5" />
                        {data.complianceIssues} asset
                        {data.complianceIssues > 1 ? "s" : ""} exceeding
                        exposure limits — consider rebalancing
                      </p>
                    )}
                    <p className="text-xs text-text-subtle">
                      checked at {new Date(data.checkedAt).toLocaleString()}
                    </p>
                  </div>
                </Card>
              </section>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function fmtAge(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}
