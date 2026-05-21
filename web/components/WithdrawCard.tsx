"use client";
import { useAccount, useWriteContract } from "wagmi";
import { parseUnits, type Address } from "viem";
import { useState } from "react";
import { ArrowUpFromLine } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { VAULT_ABI } from "@/lib/abi";

const VAULT = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? "0x0") as Address;

export function WithdrawCard() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [amount, setAmount] = useState("10");
  const [status, setStatus] = useState<{ kind: "info" | "error"; msg: string } | null>(null);

  const handleWithdraw = async () => {
    if (!address) return;
    setStatus(null);
    try {
      const amt = parseUnits(amount, 6);
      setStatus({ kind: "info", msg: "withdrawing…" });
      await writeContractAsync({
        address: VAULT,
        abi: VAULT_ABI,
        functionName: "withdraw",
        args: [amt, address, address],
      });
      setStatus({ kind: "info", msg: "withdraw submitted" });
    } catch (err) {
      setStatus({
        kind: "error",
        msg: err instanceof Error ? err.message.split("\n")[0].slice(0, 120) : "withdraw failed",
      });
    }
  };

  return (
    <Card>
      <CardHeader
        icon={<ArrowUpFromLine size={16} strokeWidth={1.5} />}
        title="withdraw"
        badge={<Badge variant={address ? "ready" : "empty"}>{address ? "ready" : "connect"}</Badge>}
      />
      <div className="space-y-3">
        <span className="microlabel">amount</span>
        <Input
          inputMode="decimal"
          mono
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          suffix="USDC"
          placeholder="0.0"
          aria-label="withdraw amount usdc"
        />
        <Button
          onClick={handleWithdraw}
          disabled={!address || isPending}
          variant="secondary"
          className="w-full"
          iconLeft={<ArrowUpFromLine size={14} strokeWidth={1.5} />}
        >
          {isPending ? "pending…" : "withdraw"}
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
