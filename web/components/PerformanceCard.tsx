"use client";
import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";
import { useReadContract } from "wagmi";
import { type Address } from "viem";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { VAULT_ABI } from "@/lib/abi";
import { DEMO, demoSharePriceSeries, type PerfPoint } from "@/lib/demo";

const VAULT = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? "0x0") as Address;
const STORAGE_KEY = "perf-history-v1";
const MAX_POINTS = 48;

interface StoredPoint {
  ts: number;
  sharePrice: number;
}

/**
 * Live share price = (totalAssets + 1e6) / (totalSupply + 1e18)  ≈ assets per share.
 * We snapshot it client-side every minute and persist to localStorage so the line
 * has continuity across reloads even before a backend timeseries exists.
 */
export function PerformanceCard() {
  const [series, setSeries] = useState<PerfPoint[]>([]);
  const [isDemo, setIsDemo] = useState(false);

  const { data: totalAssets } = useReadContract({
    address: VAULT,
    abi: VAULT_ABI,
    functionName: "totalAssets",
    query: { refetchInterval: 60_000 },
  });

  const { data: totalSupply } = useReadContract({
    address: VAULT,
    abi: VAULT_ABI,
    functionName: "totalSupply",
    query: { refetchInterval: 60_000 },
  });

  // Hydrate from localStorage on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredPoint[];
        if (Array.isArray(parsed)) setSeries(parsed);
      }
    } catch {
      /* ignore corrupt cache */
    }
  }, []);

  // Append a new sample whenever both reads are non-null.
  useEffect(() => {
    if (totalAssets === undefined || totalSupply === undefined) return;
    const ts = totalSupply as bigint;
    const ta = totalAssets as bigint;
    if (ts === 0n) return; // no shares minted yet, skip sample
    // sharePrice = totalAssets (6dec) / totalSupply (18dec) → scale to a clean number
    // Use floats only for display; precision loss here is fine.
    const price = Number(ta) / 1e6 / (Number(ts) / 1e18);
    if (!Number.isFinite(price) || price <= 0) return;
    const point: PerfPoint = { ts: Date.now(), sharePrice: +price.toFixed(6) };
    setSeries((prev) => {
      const next = [...prev.slice(-(MAX_POINTS - 1)), point];
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* quota / private mode → ignore */
      }
      return next;
    });
    setIsDemo(false);
  }, [totalAssets, totalSupply]);

  const chartData = useMemo<PerfPoint[]>(() => {
    if (series.length >= 2) return series;
    if (DEMO) {
      return demoSharePriceSeries(MAX_POINTS);
    }
    return series;
  }, [series]);

  // Lazy-flag demo whenever we synthesise the line.
  useEffect(() => {
    if (series.length < 2 && DEMO) setIsDemo(true);
  }, [series.length]);

  const stats = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0]!.sharePrice;
    const last = chartData[chartData.length - 1]!.sharePrice;
    const deltaPct = ((last - first) / first) * 100;
    const min = Math.min(...chartData.map((p) => p.sharePrice));
    const max = Math.max(...chartData.map((p) => p.sharePrice));
    return { first, last, deltaPct, min, max };
  }, [chartData]);

  const isReady = chartData.length >= 2;

  return (
    <Card>
      <CardHeader
        icon={<TrendingUp size={16} strokeWidth={1.5} />}
        title="performance"
        badge={
          <div className="flex items-center gap-2">
            {isDemo && <Badge variant="neutral">demo</Badge>}
            <Badge variant={isReady ? "ready" : "fresh"}>
              {isReady ? "live" : "warming up"}
            </Badge>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Stat label="share price" value={stats ? stats.last.toFixed(6) : "—"} />
        <Stat
          label="window change"
          value={stats ? formatDelta(stats.deltaPct) : "—"}
          tone={
            stats
              ? stats.deltaPct >= 0
                ? "positive"
                : "negative"
              : "neutral"
          }
        />
        <Stat
          label="window range"
          value={
            stats
              ? `${stats.min.toFixed(4)} → ${stats.max.toFixed(4)}`
              : "—"
          }
        />
      </div>

      <div className="h-[140px] -mx-2">
        {isReady ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <YAxis
                hide
                domain={["dataMin - 0.0005", "dataMax + 0.0005"]}
              />
              <XAxis dataKey="ts" hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #D8D6CC",
                  borderRadius: 4,
                  fontSize: 11,
                  fontFamily: "var(--font-jetbrains)",
                  padding: "6px 8px",
                }}
                labelStyle={{ color: "#5F666A", fontSize: 10 }}
                formatter={(v) => {
                  const n = typeof v === "number" ? v : Number(v);
                  return [n.toFixed(6), "share price"];
                }}
                labelFormatter={(t) => {
                  const ts = typeof t === "number" ? t : Number(t);
                  if (!Number.isFinite(ts)) return "";
                  return new Date(ts).toLocaleString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "short",
                  });
                }}
                cursor={{ stroke: "#D8D6CC", strokeWidth: 1, strokeDasharray: "2 2" }}
              />
              <Line
                type="monotone"
                dataKey="sharePrice"
                stroke="#050505"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: "#050505" }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm font-mono text-text-subtle">
              warming up · waiting for second sample
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-text-subtle border-t border-border pt-3">
        <span>{chartData.length} samples</span>
        <span>{intervalLabel(chartData)}</span>
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
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
      <span className="microlabel block">{label}</span>
      <span className={`mt-1 block text-base font-mono tabular ${color}`}>{value}</span>
    </div>
  );
}

function formatDelta(pct: number) {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(3)}%`;
}

function intervalLabel(points: PerfPoint[]): string {
  if (points.length < 2) return "—";
  const first = points[0]!.ts;
  const last = points[points.length - 1]!.ts;
  const spanMs = last - first;
  const hours = spanMs / (60 * 60 * 1000);
  if (hours >= 24) return `${(hours / 24).toFixed(1)}d window`;
  if (hours >= 1) return `${hours.toFixed(1)}h window`;
  const mins = spanMs / 60_000;
  return `${mins.toFixed(0)}m window`;
}
