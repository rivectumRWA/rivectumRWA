"use client";
import {
  ClipboardCheck,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { usePrivy } from "@privy-io/react-auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { ReadinessResponse } from "@/app/api/demo/readiness/route";

const STATUS_ICON: Record<string, React.ReactNode> = {
  pass: <CheckCircle2 size={16} className="text-success" />,
  fail: <XCircle size={16} className="text-danger" />,
  warn: <AlertTriangle size={16} className="text-risk-med" />,
};

const STATUS_BADGE: Record<string, "enabled" | "medium" | "high"> = {
  pass: "enabled",
  warn: "medium",
  fail: "high",
};

const OVERALL_BADGE: Record<string, "enabled" | "medium" | "high"> = {
  ready: "enabled",
  partial: "medium",
  "not-ready": "high",
};

const OVERALL_LABEL: Record<string, string> = {
  ready: "demo ready",
  partial: "partial",
  "not-ready": "not ready",
};

export default function DemoPage() {
  const { getAccessToken } = usePrivy();

  const fetcher = async (url: string): Promise<ReadinessResponse> => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`readiness ${r.status}`);
    return r.json();
  };

  const { data, isLoading, error, mutate } = useSWR<ReadinessResponse>(
    "/api/demo/readiness",
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
                READINESS
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-[34px] lg:text-[40px] font-bold tracking-tight leading-[1.05]">
              demo readiness
            </h1>
            <p className="text-sm text-text-muted max-w-[60ch]">
              operational checklist: verify that all system components are
              configured and healthy before presenting the demo.
            </p>
          </header>

          {isLoading ? (
            <div className="mt-8 flex items-center gap-2 text-sm text-text-muted">
              <span className="inline-block w-2 h-2 bg-text-muted rounded-full animate-pulse" />
              running checks…
            </div>
          ) : error ? (
            <Card className="mt-8">
              <div className="flex items-center gap-2 text-sm text-danger">
                <XCircle size={16} />
                readiness check failed — is the server running?
              </div>
            </Card>
          ) : data ? (
            <>
              {/* Overall Status */}
              <section className="mt-6">
                <Card featured>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span
                        className={`text-5xl font-bold tracking-tight ${
                          data.overall === "ready"
                            ? "text-success"
                            : data.overall === "partial"
                              ? "text-risk-med"
                              : "text-danger"
                        }`}
                      >
                        {data.passCount}/{data.items.length}
                      </span>
                      <div>
                        <Badge variant={OVERALL_BADGE[data.overall]}>
                          {OVERALL_LABEL[data.overall]}
                        </Badge>
                        <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-success" />
                            {data.passCount} pass
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-risk-med" />
                            {data.warnCount} warn
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-danger" />
                            {data.failCount} fail
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => mutate()}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm text-text-muted hover:bg-surface-muted transition-colors cursor-pointer"
                    >
                      <RefreshCw size={14} />
                      re-check
                    </button>
                  </div>
                </Card>
              </section>

              {/* Checklist */}
              <section className="mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="microlabel">checks</span>
                  <span className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {data.items.map((item) => (
                    <Card key={item.id} compact>
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 shrink-0">
                          {STATUS_ICON[item.status]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium lowercase">
                              {item.label}
                            </p>
                            <Badge variant={STATUS_BADGE[item.status]}>
                              {item.status}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-text-muted">
                            {item.description}
                          </p>
                          <p className="mt-1 text-xs font-mono text-text-subtle">
                            {item.detail}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>

              {/* Quick Summary */}
              <section className="mt-6">
                <Card>
                  <CardHeader
                    icon={<ClipboardCheck size={18} />}
                    title="verdict"
                  />
                  <div className="space-y-2 text-sm text-text-muted">
                    {data.overall === "ready" ? (
                      <p className="flex items-center gap-2 text-success">
                        <CheckCircle2 size={14} />
                        all systems operational — safe to present the demo
                      </p>
                    ) : data.overall === "partial" ? (
                      <p className="text-risk-med">
                        <AlertTriangle size={14} className="inline mr-1.5" />
                        {data.warnCount} warning
                        {data.warnCount > 1 ? "s" : ""} — demo works but some
                        features may show limited data
                      </p>
                    ) : (
                      <p className="text-danger">
                        <XCircle size={14} className="inline mr-1.5" />
                        {data.failCount} critical issue
                        {data.failCount > 1 ? "s" : ""} — resolve before demo
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
