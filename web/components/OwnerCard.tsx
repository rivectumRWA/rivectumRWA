"use client";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { type Address } from "viem";
import { ShieldAlert, Pause, Play, Siren } from "lucide-react";
import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { VAULT_ABI } from "@/lib/abi";

const VAULT = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? "0x0") as Address;

export function OwnerCard() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [status, setStatus] = useState<{ kind: "info" | "error"; msg: string } | null>(
    null,
  );

  const { data: owner } = useReadContract({
    address: VAULT,
    abi: VAULT_ABI,
    functionName: "owner",
  });
  const { data: paused, refetch: refetchPaused } = useReadContract({
    address: VAULT,
    abi: VAULT_ABI,
    functionName: "paused",
    query: { refetchInterval: 15000 },
  });

  const isOwner =
    !!address &&
    !!owner &&
    (owner as string).toLowerCase() === address.toLowerCase();

  if (!isOwner) return null; // owner-only card

  const isPaused = paused === true;

  const handlePauseToggle = async () => {
    setStatus(null);
    try {
      setStatus({ kind: "info", msg: isPaused ? "unpausing…" : "pausing…" });
      await writeContractAsync({
        address: VAULT,
        abi: VAULT_ABI,
        functionName: "setPaused",
        args: [!isPaused],
      });
      await refetchPaused();
      setStatus({ kind: "info", msg: isPaused ? "vault live" : "vault paused" });
    } catch (err) {
      setStatus({
        kind: "error",
        msg: err instanceof Error ? err.message.split("\n")[0].slice(0, 120) : "tx failed",
      });
    }
  };

  const handleEmergency = async () => {
    if (
      !window.confirm(
        "Redeem ALL funds from underlying vaults back to USDC? This is owner-only and irreversible for this rebalance cycle.",
      )
    ) {
      return;
    }
    setStatus(null);
    try {
      setStatus({ kind: "info", msg: "withdrawing all underlyings…" });
      await writeContractAsync({
        address: VAULT,
        abi: VAULT_ABI,
        functionName: "emergencyWithdrawAll",
      });
      setStatus({ kind: "info", msg: "emergency withdraw submitted" });
    } catch (err) {
      setStatus({
        kind: "error",
        msg: err instanceof Error ? err.message.split("\n")[0].slice(0, 120) : "tx failed",
      });
    }
  };

  return (
    <Card>
      <CardHeader
        icon={<ShieldAlert size={16} strokeWidth={1.5} />}
        title="owner controls"
        badge={
          <Badge variant={isPaused ? "blocked" : "enabled"}>
            {isPaused ? "paused" : "live"}
          </Badge>
        }
      />
      <p className="text-[12px] text-text-muted mb-4 leading-relaxed">
        Owner-only kill switch. Pause halts new rebalances; emergency withdraw
        redeems every underlying back into idle USDC.
      </p>
      <div className="space-y-2">
        <Button
          onClick={handlePauseToggle}
          disabled={isPending}
          variant={isPaused ? "primary" : "secondary"}
          className="w-full"
          iconLeft={
            isPaused ? (
              <Play size={14} strokeWidth={1.5} />
            ) : (
              <Pause size={14} strokeWidth={1.5} />
            )
          }
        >
          {isPending ? "pending…" : isPaused ? "unpause vault" : "pause vault"}
        </Button>
        <Button
          onClick={handleEmergency}
          disabled={isPending}
          variant="danger"
          className="w-full"
          iconLeft={<Siren size={14} strokeWidth={1.5} />}
        >
          emergency withdraw
        </Button>
      </div>
      {status && (
        <p
          className={`mt-3 text-[12px] font-mono ${
            status.kind === "error" ? "text-danger" : "text-text-muted"
          }`}
        >
          {status.msg}
        </p>
      )}
    </Card>
  );
}
