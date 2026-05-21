"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { DepositCard } from "@/components/DepositCard";
import { WithdrawCard } from "@/components/WithdrawCard";
import { AllocationPie } from "@/components/AllocationPie";
import { ActivityFeed } from "@/components/ActivityFeed";

export default function Home() {
  return (
    <main style={{ maxWidth: 880, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <h1 style={{ margin: 0 }}>Agent RWA Vault</h1>
        <ConnectButton />
      </header>
      <p style={{ color: "#b35c00", marginTop: 0, fontSize: 13 }}>
        Unaudited demo. Base Sepolia. Do not deposit real funds.
      </p>
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "1fr 1fr",
          marginTop: 24,
        }}
      >
        <DepositCard />
        <WithdrawCard />
        <AllocationPie />
        <ActivityFeed />
      </div>
    </main>
  );
}
