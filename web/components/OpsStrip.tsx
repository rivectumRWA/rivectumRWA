"use client";
import { useReadContract } from "wagmi";
import { type Address } from "viem";
import { useEffect, useState } from "react";
import { VAULT_ABI } from "@/lib/abi";
import { DEMO, demoDecisions } from "@/lib/demo";

const VAULT = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? "0x0") as Address;

interface Decision {
  txHash: string | null;
  ts: number;
  status: string;
}

export function OpsStrip() {
  const { data: paused } = useReadContract({
    address: VAULT,
    abi: VAULT_ABI,
    functionName: "paused",
    query: { refetchInterval: 30000 },
  });

  const [latestTx, setLatestTx] = useState<Decision | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const load = () =>
      fetch("/api/decisions")
        .then((r) => r.json())
        .then((rows: Decision[]) => {
          if (rows.length === 0 && DEMO) {
            const tx = demoDecisions(8).find((r) => r.txHash) ?? null;
            setLatestTx(tx);
            setIsDemo(true);
          } else {
            const tx = rows.find((r) => r.txHash) ?? null;
            setLatestTx(tx);
            setIsDemo(false);
          }
        })
        .catch(() => {
          if (DEMO) {
            const tx = demoDecisions(8).find((r) => r.txHash) ?? null;
            setLatestTx(tx);
            setIsDemo(true);
          }
        });
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const isPaused = paused === true;

  return (
    <footer className="card-glyph relative bg-bg-elevated border border-border rounded-lg px-5 py-3">
      <span className="glyph-tr">+</span>
      <span className="glyph-bl">+</span>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 bg-accent rounded-full" />
          <span className="microlabel">vault ops</span>
        </div>
        <span className="microlabel text-text-subtle">F-001 · v0.1</span>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
        <Stat
          label="vault"
          value={isPaused ? "paused" : "live"}
          tone={isPaused ? "danger" : "ok"}
        />
        <Stat label="agent" value="active" tone="ok" />
        <Stat label="network" value="base-sepolia" />
        <Stat
          label="last tx"
          value={latestTx?.txHash ? short(latestTx.txHash) : "none"}
          mono
          tone={latestTx?.txHash ? undefined : "muted"}
          href={
            latestTx?.txHash && !isDemo
              ? `https://sepolia.basescan.org/tx/${latestTx.txHash}`
              : undefined
          }
        />
      </dl>
    </footer>
  );
}

function Stat({
  label,
  value,
  tone,
  mono,
  href,
}: {
  label: string;
  value: string;
  tone?: "ok" | "danger" | "muted";
  mono?: boolean;
  href?: string;
}) {
  const cls =
    tone === "ok"
      ? "text-success"
      : tone === "danger"
        ? "text-danger"
        : tone === "muted"
          ? "text-text-subtle"
          : "text-text";
  const valueEl = (
    <span
      className={`text-sm ${cls} ${mono ? "font-mono tabular" : "lowercase"}`}
    >
      {value}
    </span>
  );
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="microlabel">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="hover:underline underline-offset-2"
        >
          {valueEl}
        </a>
      ) : (
        valueEl
      )}
    </div>
  );
}

function short(h: string) {
  return `${h.slice(0, 6)}…${h.slice(-4)}`;
}
