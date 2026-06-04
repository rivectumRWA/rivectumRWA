/**
 * chain.ts — factory functions for viem clients.
 * No top-level side effects. Each call creates a fresh instance.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

export function makePublicClient(rpcUrl: string) {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });
}

export function makeWalletClient(rpcUrl: string, privateKey: Hex) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(rpcUrl),
  });
}

export function senderAddress(privateKey: Hex) {
  return privateKeyToAccount(privateKey).address;
}
