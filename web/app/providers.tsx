"use client";
import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi";
import { ReactNode, useState } from "react";
import { baseSepolia } from "wagmi/chains";
import { PrivyProvider, type PrivyClientConfig } from "@privy-io/react-auth";
import { PrivyAuthGate } from "@/components/auth/PrivyAuthGate";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const privyClientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;

const privyConfig = {
  loginMethods: ["wallet"],
  supportedChains: [baseSepolia],
  defaultChain: baseSepolia,
  embeddedWallets: {
    ethereum: {
      createOnLogin: "users-without-wallets",
    },
  },
  appearance: {
    showWalletLoginFirst: true,
    landingHeader: "SerraRWA",
    loginMessage: "Connect a wallet to enter the Base Sepolia demo.",
  },
} satisfies PrivyClientConfig;

function MissingPrivyConfig() {
  return (
    <div className="min-h-screen bg-bg text-text flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-bg-elevated p-6 shadow-sm">
        <p className="microlabel">SerraRWA</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Privy is not configured
        </h1>
        <p className="mt-3 text-sm text-text-muted leading-6">
          Set <span className="font-mono text-text">NEXT_PUBLIC_PRIVY_APP_ID</span>
          in <span className="font-mono text-text">web/.env.local</span> to enable the
          wallet-only login gate for Base Sepolia.
        </p>
      </div>
    </div>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient());

  if (!privyAppId) {
    return <MissingPrivyConfig />;
  }

  return (
    <PrivyProvider appId={privyAppId} clientId={privyClientId} config={privyConfig}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={qc}>
          <RainbowKitProvider>
            <PrivyAuthGate>{children}</PrivyAuthGate>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </PrivyProvider>
  );
}
