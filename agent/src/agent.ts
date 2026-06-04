import type { Address, Hex, PublicClient } from "viem";
import type { LocalAccount } from "viem/accounts";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { getPublicClient, getWalletClient, getAccount, CHAIN_ID } from "./chain";
import { VAULT_ABI, ERC4626_ABI } from "./abi";
import { UNDERLYINGS } from "./assets";
import { pickAllocation, type ApySample } from "./strategy";
import { hashIntent, signIntent } from "./sign";
import { db, decisions } from "./db";

export interface TickResult {
  digest: Hex;
  nonce: number;
  allocations: ApySample[];
  txHash: Hex | null;
  status: "submitted" | "confirmed" | "failed";
  errorMsg: string | null;
}

/**
 * Naive APY proxy: read convertToAssets(1e18) on each underlying.
 * Higher value = more assets per share = better return for new deposits.
 * For demo only; production would track rate-of-change over time.
 */
async function probeApy(client: PublicClient, asset: Address): Promise<number> {
  const v = (await client.readContract({
    address: asset,
    abi: ERC4626_ABI,
    functionName: "convertToAssets",
    args: [10n ** 18n],
  })) as bigint;
  return Number(v / 10n ** 12n);
}

/**
 * Execute one agent rebalance tick with injectable dependencies.
 * This lets integration tests supply mock clients while the entrypoint
 * wires real Base Sepolia clients.
 */
export async function tick(opts: {
  publicClient: PublicClient;
  walletClient: { writeContract: (args: any) => Promise<Hex> };
  account: LocalAccount;
  vault: Address;
  db: BunSQLiteDatabase;
  chainId: number;
  underlyings?: Array<{ address: Address; symbol?: string }>;
}): Promise<TickResult> {
  const { publicClient: pc, walletClient: wc, account: acct, vault, db: d, chainId, underlyings } = opts;

  console.log("[agent] tick", new Date().toISOString());

  const assets = (underlyings ?? UNDERLYINGS).filter(
    (u) => u.address && u.address !== "0x0000000000000000000000000000000000000000",
  );

  const samples: ApySample[] = await Promise.all(
    assets.map(async (u) => ({ address: u.address, apyBps: await probeApy(pc, u.address) })),
  );

  if (samples.length === 0) {
    console.log("[agent] no valid underlyings configured, skipping");
    return { digest: "0x" as Hex, nonce: 0, allocations: [], txHash: null, status: "failed", errorMsg: "no valid underlyings" };
  }

  const allocations = pickAllocation(samples);

  const nonce = (await pc.readContract({
    address: vault,
    abi: VAULT_ABI,
    functionName: "nextNonce",
  })) as bigint;

  const intent = {
    nonce,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
    allocations,
  };

  const digest = hashIntent(intent, vault, chainId);
  const sig = await signIntent(acct, digest);

  let txHash: Hex | null = null;
  let status: "submitted" | "confirmed" | "failed" = "submitted";
  let errorMsg: string | null = null;

  try {
    txHash = await wc.writeContract({
      address: vault,
      abi: VAULT_ABI,
      functionName: "rebalance",
      args: [intent, sig],
      chain: null,
    } as any);
    await pc.waitForTransactionReceipt({ hash: txHash });
    status = "confirmed";
  } catch (e) {
    status = "failed";
    errorMsg = e instanceof Error ? e.message : String(e);
    console.error("[agent] rebalance failed:", errorMsg);
  }

  d.insert(decisions).values({
    ts: Date.now(),
    intentHash: digest,
    nonce: Number(nonce),
    allocationsJson: JSON.stringify(allocations),
    txHash,
    status,
    errorMsg,
  }).run();

  console.log("[agent] result", { status, txHash, allocations });

  return { digest, nonce: Number(nonce), allocations: samples, txHash, status, errorMsg };
}

async function main(): Promise<void> {
  const vault = process.env.VAULT_ADDRESS as Address;
  const intervalMs = Number(process.env.REBALANCE_INTERVAL_MS ?? 300_000);

  if (!vault || vault === "0x0000000000000000000000000000000000000000") {
    throw new Error("VAULT_ADDRESS env var required");
  }

  console.log("[agent] starting, account=", getAccount().address, "vault=", vault);

  const publicClient = getPublicClient();
  const walletClient = getWalletClient();
  const account = getAccount();

  // walletClient from getWalletClient() carries an account property;
  // tick() only needs writeContract, so narrow the shape.
  const wc = walletClient as { writeContract: (args: any) => Promise<Hex> };

  await tick({
    publicClient,
    walletClient: wc,
    account,
    vault,
    db,
    chainId: CHAIN_ID,
  });
  setInterval(() => {
    tick({
      publicClient,
      walletClient: wc,
      account,
      vault,
      db,
      chainId: CHAIN_ID,
    }).catch((e) => console.error("[agent] tick error:", e));
  }, intervalMs);
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
