"use client";
import { useReadContract, useReadContracts } from "wagmi";
import { type Address } from "viem";
import { Library, ArrowUpRight } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { VAULT_ABI, ERC4626_ABI } from "@/lib/abi";
import { DEMO, DEMO_UNDERLYING_LIST } from "@/lib/demo";

const VAULT = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? "0x0") as Address;

interface UnderlyingMeta {
  address: string;
  symbol: string | null;
  name: string | null;
}

export function UnderlyingsCard() {
  const { data: addrs } = useReadContract({
    address: VAULT,
    abi: VAULT_ABI,
    functionName: "getUnderlyings",
    query: { refetchInterval: 30000 },
  });

  const list = (addrs as readonly string[] | undefined) ?? [];

  const { data: metas } = useReadContracts({
    contracts: list.flatMap((a) => [
      {
        address: a as Address,
        abi: ERC4626_ABI,
        functionName: "symbol",
      } as const,
      {
        address: a as Address,
        abi: ERC4626_ABI,
        functionName: "name",
      } as const,
    ]),
    query: { enabled: list.length > 0 },
  });

  const items: UnderlyingMeta[] =
    list.length === 0 && DEMO
      ? DEMO_UNDERLYING_LIST.map((d) => ({
          address: d.address,
          symbol: d.symbol,
          name: d.name,
        }))
      : list.map((a, i) => {
          const symRes = metas?.[i * 2];
          const nameRes = metas?.[i * 2 + 1];
          const symbol =
            symRes?.status === "success" ? (symRes.result as string) : null;
          const name =
            nameRes?.status === "success" ? (nameRes.result as string) : null;
          return { address: a, symbol, name };
        });

  return (
    <Card span={2}>
      <CardHeader
        icon={<Library size={16} strokeWidth={1.5} />}
        title="underlyings registry"
        badge={
          <Badge variant={items.length > 0 ? "ready" : "empty"}>
            {items.length > 0 ? `${items.length} whitelisted` : "empty"}
          </Badge>
        }
      />
      {items.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm font-mono text-text-subtle">
            no underlyings whitelisted
          </p>
          <p className="microlabel mt-1">owner adds via addUnderlying()</p>
        </div>
      ) : (
        <ul className="divide-y divide-border -mx-2">
          {items.map((u) => (
            <li
              key={u.address}
              className="px-2 py-3 flex items-center justify-between gap-3"
            >
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text">
                    {u.symbol ?? "—"}
                  </span>
                  <span className="text-[12px] text-text-muted">
                    {u.name ?? "unknown vault"}
                  </span>
                </div>
                <code className="text-[11px] font-mono text-text-subtle truncate">
                  {short(u.address)}
                </code>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="enabled">enabled</Badge>
                <a
                  href={`https://sepolia.basescan.org/address/${u.address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-7 h-7 items-center justify-center rounded-md border border-border hover:bg-surface-muted text-text-muted hover:text-text"
                  aria-label="view on basescan"
                >
                  <ArrowUpRight size={13} strokeWidth={1.5} />
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function short(v: string) {
  if (!v || v.length < 12) return v;
  return `${v.slice(0, 6)}…${v.slice(-4)}`;
}
