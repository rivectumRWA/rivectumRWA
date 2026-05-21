"use client";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { parseUnits, type Address } from "viem";
import { USDC_ABI, VAULT_ABI } from "@/lib/abi";
import { useState } from "react";

const VAULT = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? "0x0") as Address;
const USDC = (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "0x0") as Address;

export function DepositCard() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [amount, setAmount] = useState("100");
  const [status, setStatus] = useState<string | null>(null);

  const { data: allowance } = useReadContract({
    address: USDC,
    abi: USDC_ABI,
    functionName: "allowance",
    args: address ? [address, VAULT] : undefined,
    query: { enabled: !!address },
  });

  const handleDeposit = async () => {
    if (!address) return;
    setStatus(null);
    try {
      const amt = parseUnits(amount, 6);
      if (!allowance || (allowance as bigint) < amt) {
        setStatus("approving USDC...");
        await writeContractAsync({
          address: USDC,
          abi: USDC_ABI,
          functionName: "approve",
          args: [VAULT, amt],
        });
      }
      setStatus("depositing...");
      await writeContractAsync({
        address: VAULT,
        abi: VAULT_ABI,
        functionName: "deposit",
        args: [amt, address],
      });
      setStatus("deposit submitted");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "deposit failed");
    }
  };

  return (
    <div style={{ padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>Deposit USDC</h3>
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{ padding: 8, marginRight: 8, width: 100 }}
      />
      <button
        onClick={handleDeposit}
        disabled={!address || isPending}
        style={{ padding: 8 }}
      >
        {isPending ? "..." : "Deposit"}
      </button>
      {status && <p style={{ fontSize: 12, marginTop: 8 }}>{status}</p>}
    </div>
  );
}
