"use client";
import { useMemo, useState } from "react";
import {
  Activity as ActivityIcon,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Hash,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Address } from "@/components/vault/AddressLink";
import { useDecisions, type Decision } from "@/lib/useDecisions";
import { DEMO, demoDecisions } from "@/lib/demo";
import { clsx } from "@/lib/clsx";

type StatusFilter = "all" | "success" | "failed" | "pending";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "all" },
  { value: "success", label: "success" },
  { value: "failed", label: "failed" },
  { value: "pending", label: "pending" },
];

export default function ActivityPage() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const { data: live, isLoading, error } = useDecisions({ status: filter, limit: 200 });

  const { rows, isDemo } = useMemo(() => {
    const fromApi = live ?? [];
    if (fromApi.length === 0 && DEMO) {
      const seeded = demoDecisions(40);
      const filtered =
        filter === "all" ? seeded : seeded.filter((d) => d.status === filter);
      return { rows: filtered, isDemo: true };
    }
    return { rows: fromApi, isDemo: false };
  }, [live, filter]);

  // Stats are computed from the unfiltered demo or live set so they stay stable
  // across filter changes.
  const allRows = useMemo<Decision[]>(() => {
    if ((live?.length ?? 0) === 0 && DEMO) return demoDecisions(40);
    return live ?? [];
  }, [live]);

  return (
    <div className="min-h-dvh flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileTopBar />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1280px] w-full mx-auto">
          <PageHeader isDemo={isDemo} />

          <div className="mt-5">
            <StatsBanner rows={allRows} isLoading={isLoading} error={!!error} />
          </div>

          <SectionLabel title="decisions" />
          <div className="mt-3 mb-3 flex items-center gap-2 flex-wrap">
            {FILTERS.map((f) => {
              const count =
                f.value === "all"
                  ? allRows.length
                  : allRows.filter((r) => r.status === f.value).length;
              return (
                <FilterChip
                  key={f.value}
                  active={filter === f.value}
                  onClick={() => setFilter(f.value)}
                  label={f.label}
                  count={count}
                />
              );
            })}
          </div>

          <DecisionsList rows={rows} loading={isLoading} isDemo={isDemo} />

          <p className="mt-8 text-[11px] font-mono text-text-subtle text-center">
            unaudited demo · base sepolia · agent decisions update every 15s
          </p>
        </main>
      </div>
    </div>
  );
}

function PageHeader({ isDemo }: { isDemo: boolean }) {
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
          F-003 · AGENT TELEMETRY
        </Badge>
        {isDemo && <Badge variant="neutral">demo data</Badge>}
      </div>
      <h1 className="text-3xl sm:text-[34px] lg:text-[40px] font-bold tracking-tight lowercase leading-[1.05]">
        activity log
      </h1>
      <p className="text-sm text-text-muted max-w-[60ch]">
        Every signed intent the agent submitted. Drill into a decision for the
        intent hash, allocation breakdown, transaction status, and revert
        reason if any.
      </p>
    </header>
  );
}

