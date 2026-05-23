"use client";
import useSWR from "swr";
import { BarChart3, TrendingUp } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { usePrivy } from "@privy-io/react-auth";
import type { YieldEntry } from "@/app/api/vault/yield/route";

export function YieldLeaderboard() {
  const { getAccessToken } = usePrivy();

  const fetcher = async (url: string): Promise<YieldEntry[]> => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`yield ${r.status}`);
    return r.json();
  };

  const { data, isLoading, error } = useSWR<YieldEntry[]>(
    "/api/vault/yield",
    fetcher,
    { refreshInterval: 60_000, dedupingInterval: 30_000 },
  );

  const entries = data ?? [];

  return (
    <Card>
      <CardHeader
        icon={<TrendingUp size={16} strokeWidth={1.5} />}
        title="yield leaderboard"
        badge={
          <Badge variant={isLoading ? "fresh" : entries.length > 0 ? "ready" : "empty"}>
            {isLoading ? "probing" : entries.length > 0 ? `${entries.length} vaults` : "no signal"}
          </Badge>
        }
      />

      {isLoading ? (
        <p className="text-sm text-text-subtle font-mono">probing underlying apy…</p>
      ) : error ? (
        <p className="text-sm text-text-subtle font-mono">yield feed unavailable</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-text-subtle font-mono">
          no underlying vaults registered
        </p>
      ) : (
        <div className="space-y-2">
          {/* Header row */}
          <div className="flex items-center text-[11px] font-mono uppercase tracking-[0.08em] text-text-subtle px-1 pb-2 border-b border-border">
            <span className="w-6 text-center">#</span>
            <span className="flex-1">vault</span>
            <span className="w-24 text-right">apy</span>
            <span className="w-20 text-right">score</span>
          </div>

          {entries.map((entry, i) => (
            <div
              key={entry.address}
              className="flex items-center py-2 px-1 rounded-md hover:bg-surface-muted transition-colors"
            >
              <span className="w-6 text-center text-xs font-mono tabular text-text-muted">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">
                  {entry.symbol}
                  <span className="text-text-muted font-normal ml-1.5">
                    {entry.name}
                  </span>
                </p>
              </div>
              <span
                className={`w-24 text-right text-sm font-mono tabular font-semibold ${
                  entry.apyBps > 800 ? "text-success" : entry.apyBps > 400 ? "text-text" : "text-text-muted"
                }`}
              >
                {entry.apyDisplay}
              </span>
              <span className="w-20 text-right text-xs font-mono tabular text-text-subtle">
                {entry.source === "demo" ? "demo" : `${(entry.rawScore / 1e6).toFixed(4)}`}
              </span>
            </div>
          ))}

          {/* Blended summary */}
          {entries.length >= 2 && (
            <div className="pt-2 mt-1 border-t border-border flex items-center gap-2 text-xs text-text-muted">
              <BarChart3 size={12} strokeWidth={1.5} />
              <span>
                blended estimate:{" "}
                <span className="font-mono tabular text-text">
                  {blendApy(entries)}
                </span>
                {" "}(weighted 60/40 split)
              </span>
            </div>
          )}

          <p className="text-[10px] font-mono text-text-subtle pt-1 border-t border-border mt-1">
            apy proxy via <code>convertToAssets(1e18)</code> · higher = better return per share · unaudited
          </p>
        </div>
      )}
    </Card>
  );
}

function blendApy(entries: YieldEntry[]): string {
  if (entries.length === 0) return "—";
  if (entries.length === 1) return entries[0].apyDisplay;
  // Top gets 60%, second gets 40%
  const wavg = entries[0].apyBps * 0.6 + entries[1].apyBps * 0.4;
  return `${(wavg / 100).toFixed(2)}%`;
}
