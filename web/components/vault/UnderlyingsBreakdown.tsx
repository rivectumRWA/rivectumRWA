"use client";
import { Layers } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useVaultSnapshot } from "@/lib/useVaultSnapshot";
import { Address } from "./AddressLink";
import { clsx } from "@/lib/clsx";

export function UnderlyingsBreakdown() {
  const { data, isLoading } = useVaultSnapshot();
  const underlyings = data?.underlyings ?? [];

  const totalRedeem = underlyings.reduce(
    (sum, u) => sum + Number(u.redeemValueUsdc),
    0,
  );
  const totalAssets = data ? Number(data.totalAssets) : 0;
  const idle = Math.max(0, totalAssets - totalRedeem);

  return (
    <Card>
      <CardHeader
        icon={<Layers size={16} strokeWidth={1.5} />}
        title="underlyings breakdown"
        badge={
          <Badge variant={isLoading ? "fresh" : underlyings.length > 0 ? "ready" : "empty"}>
            {isLoading
              ? "loading"
              : underlyings.length > 0
                ? `${underlyings.length} whitelisted`
                : "no signal"}
          </Badge>
        }
      />

      {isLoading ? (
        <p className="text-sm text-text-subtle font-mono">loading registry…</p>
      ) : underlyings.length === 0 ? (
        <p className="text-sm text-text-subtle font-mono">
          no underlying vaults whitelisted
        </p>
      ) : (
        <div className="space-y-3">
          <ul className="divide-y divide-border">
            {underlyings.map((u) => {
              const redeem = Number(u.redeemValueUsdc);
              const pct = totalAssets > 0 ? (redeem / totalAssets) * 100 : 0;
              return (
                <li key={u.address} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text">
                        {u.symbol}{" "}
                        <span className="text-text-subtle font-normal">
                          {u.name}
                        </span>
                      </p>
                      <p className="text-[11px] mt-0.5">
                        <Address address={u.address} />
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono tabular text-text">
                        {fmtUsdc(redeem)}
                      </p>
                      <p className="text-[11px] font-mono text-text-subtle">
                        {pct.toFixed(1)}% of tvl
                      </p>
                    </div>
                  </div>
                  <Bar pct={pct} />
                </li>
              );
            })}
          </ul>

          <IdleRow idle={idle} totalAssets={totalAssets} />
        </div>
      )}
    </Card>
  );
}

function IdleRow({ idle, totalAssets }: { idle: number; totalAssets: number }) {
  const pct = totalAssets > 0 ? (idle / totalAssets) * 100 : 0;
  return (
    <div className="pt-3 border-t border-border-strong">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-medium text-text">idle usdc</p>
          <p className="text-[11px] text-text-subtle font-mono">
            held by vault, not yet routed
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-mono tabular text-text">{fmtUsdc(idle)}</p>
          <p className="text-[11px] font-mono text-text-subtle">
            {pct.toFixed(1)}% of tvl
          </p>
        </div>
      </div>
      <Bar pct={pct} muted />
    </div>
  );
}

function Bar({ pct, muted }: { pct: number; muted?: boolean }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-1 w-full bg-surface-muted rounded-full overflow-hidden">
      <div
        className={clsx(
          "h-full rounded-full transition-[width] duration-500",
          muted ? "bg-border-strong" : "bg-text",
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function fmtUsdc(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(2)}M usdc`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}k usdc`;
  return `${n.toFixed(2)} usdc`;
}
