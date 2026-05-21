"use client";
import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { type Address, formatUnits } from "viem";
import { VAULT_ABI } from "@/lib/abi";
import { DEMO, DEMO_TVL_USDC, demoDecisions } from "@/lib/demo";

const VAULT = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? "0x0") as Address;

interface Decision {
  id: number;
  ts: number;
  status: string;
}

export function KpiStrip() {
  const { address } = useAccount();
  const [latest, setLatest] = useState<Decision | null>(null);

  const { data: totalAssets } = useReadContract({
    address: VAULT,
    abi: VAULT_ABI,
    functionName: "totalAssets",
    query: { refetchInterval: 15000 },
  });

  const { data: myShares } = useReadContract({
    address: VAULT,
    abi: VAULT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15000 },
  });

  useEffect(() => {
    const load = () =>
      fetch("/api/decisions")
        .then((r) => r.json())
        .then((rows: Decision[]) => {
          if (rows.length > 0) setLatest(rows[0]);
          else if (DEMO) setLatest(demoDecisions(1)[0] ?? null);
        })
        .catch(() => {
          if (DEMO) setLatest(demoDecisions(1)[0] ?? null);
        });
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  const tvlRaw =
    (totalAssets as bigint | undefined) ?? (DEMO ? DEMO_TVL_USDC : undefined);
  const tvl = tvlRaw !== undefined ? formatUnits(tvlRaw, 6) : "0";
  const sharesRaw = myShares as bigint | undefined;
  const mine =
    sharesRaw !== undefined
      ? formatUnits(sharesRaw, 18)
      : address
        ? "0"
        : "—";
  const heartbeat = latest ? formatRelative(latest.ts) : address ? "no signal" : "idle";
  const heartbeatStatus = latest?.status ?? (address ? "awaiting" : "wallet off");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Kpi label="vault tvl" value={tvl} unit="usdc" />
      <Kpi
        label="my shares"
        value={mine}
        unit={address ? "arwa" : "wallet not connected"}
        muted={!address}
      />
      <Kpi
        label="agent heartbeat"
        value={heartbeat}
        unit={heartbeatStatus}
        mono={false}
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  unit,
  mono = true,
  muted,
}: {
  label: string;
  value: string;
  unit: string;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="card-glyph relative bg-surface border border-border rounded-lg px-4 py-3">
      <span className="glyph-tr">+</span>
      <span className="glyph-bl">+</span>
      <p className="microlabel">{label}</p>
      <p
        className={`mt-1 text-[22px] font-semibold leading-tight tracking-tight ${
          mono ? "font-mono tabular" : "lowercase"
        } ${muted ? "text-text-subtle" : "text-text"}`}
      >
        {truncate(value)}
      </p>
      <p className="mt-0.5 microlabel text-text-subtle">{unit}</p>
    </div>
  );
}

function truncate(v: string) {
  if (v === "—") return v;
  const num = Number(v);
  if (Number.isFinite(num)) {
    if (Math.abs(num) >= 1000)
      return num.toLocaleString("en-US", { maximumFractionDigits: 0 });
    return num.toLocaleString("en-US", { maximumFractionDigits: 4 });
  }
  return v;
}

function formatRelative(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
