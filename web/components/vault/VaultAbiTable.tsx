"use client";
import { Code2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { VAULT_ABI } from "@/lib/abi";
import { useVaultSnapshot } from "@/lib/useVaultSnapshot";

interface Row {
  name: string;
  signature: string;
  value: string;
}

export function VaultAbiTable() {
  const { data } = useVaultSnapshot();
  const reads = VAULT_ABI.filter(
    (e) => e.type === "function" && e.stateMutability === "view",
  );

  const liveValues: Record<string, string | undefined> = {
    paused: data ? String(data.paused) : undefined,
    owner: data?.owner ?? undefined,
    agentDid: data?.agentDid ?? undefined,
    nextNonce: data ? String(data.nextNonce) : undefined,
    totalAssets: data ? `${data.totalAssets} usdc` : undefined,
    totalSupply: data ? `${data.totalSupply} shares` : undefined,
    asset: data?.asset ?? undefined,
    getUnderlyings: data ? `${data.underlyings.length} addrs` : undefined,
  };

  const rows: Row[] = reads.map((e) => ({
    name: e.name,
    signature: signatureOf(e),
    value: liveValues[e.name] ?? "—",
  }));

  return (
    <Card>
      <CardHeader
        icon={<Code2 size={16} strokeWidth={1.5} />}
        title="contract reads"
        badge={<Badge variant="neutral">{rows.length} fns</Badge>}
      />
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-subtle border-b border-border">
              <th className="px-2 py-2 microlabel font-medium">function</th>
              <th className="px-2 py-2 microlabel font-medium">signature</th>
              <th className="px-2 py-2 microlabel font-medium text-right">
                current value
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.name}>
                <td className="px-2 py-2 font-medium text-text">{r.name}</td>
                <td className="px-2 py-2 font-mono text-[12px] text-text-muted">
                  {r.signature}
                </td>
                <td className="px-2 py-2 font-mono text-[12px] text-text text-right tabular truncate max-w-[280px]">
                  {r.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 pt-3 text-[11px] font-mono text-text-subtle border-t border-border">
        only view fns shown. write surface (deposit, withdraw, rebalance,
        setPaused, emergencyWithdrawAll) lives in their own cards.
      </p>
    </Card>
  );
}

function signatureOf(entry: (typeof VAULT_ABI)[number]): string {
  const inputs = (entry.inputs ?? []).map((i) => i.type).join(",");
  const outputs = (entry.outputs ?? []).map((o) => o.type).join(",");
  return outputs ? `(${inputs}) → (${outputs})` : `(${inputs})`;
}
