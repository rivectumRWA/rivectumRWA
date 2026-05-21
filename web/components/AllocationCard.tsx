"use client";
import { useEffect, useMemo, useState } from "react";
import { PieChart as PieIcon, Wifi } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DEMO, demoDecisions } from "@/lib/demo";

interface Decision {
  id: number;
  ts: number;
  allocationsJson: string;
  status: string;
}

interface Alloc {
  asset: string;
  bps: number;
}

const PALETTE = ["#000000", "#5F666A", "#B6F42C", "#A86A12", "#1E5BB7"];

export function AllocationCard() {
  const [latest, setLatest] = useState<Decision | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const load = () =>
      fetch("/api/decisions")
        .then((r) => r.json())
        .then((rows: Decision[]) => {
          if (rows.length === 0 && DEMO) {
            const demo = demoDecisions(1)[0];
            setLatest(demo ?? null);
            setIsDemo(true);
          } else {
            const success =
              rows.find((r) => r.status === "success") ?? rows[0] ?? null;
            setLatest(success);
            setIsDemo(false);
          }
          setLoaded(true);
        })
        .catch(() => {
          if (DEMO) {
            const demo = demoDecisions(1)[0];
            setLatest(demo ?? null);
            setIsDemo(true);
          }
          setLoaded(true);
        });
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  const allocs = useMemo<Alloc[]>(() => {
    if (!latest) return [];
    try {
      return JSON.parse(latest.allocationsJson);
    } catch {
      return [];
    }
  }, [latest]);

  const idle = useMemo(() => {
    const used = allocs.reduce((s, a) => s + a.bps, 0);
    return Math.max(0, 10000 - used);
  }, [allocs]);

  const chartData = useMemo(() => {
    const rows = allocs.map((a, i) => ({
      name: short(a.asset),
      value: a.bps,
      fill: PALETTE[i % PALETTE.length],
    }));
    if (idle > 0) {
      rows.push({ name: "idle", value: idle, fill: "#E5E3D8" });
    }
    return rows;
  }, [allocs, idle]);

  const status: "ready" | "empty" | "fresh" = !loaded
    ? "fresh"
    : allocs.length > 0
      ? "ready"
      : "empty";

  return (
    <Card>
      <CardHeader
        icon={<PieIcon size={16} strokeWidth={1.5} />}
        title="allocations"
        badge={
          <div className="flex items-center gap-2">
            {isDemo && <Badge variant="neutral">demo</Badge>}
            <Badge variant={status}>
              {status === "ready" ? "active" : status}
            </Badge>
          </div>
        }
      />
      {chartData.length === 0 ? (
        <EmptyAllocation />
      ) : (
        <div className="grid grid-cols-[88px_1fr] gap-4 items-center">
          <div className="h-22">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  innerRadius={28}
                  outerRadius={42}
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                  isAnimationActive={false}
                >
                  {chartData.map((c, i) => (
                    <Cell key={i} fill={c.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-1.5 text-[12px] font-mono">
            {chartData.map((row) => (
              <li
                key={row.name}
                className="flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="inline-block w-2 h-2 rounded-sm shrink-0"
                    style={{ backgroundColor: row.fill }}
                  />
                  <span className="text-text truncate">{row.name}</span>
                </span>
                <span className="text-text-muted tabular shrink-0">
                  {(row.value / 100).toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function EmptyAllocation() {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3">
      <div className="w-16 h-16 rounded-full border-2 border-dashed border-border flex items-center justify-center text-text-subtle">
        <Wifi size={20} strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <p className="text-sm font-mono text-text">awaiting agent</p>
        <p className="microlabel mt-1">first rebalance unlocks chart</p>
      </div>
    </div>
  );
}

function short(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
