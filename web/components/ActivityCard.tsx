"use client";
import { useEffect, useState } from "react";
import { Activity as ActivityIcon, ArrowUpRight } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DEMO, demoDecisions } from "@/lib/demo";

interface Decision {
  id: number;
  ts: number;
  intentHash: string;
  nonce: number;
  status: string;
  txHash: string | null;
  errorMsg: string | null;
}

export function ActivityCard() {
  const [rows, setRows] = useState<Decision[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const load = () =>
      fetch("/api/decisions")
        .then((r) => r.json())
        .then((data: Decision[]) => {
          if (data.length === 0 && DEMO) {
            setRows(demoDecisions(8));
            setIsDemo(true);
          } else {
            setRows(data);
            setIsDemo(false);
          }
          setLoaded(true);
        })
        .catch(() => {
          if (DEMO) {
            setRows(demoDecisions(8));
            setIsDemo(true);
          }
          setLoaded(true);
        });
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <Card span={2}>
      <CardHeader
        icon={<ActivityIcon size={16} strokeWidth={1.5} />}
        title="activity"
        badge={
          <div className="flex items-center gap-2">
            {isDemo && <Badge variant="neutral">demo</Badge>}
            <Badge variant={rows.length > 0 ? "ready" : "empty"}>
              {rows.length > 0 ? `${rows.length} entries` : "no signal"}
            </Badge>
          </div>
        }
      />
      {!loaded && (
        <p className="text-sm text-text-subtle font-mono">loading…</p>
      )}
      {loaded && rows.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm font-mono text-text-subtle">no decisions yet</p>
          <p className="microlabel mt-1">agent runs every 5 min</p>
        </div>
      )}
      {rows.length > 0 && (
        <ul className="divide-y divide-border -mx-2">
          {rows.slice(0, 10).map((r) => (
            <li
              key={r.id}
              className="px-2 py-2.5 flex items-center justify-between gap-3 text-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-[12px] text-text-subtle w-12 text-right tabular">
                  #{r.nonce}
                </span>
                <span className="font-mono text-[12px] text-text-muted">
                  {new Date(r.ts).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <code className="font-mono text-[12px] text-text-subtle truncate hidden sm:inline">
                  {r.intentHash.slice(0, 14)}…
                </code>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={mapStatus(r.status)}>{r.status}</Badge>
                {r.txHash && !isDemo && (
                  <a
                    href={`https://sepolia.basescan.org/tx/${r.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="view on basescan"
                    className="inline-flex w-7 h-7 items-center justify-center rounded-md border border-border hover:bg-surface-muted text-text-muted hover:text-text transition-colors"
                  >
                    <ArrowUpRight size={13} strokeWidth={1.5} />
                  </a>
                )}
                {r.txHash && isDemo && (
                  <span
                    className="inline-flex w-7 h-7 items-center justify-center rounded-md border border-border text-text-subtle"
                    aria-label="demo only, no real tx"
                    title="demo data, no real tx"
                  >
                    <ArrowUpRight size={13} strokeWidth={1.5} />
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function mapStatus(
  s: string,
): "enabled" | "blocked" | "ready" | "empty" | "low" | "high" {
  if (s === "success") return "enabled";
  if (s === "failed") return "blocked";
  if (s === "pending") return "ready";
  return "empty";
}
