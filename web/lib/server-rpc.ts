/**
 * Server-side viem public client. Uses NEXT_PUBLIC_RPC_URL when set, otherwise
 * the public Base Sepolia gateway.
 *
 * Returns a fresh client each call. The viem client is lightweight and we want
 * to avoid pnpm-symlinked global type identity issues. HTTP transport reuses
 * connections internally, so there's no real cost.
 */
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

export function getPublicClient() {
  const rpc = process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org";
  return createPublicClient({
    chain: baseSepolia,
    transport: http(rpc),
  });
}
