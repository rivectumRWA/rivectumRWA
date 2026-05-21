"use client";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { parseUnits, type Address } from "viem";
import { useState } from "react";
import { ArrowDownToLine } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { USDC_ABI, VAULT_ABI } from "@/lib/abi";

const VAULT = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? "0x0") as Address;
const USDC = (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "0x0") as Address;

export function DepositCard({
  featured,
  className,
}: {
  featured?: boolean;
  className?: string;
}) {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [amount, setAmount] = useState("100");
  const [status, setStatus] = useState<{ kind: "info" | "error"; msg: string } | null>(null);

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC,
    abi: USDC_ABI,
    functionName: "allowance",
    args: address ? [address, VAULT] : undefined,
    query: { enabled: !!address },
  });

  const { data: balance } = useReadContract({
    address: USDC,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15000 },
  });

  const handleDeposit = async () => {
    if (!address) return;
    setStatus(null);
    try {
      const amt = parseUnits(amount, 6);
      if (!allowance || (allowance as bigint) < amt) {
        setStatus({ kind: "info", msg: "approving usdc…" });
        await writeContractAsync({
          address: USDC,
          abi: USDC_ABI,
          functionName: "approve",
          args: [VAULT, amt],
        });
        await refetchAllowance();
      }
      setStatus({ kind: "info", msg: "depositing…" });
      await writeContractAsync({
        address: VAULT,
        abi: VAULT_ABI,
        functionName: "deposit",
        args: [amt, address],
      });
      setStatus({ kind: "info", msg: "deposit submitted" });
    } catch (err) {
      setStatus({
        kind: "error",
        msg: err instanceof Error ? err.message.split("\n")[0].slice(0, 120) : "deposit failed",
      });
    }
  };

  const balanceLabel =
    balance !== undefined
      ? `${(Number(balance) / 1e6).toLocaleString("en-US", { maximumFractionDigits: 2 })} usdc`
      : address
        ? "0.00 usdc"
        : "wallet not connected";

  return (
    <Card featured={featured} className={className}>
      <CardHeader
        icon={<ArrowDownToLine size={16} strokeWidth={1.5} />}
        title="deposit"
        badge={<Badge variant={address ? "ready" : "empty"}>{address ? "ready" : "connect"}</Badge>}
      />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="microlabel">amount</span>
          <span className="text-[11px] text-text-subtle font-mono">balance: {balanceLabel}</span>
        </div>
        <Input
          inputMode="decimal"
          mono
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          suffix="USDC"
          placeholder="0.0"
          aria-label="deposit amount usdc"
        />
        <Button
          onClick={handleDeposit}
          disabled={!address || isPending}
          className="w-full"
          iconLeft={<ArrowDownToLine size={14} strokeWidth={1.5} />}
        >
          {isPending ? "pending…" : "deposit"}
        </Button>
        {status && (
          <p
            className={`text-[12px] font-mono ${
              status.kind === "error" ? "text-danger" : "text-text-muted"
            }`}
          >
            {status.msg}
          </p>
        )}
      </div>
    </Card>
  );
}
