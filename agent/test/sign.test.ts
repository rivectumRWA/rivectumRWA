import { describe, it, expect } from "bun:test";
import { hashIntent, signIntent } from "../src/sign";
import { privateKeyToAccount } from "viem/accounts";
import { recoverMessageAddress } from "viem";
import type { Address } from "viem";
import type { Intent } from "../src/types";

const VAULT: Address = "0x9999999999999999999999999999999999999999";
const ASSET: Address = "0x0000000000000000000000000000000000000001";
const CHAIN_ID = 84532; // base sepolia

describe("intent signing", () => {
  const acc = privateKeyToAccount(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  );

  const intent: Intent = {
    nonce: 0n,
    deadline: 1700000000n,
    allocations: [{ asset: ASSET, bps: 6000 }],
  };

  it("hash is deterministic", () => {
    const h1 = hashIntent(intent, VAULT, CHAIN_ID);
    const h2 = hashIntent(intent, VAULT, CHAIN_ID);
    expect(h1).toBe(h2);
  });

  it("hash changes when nonce changes", () => {
    const h1 = hashIntent(intent, VAULT, CHAIN_ID);
    const h2 = hashIntent({ ...intent, nonce: 1n }, VAULT, CHAIN_ID);
    expect(h1).not.toBe(h2);
  });

  it("signs and recovers signer", async () => {
    const digest = hashIntent(intent, VAULT, CHAIN_ID);
    const sig = await signIntent(acc, digest);
    const recovered = await recoverMessageAddress({
      message: { raw: digest },
      signature: sig,
    });
    expect(recovered.toLowerCase()).toBe(acc.address.toLowerCase());
  });
});