function StatsBanner({
  rows,
  isLoading,
  error,
}: {
  rows: Decision[];
  isLoading: boolean;
  error: boolean;
}) {
  const total = rows.length;
  const success = rows.filter((r) => r.status === "success").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const successRate = total > 0 ? (success / total) * 100 : 0;
  const lastSuccess = rows.find((r) => r.status === "success");

  return (
    <Card compact>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <Stat
          icon={<ActivityIcon size={14} strokeWidth={1.5} />}
          label="total decisions"
          value={
            error
              ? "rpc error"
              : isLoading && total === 0
                ? "—"
                : String(total)
          }
        />
        <Stat
          icon={<CheckCircle2 size={14} strokeWidth={1.5} />}
          label="success rate"
          value={total > 0 ? `${successRate.toFixed(1)}%` : "—"}
          tone={successRate >= 90 ? "positive" : successRate >= 50 ? "neutral" : "negative"}
        />
        <Stat
          icon={<XCircle size={14} strokeWidth={1.5} />}
          label="failed"
          value={total > 0 ? `${failed} of ${total}` : "—"}
          tone={failed === 0 ? "positive" : "negative"}
        />
        <Stat
          icon={<Clock size={14} strokeWidth={1.5} />}
          label="last success"
          value={
            lastSuccess
              ? formatRelative(lastSuccess.ts)
              : pending > 0
                ? "pending"
                : "—"
          }
        />
      </div>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const color =
    tone === "positive"
      ? "text-success"
      : tone === "negative"
        ? "text-danger"
        : "text-text";
  return (
    <div>
      <span className="microlabel flex items-center gap-1.5">
        <span className="text-text-subtle">{icon}</span>
        {label}
      </span>
      <span className={clsx("mt-1.5 block text-base font-mono tabular", color)}>
        {value}
      </span>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "h-8 px-3 rounded-md text-sm font-medium transition-colors duration-150 border inline-flex items-center gap-2",
        active
          ? "bg-text text-surface border-text"
          : "bg-surface text-text border-border hover:bg-surface-muted",
      )}
      aria-pressed={active}
    >
      <span className="lowercase">{label}</span>
      <span
        className={clsx(
          "text-[11px] font-mono tabular px-1.5 py-0.5 rounded-sm",
          active
            ? "bg-surface/20 text-surface"
            : "bg-surface-muted text-text-subtle",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function DecisionsList({
  rows,
  loading,
  isDemo,
}: {
  rows: Decision[];
  loading: boolean;
  isDemo: boolean;
}) {
  if (loading && rows.length === 0) {
    return (
      <Card>
        <p className="text-sm text-text-subtle font-mono">loading decisions…</p>
      </Card>
    );
  }
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader
          icon={<ActivityIcon size={16} strokeWidth={1.5} />}
          title="no decisions"
          badge={<Badge variant="empty">empty</Badge>}
        />
        <p className="text-sm font-mono text-text-subtle">
          no entries match the current filter. agent submits a new intent every 5
          minutes once running.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        icon={<ActivityIcon size={16} strokeWidth={1.5} />}
        title="decisions"
        badge={<Badge variant="ready">{rows.length} entries</Badge>}
      />
      <ul className="divide-y divide-border -mx-2">
        {rows.map((d) => (
          <DecisionRow key={d.id} d={d} isDemo={isDemo} />
        ))}
      </ul>
    </Card>
  );
}

function DecisionRow({ d, isDemo }: { d: Decision; isDemo: boolean }) {
  const [open, setOpen] = useState(false);
  let allocs: { asset: string; bps: number }[] = [];
  try {
    allocs = JSON.parse(d.allocationsJson);
  } catch {
    /* keep empty */
  }
  const totalBps = allocs.reduce((s, a) => s + a.bps, 0);

  return (
    <li className="px-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full py-3 flex items-center justify-between gap-3 text-sm text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="font-mono text-[12px] text-text-subtle w-12 text-right tabular shrink-0">
            #{d.nonce}
          </span>
          <span className="font-mono text-[12px] text-text-muted w-20 shrink-0">
            {formatTime(d.ts)}
          </span>
          <code className="font-mono text-[12px] text-text-subtle truncate hidden sm:inline">
            {d.intentHash.slice(0, 18)}…
          </code>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={mapStatus(d.status)}>{d.status}</Badge>
          <ChevronDown
            size={14}
            strokeWidth={1.5}
            className={clsx(
              "text-text-subtle transition-transform duration-150",
              open && "rotate-180",
            )}
          />
        </div>
      </button>

      {open && (
        <div className="pb-4 pt-1 px-2 space-y-3 bg-surface-muted -mx-2 px-4">
          <DetailRow label="timestamp">
            <span className="font-mono text-[12px] text-text">
              {new Date(d.ts).toLocaleString()}
            </span>
          </DetailRow>
          <DetailRow label="intent hash">
            <Address address={d.intentHash} start={10} end={8} withActions />
          </DetailRow>
          {d.txHash ? (
            <DetailRow label="tx hash">
              {isDemo ? (
                <span className="font-mono text-[12px] text-text-subtle inline-flex items-center gap-1.5">
                  {d.txHash.slice(0, 18)}…
                  <span
                    className="text-[10px] uppercase tracking-[0.08em] text-text-subtle"
                    title="demo data, no real chain tx"
                  >
                    demo
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-mono text-[12px]">
                  <span className="text-text">{d.txHash.slice(0, 18)}…</span>
                  <a
                    href={`https://sepolia.basescan.org/tx/${d.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-text-subtle hover:text-text transition-colors"
                    aria-label="open in basescan"
                  >
                    <ExternalLink size={12} strokeWidth={1.5} />
                  </a>
                </span>
              )}
            </DetailRow>
          ) : (
            <DetailRow label="tx hash">
              <span className="font-mono text-[12px] text-text-subtle">
                no transaction submitted
              </span>
            </DetailRow>
          )}
          <DetailRow label="allocations">
            {allocs.length > 0 ? (
              <ul className="space-y-1.5">
                {allocs.map((a) => (
                  <li
                    key={a.asset}
                    className="flex items-center justify-between gap-3 font-mono text-[12px]"
                  >
                    <Address address={a.asset} start={6} end={4} />
                    <span className="text-text tabular">
                      {(a.bps / 100).toFixed(1)}%
                    </span>
                  </li>
                ))}
                {totalBps < 10000 && (
                  <li className="flex items-center justify-between gap-3 font-mono text-[12px]">
                    <span className="text-text-subtle">idle</span>
                    <span className="text-text-subtle tabular">
                      {((10000 - totalBps) / 100).toFixed(1)}%
                    </span>
                  </li>
                )}
              </ul>
            ) : (
              <span className="font-mono text-[12px] text-text-subtle">
                allocations unavailable
              </span>
            )}
          </DetailRow>
          {d.errorMsg && (
            <DetailRow label="error">
              <span className="font-mono text-[12px] text-danger break-all">
                {d.errorMsg}
              </span>
            </DetailRow>
          )}
        </div>
      )}
    </li>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 items-start">
      <dt className="microlabel pt-0.5 flex items-center gap-1">
        <Hash size={10} strokeWidth={1.5} className="text-text-subtle" />
        {label}
      </dt>
      <dd>{children}</dd>
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

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 60 * 60_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 24 * 60 * 60_000) return `${Math.round(diff / (60 * 60_000))}h ago`;
  return `${Math.round(diff / (24 * 60 * 60_000))}d ago`;
}

function mapStatus(
  s: string,
): "enabled" | "blocked" | "ready" | "empty" | "low" | "high" {
  if (s === "success") return "enabled";
  if (s === "failed") return "blocked";
  if (s === "pending") return "ready";
  return "empty";
}
