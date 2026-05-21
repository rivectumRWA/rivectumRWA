"use client";
import { useReadContract } from "wagmi";
import { type Address } from "viem";
import { Cpu, Copy, ArrowUpRight, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { VAULT_ABI } from "@/lib/abi";
import {
  DEMO,
  DEMO_VAULT_ADDRESS,
  DEMO_AGENT_DID,
  DEMO_OWNER_ADDRESS,
} from "@/lib/demo";

const ENV_VAULT = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? "0x0") as Address;
const ZERO = "0x0000000000000000000000000000000000000000";

function isLiveAddr(a: string | undefined | null): a is string {
  if (!a) return false;
  if (a === "0x0") return false;
  return a.toLowerCase() !== ZERO;
}

export function ContractCard() {
  const vaultIsLive = isLiveAddr(ENV_VAULT);

  const { data: agentDid } = useReadContract({
    address: ENV_VAULT,
    abi: VAULT_ABI,
    functionName: "agentDid",
    query: { enabled: vaultIsLive },
  });
  const { data: owner } = useReadContract({
    address: ENV_VAULT,
    abi: VAULT_ABI,
    functionName: "owner",
    query: { enabled: vaultIsLive },
  });

  // When real address is unavailable AND demo mode is on, render plausible
  // placeholders so the card stops contradicting the rest of the dashboard.
  const useDemo = !vaultIsLive && DEMO;

  const vault = vaultIsLive ? ENV_VAULT : useDemo ? DEMO_VAULT_ADDRESS : null;
  const agent =
    (agentDid as string | undefined) ?? (useDemo ? DEMO_AGENT_DID : null);
  const ownerAddr =
    (owner as string | undefined) ?? (useDemo ? DEMO_OWNER_ADDRESS : null);

  const status = vaultIsLive ? "live" : useDemo ? "demo" : "no deploy";
  const variant = vaultIsLive ? "ready" : useDemo ? "neutral" : "empty";

  return (
    <Card>
      <CardHeader
        icon={<Cpu size={16} strokeWidth={1.5} />}
        title="contracts"
        badge={<Badge variant={variant}>{status}</Badge>}
      />
      <dl className="space-y-3">
        <AddrRow label="vault" value={vault} simulated={useDemo} />
        <AddrRow label="agent did" value={agent} simulated={useDemo} />
        <AddrRow label="owner" value={ownerAddr} simulated={useDemo} />
        <Row label="network" value="base sepolia" />
      </dl>
      {useDemo && (
        <p className="mt-3 text-[11px] font-mono text-text-subtle border-t border-border pt-2">
          demo addresses · not real onchain
        </p>
      )}
    </Card>
  );
}

function AddrRow({
  label,
  value,
  simulated,
}: {
  label: string;
  value: string | null;
  simulated: boolean;
}) {
  if (!value || value.toLowerCase() === ZERO) {
    return (
      <div className="flex items-center justify-between gap-3">
        <dt className="microlabel">{label}</dt>
        <dd className="text-[12px] font-mono text-text-subtle">not set</dd>
      </div>
    );
  }
  const link = `https://sepolia.basescan.org/address/${value}`;
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="microlabel">{label}</dt>
      <dd className="flex items-center gap-1.5">
        {simulated ? (
          <span
            className="text-[12px] font-mono text-text"
            title="demo address"
          >
            {short(value)}
          </span>
        ) : (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="text-[12px] font-mono text-text hover:underline underline-offset-2"
          >
            {short(value)}
          </a>
        )}
        <CopyButton value={value} />
        {!simulated && (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-6 h-6 items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-surface-muted"
            aria-label={`open ${label} in basescan`}
          >
            <ArrowUpRight size={12} strokeWidth={1.5} />
          </a>
        )}
      </dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="microlabel">{label}</dt>
      <dd className="text-sm text-text lowercase">{value}</dd>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1200);
    return () => clearTimeout(id);
  }, [copied]);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          /* clipboard blocked, ignore */
        }
      }}
      className="inline-flex w-6 h-6 items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-surface-muted"
      aria-label="copy address"
    >
      {copied ? (
        <Check size={12} strokeWidth={2} className="text-success" />
      ) : (
        <Copy size={12} strokeWidth={1.5} />
      )}
    </button>
  );
}

function short(v: string) {
  if (!v || v.length < 12) return v;
  return `${v.slice(0, 6)}…${v.slice(-4)}`;
}
