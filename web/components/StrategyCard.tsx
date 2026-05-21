"use client";
import { useReadContract } from "wagmi";
import { type Address } from "viem";
import { ScrollText } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { VAULT_ABI } from "@/lib/abi";

const VAULT = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? "0x0") as Address;

export function StrategyCard() {
  const { data: nextNonce } = useReadContract({
    address: VAULT,
    abi: VAULT_ABI,
    functionName: "nextNonce",
    query: { refetchInterval: 15000 },
  });

  const nonce = nextNonce !== undefined ? String(nextNonce) : "—";

  return (
    <Card>
      <CardHeader
        icon={<ScrollText size={16} strokeWidth={1.5} />}
        title="strategy"
        badge={<Badge variant="ready">live</Badge>}
      />
      <dl className="space-y-3">
        <Row label="codename" value="top-2 apy weighted 60/40" />
        <Row label="cap per asset" value="60% (6000 bps)" />
        <Row label="rebalance interval" value="5 min" />
        <Row label="next nonce" value={nonce} mono />
        <Row label="signing" value="ecdsa secp256k1" mono />
      </dl>
    </Card>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="microlabel">{label}</dt>
      <dd
        className={`text-sm text-text ${mono ? "font-mono tabular" : "lowercase"}`}
      >
        {value}
      </dd>
    </div>
  );
}
