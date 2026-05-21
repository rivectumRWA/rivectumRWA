"use client";
import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { Activity } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DEMO, demoApySeries, type ApyPoint } from "@/lib/demo";

/**
 * Blended target APY card. Today the agent picks a single underlying with the
 * highest probed APY; this card visualises that signal over time so users can
 * see the rebalancing logic responding to market shifts.
 *
 * Real data path: backend writes ApyPoint rows; we'd swap demoApySeries for a
 * /api/apy fetch. For now demo + empty state.
 */
export function ApyCard() {
  const { data, isDemo } = useMemo(() => {
    if (DEMO) return { data: demoApySeries(72), isDemo: true };
    return { data: [] as ApyPoint[], isDemo: false };
  }, []);

  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const last = data[data.length - 1]!.apy;
    const min = Math.min(...data.map((p) => p.apy));
    const max = Math.max(...data.map((p) => p.apy));
    const avg =
      data.reduce((s, p) => s + p.apy, 0) / data.length;
    return { last, min, max, avg };
  }, [data]);

  const isReady = data.length >= 2;

  return (
    <Card>
      <CardHeader
        icon={<Activity size={16} strokeWidth={1.5} />}
        title="target apy"
        badge={
          <div className="flex items-center gap-2">
            {isDemo && <Badge variant="neutral">demo</Badge>}
            <Badge variant={isReady ? "ready" : "empty"}>
              {isReady ? "tracking" : "no signal"}
            </Badge>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Stat
          label="now"
          value={stats ? `${stats.last.toFixed(2)}%` : "—"}
        />
        <Stat
          label="avg window"
          value={stats ? `${stats.avg.toFixed(2)}%` : "—"}
        />
        <Stat
          label="range"
          value={
            stats
              ? `${stats.min.toFixed(2)}% → ${stats.max.toFixed(2)}%`
              : "—"
          }
        />
      </div>

      <div className="h-[120px] -mx-2">
        {isReady ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <defs>
                <linearGradient id="apyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#B6F42C" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#B6F42C" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <YAxis
                hide
                domain={["dataMin - 0.5", "dataMax + 0.5"]}
              />
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
                  return [`${n.toFixed(2)}%`, "blended apy"];
                }}
                labelFormatter={(_, payload) => {
                  const ts = payload?.[0]?.payload?.ts as number | undefined;
                  if (!ts) return "";
                  return new Date(ts).toLocaleString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "short",
                  });
                }}
                cursor={{ stroke: "#D8D6CC", strokeWidth: 1, strokeDasharray: "2 2" }}
              />
              <Area
                type="monotone"
                dataKey="apy"
                stroke="#050505"
                strokeWidth={1.25}
                fill="url(#apyFill)"
                isAnimationActive={false}
                activeDot={{ r: 3, fill: "#050505" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm font-mono text-text-subtle">no signal</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-text-subtle border-t border-border pt-3">
        <span>{data.length} probes</span>
        <span>{isReady ? "1h cadence" : "—"}</span>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="microlabel block">{label}</span>
      <span className="mt-1 block text-base font-mono tabular text-text">{value}</span>
    </div>
  );
}
