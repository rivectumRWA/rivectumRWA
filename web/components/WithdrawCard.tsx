"use client";
import { useAccount, useWriteContract } from "wagmi";
import { parseUnits, type Address } from "viem";
import { VAULT_ABI } from "@/lib/abi";
import { useState } from "react";

const VAULT = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? "0x0") as Address;

export function WithdrawCard() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [amount, setAmount] = useState("10");
  const [status, setStatus] = useState<string | null>(null);

  const handleWithdraw = async () => {
    if (!address) return;
    setStatus(null);
    try {
      const amt = parseUnits(amount, 6);
      setStatus("withdrawing...");
      await writeContractAsync({
        address: VAULT,
        abi: VAULT_ABI,
        functionName: "withdraw",
        args: [amt, address, address],
      });
      setStatus("withdraw submitted");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "withdraw failed");
    }
  };

  return (
    <div style={{ padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>Withdraw USDC</h3>
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{ padding: 8, marginRight: 8, width: 100 }}
      />
      <button
        onClick={handleWithdraw}
        disabled={!address || isPending}
        style={{ padding: 8 }}
      >
        {isPending ? "..." : "Withdraw"}
      </button>
      {status && <p style={{ fontSize: 12, marginTop: 8 }}>{status}</p>}
    </div>
  );
}
