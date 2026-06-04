import { createPublicClient, createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import type { LocalAccount } from "viem/accounts";

const RPC = process.env.RPC_URL ?? "https://sepolia.base.org";

let _account: LocalAccount | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _publicClient: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _walletClient: any = null;

function init(): void {
  if (_account) return;
  const pk = process.env.AGENT_PRIVATE_KEY;
  if (!pk) throw new Error("AGENT_PRIVATE_KEY env var required");
  _account = privateKeyToAccount(pk as Hex);
  _publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC),
  });
  _walletClient = createWalletClient({
    account: _account,
    chain: baseSepolia,
    transport: http(RPC),
  });
}

export function getAccount(): LocalAccount {
  init();
  return _account!;
}

export function getPublicClient() {
  init();
  return _publicClient!;
}

export function getWalletClient() {
  init();
  return _walletClient!;
}

export const CHAIN_ID = baseSepolia.id;
