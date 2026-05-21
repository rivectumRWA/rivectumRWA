import "dotenv/config";
import type { Address, Hex } from "viem";
import { publicClient, walletClient, account, CHAIN_ID } from "./chain";
import { VAULT_ABI, ERC4626_ABI } from "./abi";
import { UNDERLYINGS } from "./assets";
import { pickAllocation, type ApySample } from "./strategy";
import { hashIntent, signIntent } from "./sign";
import { db, decisions } from "./db";

const VAULT = process.env.VAULT_ADDRESS as Address;
const INTERVAL_MS = Number(process.env.REBALANCE_INTERVAL_MS ?? 300_000);

if (!VAULT || VAULT === "0x0000000000000000000000000000000000000000") {
  throw new Error("VAULT_ADDRESS env var required");
}

/**
 * Naive APY proxy: read convertToAssets(1e18) on each underlying.
 * Higher value = more assets per share = better return for new deposits.
 * For demo only; production would track rate-of-change over time.
 */
async function probeApy(asset: Address): Promise<number> {
  const v = (await publicClient.readContract({
    address: asset,
    abi: ERC4626_ABI,
    functionName: "convertToAssets",
    args: [10n ** 18n],
  })) as bigint;
  // Map bigint to a Number proxy. Loss of precision is acceptable for ranking.
  return Number(v / 10n ** 12n); // scale to 1e6 for ranking
}

async function tick(): Promise<void> {
  console.log("[agent] tick", new Date().toISOString());

  const samples: ApySample[] = await Promise.all(
    UNDERLYINGS.filter((u) => u.address && u.address !== "0x0000000000000000000000000000000000000000").map(
      async (u) => ({ address: u.address, apyBps: await probeApy(u.address) }),
    ),
  );

  if (samples.length === 0) {
    console.log("[agent] no valid underlyings configured, skipping");
    return;
  }

  const allocations = pickAllocation(samples);

  const nonce = (await publicClient.readContract({
    address: VAULT,
    abi: VAULT_ABI,
    functionName: "nextNonce",
  })) as bigint;

  const intent = {
    nonce,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
    allocations,
  };

  const digest = hashIntent(intent, VAULT, CHAIN_ID);
  const sig = await signIntent(account, digest);

  let txHash: Hex | null = null;
  let status: "submitted" | "confirmed" | "failed" = "submitted";
  let errorMsg: string | null = null;

  try {
    txHash = await walletClient.writeContract({
      address: VAULT,
      abi: VAULT_ABI,
      functionName: "rebalance",
      args: [intent, sig],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    status = "confirmed";
  } catch (e) {
    status = "failed";
    errorMsg = e instanceof Error ? e.message : String(e);
    console.error("[agent] rebalance failed:", errorMsg);
  }

  db.insert(decisions).values({
    ts: Date.now(),
    intentHash: digest,
    nonce: Number(nonce),
    allocationsJson: JSON.stringify(allocations),
    txHash,
    status,
    errorMsg,
  }).run();

  console.log("[agent] result", { status, txHash, allocations });
}

async function main(): Promise<void> {
  console.log("[agent] starting, account=", account.address, "vault=", VAULT);
  await tick();
  setInterval(() => {
    tick().catch((e) => console.error("[agent] tick error:", e));
  }, INTERVAL_MS);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
