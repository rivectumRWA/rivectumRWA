import { createPublicClient, createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";

const RPC = process.env.RPC_URL ?? "https://sepolia.base.org";
const PK = (process.env.AGENT_PRIVATE_KEY ?? "0x0".padEnd(66, "0")) as Hex;

export const account = privateKeyToAccount(PK);
export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC),
});
export const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(RPC),
});
export const CHAIN_ID = baseSepolia.id;
