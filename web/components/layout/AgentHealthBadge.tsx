"use client";
import useSWR from "swr";
import { Activity, Circle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { usePrivy } from "@privy-io/react-auth";
import type { AgentHealth } from "@/app/api/agent/health/route";

const STATUS_VARIANT: Record<AgentHealth["status"], "enabled" | "medium" | "high"> = {
  healthy: "enabled",
  stale: "medium",
  offline: "high",
};

const STATUS_LABEL: Record<AgentHealth["status"], string> = {
  healthy: "agent alive",
  stale: "agent stale",
  offline: "agent offline",
};

export function AgentHealthBadge() {
  const { getAccessToken } = usePrivy();

  const fetcher = async (url: string): Promise<AgentHealth> => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`health ${r.status}`);
    return r.json();
  };

  const { data, isLoading, error } = useSWR<AgentHealth>(
    "/api/agent/health",
    fetcher,
    { refreshInterval: 60_000, dedupingInterval: 30_000 },
  );

  const status: AgentHealth["status"] = data?.status ?? "offline";

  return (
    <div className="flex items-center gap-2.5">
      {isLoading ? (
        <Badge variant="neutral">
          <Circle size={8} className="animate-pulse" fill="currentColor" />
          probing
        </Badge>
      ) : error ? (
        <Badge variant="high">
          <Circle size={8} fill="currentColor" />
          agent unreachable
        </Badge>
      ) : (
        <div className="flex items-center gap-3">
          <Badge variant={STATUS_VARIANT[status]}>
            <Circle
              size={8}
              fill="currentColor"
              className={status === "healthy" ? "animate-pulse" : ""}
            />
            {STATUS_LABEL[status]}
          </Badge>

          {data != null && data.lastDecisionAgeSec !== null && (
            <span className="text-[11px] font-mono text-text-muted">
              last rebalance{" "}
              {fmtAge(data.lastDecisionAgeSec)} ago
              {data.totalDecisions > 0 && (
                <span className="text-text-subtle">
                  {" · "}{data.totalDecisions} total
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function fmtAge(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}
