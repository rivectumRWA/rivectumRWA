"use client";
import {
  BarChart3,
  ArrowLeft,
  Bot,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { usePrivy } from "@privy-io/react-auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { AnalyticsResponse } from "@/app/api/analytics/route";

export default function AnalyticsPage() {
  const { getAccessToken } = usePrivy();

  const fetcher = async (url: string): Promise<AnalyticsResponse> => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`analytics ${r.status}`);
    return r.json();
  };

  const { data, isLoading, error } = useSWR<AnalyticsResponse>(
    "/api/analytics",
    fetcher,
    { refreshInterval: 30_000, dedupingInterval: 10_000 },
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
                ANALYTICS
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-[34px] lg:text-[40px] font-bold tracking-tight leading-[1.05]">
              copilot analytics
            </h1>
            <p className="text-sm text-text-muted max-w-[60ch]">
              usage stats, rate limits, and cost estimates for the Serra Copilot — the
              RWA-focused AI assistant embedded in the dashboard.
            </p>
          </header>

          {isLoading ? (
            <div className="mt-8 flex items-center gap-2 text-sm text-text-muted">
              <span className="inline-block w-2 h-2 bg-text-muted rounded-full animate-pulse" />
              loading analytics…
            </div>
          ) : error ? (
            <Card className="mt-8">
              <div className="flex items-center gap-2 text-sm text-danger">
                <XCircle size={16} />
                failed to load analytics
              </div>
            </Card>
          ) : data ? (
            <>
              {/* KPI Strip */}
              <section className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card compact>
                  <p className="text-xs font-mono uppercase tracking-[0.1em] text-text-subtle">
                    total queries
                  </p>
                  <p className="mt-1 text-3xl font-bold text-text">
                    {data.copilot.totalQueries}
                  </p>
                </Card>
                <Card compact>
                  <p className="text-xs font-mono uppercase tracking-[0.1em] text-text-subtle">
                    llm calls
                  </p>
                  <p className="mt-1 text-3xl font-bold text-text">
                    {data.copilot.llmQueries}
                  </p>
                </Card>
                <Card compact>
                  <p className="text-xs font-mono uppercase tracking-[0.1em] text-text-subtle">
                    guarded
                  </p>
                  <p className="mt-1 text-3xl font-bold text-text-muted">
                    {data.copilot.guardedQueries}
                  </p>
                </Card>
                <Card compact>
                  <p className="text-xs font-mono uppercase tracking-[0.1em] text-text-subtle">
                    errors
                  </p>
                  <p
                    className={`mt-1 text-3xl font-bold ${
                      data.copilot.errors > 0 ? "text-danger" : "text-text"
                    }`}
                  >
                    {data.copilot.errors}
                  </p>
                </Card>
              </section>

              {/* Rate Limit + Cost */}
              <section className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
                <Card className="lg:col-span-2">
                  <CardHeader
                    icon={<Shield size={18} />}
                    title="rate limit"
                    badge={
                      <Badge
                        variant={
                          data.rateLimit.status === "ok"
                            ? "enabled"
                            : data.rateLimit.status === "warning"
                              ? "medium"
                              : "high"
                        }
                      >
                        {data.rateLimit.status}
                      </Badge>
                    }
                  />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-muted">current hour</span>
                      <span className="font-mono text-text">
                        {data.rateLimit.currentHour} / {data.rateLimit.maxPerHour}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-surface-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          data.rateLimit.status === "exceeded"
                            ? "bg-danger"
                            : data.rateLimit.status === "warning"
                              ? "bg-risk-med"
                              : "bg-success"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (data.rateLimit.currentHour /
                              data.rateLimit.maxPerHour) *
                              100,
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-text-subtle">
                      rate limit resets at the top of each hour
                    </p>
                  </div>
                </Card>

                <Card compact>
                  <CardHeader
                    icon={<Bot size={18} />}
                    title="cost estimate"
                  />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-muted">est. tokens</span>
                      <span className="font-mono text-text">
                        {data.copilot.totalTokensEst.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-muted">est. cost</span>
                      <span className="font-mono text-text">
                        ${((data.copilot.totalTokensEst / 1000) * 0.00015).toFixed(4)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-muted">uptime</span>
                      <span className="font-mono text-text">
                        {fmtAge(data.serverUptimeSec)}
                      </span>
                    </div>
                    <p className="text-xs text-text-subtle">
                      based on gpt-4o-mini pricing ($0.15/1M input)
                    </p>
                  </div>
                </Card>
              </section>

              {/* Query Breakdown */}
              <section className="mt-4">
                <Card>
                  <CardHeader
                    icon={<BarChart3 size={18} />}
                    title="query breakdown"
                  />
                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div>
                      <p className="text-2xl font-bold text-text">
                        {data.copilot.llmQueries}
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        llm-processed
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text-muted">
                        {data.copilot.guardedQueries}
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        topic-guarded
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-danger">
                        {data.copilot.errors}
                      </p>
                      <p className="text-xs text-text-muted mt-1">errors</p>
                    </div>
                  </div>
                </Card>
              </section>

              {/* Recent Activity */}
              <section className="mt-4">
                <div className="flex items-center gap-3 mb-4">
                  <span className="microlabel">recent activity</span>
                  <span className="flex-1 h-px bg-border" />
                </div>
                <Card compact>
                  {data.copilot.queries.length === 0 ? (
                    <p className="text-sm text-text-muted">
                      no copilot queries recorded yet
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {[...data.copilot.queries]
                        .reverse()
                        .slice(0, 20)
                        .map((q, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 py-1.5 px-2 rounded text-xs"
                          >
                            <span className="shrink-0">
                              {q.error ? (
                                <XCircle size={12} className="text-danger" />
                              ) : q.guarded ? (
                                <Shield size={12} className="text-text-muted" />
                              ) : (
                                <CheckCircle2
                                  size={12}
                                  className="text-success"
                                />
                              )}
                            </span>
                            <span className="font-mono text-text-muted w-20 shrink-0">
                              {new Date(q.ts).toLocaleTimeString()}
                            </span>
                            <span className="text-text-subtle truncate">
                              {q.error
                                ? "error"
                                : q.guarded
                                  ? "guarded"
                                  : "llm call"}
                            </span>
                            <span className="ml-auto font-mono text-text-subtle shrink-0">
                              ~{q.tokenEst} tok
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
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
