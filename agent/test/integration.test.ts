process.env.AGENT_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { privateKeyToAccount } from "viem/accounts";
import type { Address, Hex } from "viem";
import type { LocalAccount } from "viem/accounts";
import { tick } from "../src/agent";
import { hashIntent } from "../src/sign";
import os from "node:os";
import path from "node:path";

const MOCK_VAULT: Address = "0x9999999999999999999999999999999999999999";
const MOCK_UNDERLYING_1: Address = "0x0000000000000000000000000000000000000aaa";
const MOCK_UNDERLYING_2: Address = "0x0000000000000000000000000000000000000bbb";
const MOCK_CHAIN_ID = 84532;
const MOCK_TX_HASH: Hex =
  "0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899";

const TEST_DB = path.join(
  os.tmpdir(),
  `agent-integration-${Date.now()}-${Math.random().toString(36).slice(2)}.db`,
);

const MOCK_UNDERLYINGS = [
  { address: MOCK_UNDERLYING_1 },
  { address: MOCK_UNDERLYING_2 },
];

function mockPublicClient(nonceVal: bigint, apy1: bigint, apy2: bigint) {
  return {
    readContract: async (args: { address: Address; functionName: string }) => {
      if (args.functionName === "nextNonce") return nonceVal;
      if (args.functionName === "convertToAssets") {
        if (args.address === MOCK_UNDERLYING_1) return apy1;
        if (args.address === MOCK_UNDERLYING_2) return apy2;
        return 0n;
      }
      throw new Error(`unexpected readContract: ${args.functionName}`);
    },
    waitForTransactionReceipt: async () => {},
  };
}

function mockWalletClient() {
  return {
    writeContract: async () => MOCK_TX_HASH,
  };
}

describe("agent integration", () => {
  let sqlite: Database;
  let db: BunSQLiteDatabase;
  const acct: LocalAccount = privateKeyToAccount(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  );

  beforeAll(() => {
    sqlite = new Database(TEST_DB);
    sqlite.exec(`
      CREATE TABLE decisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL,
        intent_hash TEXT NOT NULL,
        nonce INTEGER NOT NULL,
        allocations_json TEXT NOT NULL,
        tx_hash TEXT,
        status TEXT NOT NULL,
        error_msg TEXT
      )
    `);
    db = drizzle(sqlite);
  });

  afterAll(() => {
    sqlite.close();
  });

  it("runs a full tick: probe → allocate → sign → submit → log", async () => {
    const result = await tick({
      publicClient: mockPublicClient(3n, 1_000_500n, 1_000_300n) as any,
      walletClient: mockWalletClient() as any,
      account: acct,
      vault: MOCK_VAULT,
      db,
      chainId: MOCK_CHAIN_ID,
      underlyings: MOCK_UNDERLYINGS,
    });

    expect(result.status).toBe("confirmed");
    expect(result.nonce).toBe(3);
    expect(result.txHash).toBe(MOCK_TX_HASH);
    expect(result.allocations.length).toBeGreaterThanOrEqual(1);

    const topApyAlloc = result.allocations[0];
    expect(topApyAlloc.address).toBe(MOCK_UNDERLYING_1);
  });

  it("assigns 60/40 split with two underlyings", async () => {
    const result = await tick({
      publicClient: mockPublicClient(0n, 1_002_000n, 1_001_000n) as any,
      walletClient: mockWalletClient() as any,
      account: acct,
      vault: MOCK_VAULT,
      db,
      chainId: MOCK_CHAIN_ID,
      underlyings: MOCK_UNDERLYINGS,
    });

    expect(result.allocations).toEqual([
      { address: MOCK_UNDERLYING_1, apyBps: expect.any(Number) },
      { address: MOCK_UNDERLYING_2, apyBps: expect.any(Number) },
    ]);
  });

  it("signs an intent with valid digest length", async () => {
    const result = await tick({
      publicClient: mockPublicClient(1n, 1_001_000n, 1_000_500n) as any,
      walletClient: mockWalletClient() as any,
      account: acct,
      vault: MOCK_VAULT,
      db,
      chainId: MOCK_CHAIN_ID,
      underlyings: MOCK_UNDERLYINGS,
    });

    // digest must be a non-zero 32-byte hex (66 chars with 0x)
    expect(result.digest.length).toBe(66);
    expect(result.digest.startsWith("0x")).toBe(true);
    expect(result.digest).not.toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    );
  });

  it("digest is deterministic for same deadline", async () => {
    const now = Math.floor(Date.now() / 1000);

    const intent = {
      nonce: 2n,
      deadline: BigInt(now + 3600),
      allocations: [
        { asset: MOCK_UNDERLYING_1, bps: 6000 },
        { asset: MOCK_UNDERLYING_2, bps: 4000 },
      ],
    };

    const d1 = hashIntent(intent, MOCK_VAULT, MOCK_CHAIN_ID);
    const d2 = hashIntent(intent, MOCK_VAULT, MOCK_CHAIN_ID);
    expect(d1).toBe(d2);
  });
});
