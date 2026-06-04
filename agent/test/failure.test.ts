process.env.AGENT_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { privateKeyToAccount } from "viem/accounts";
import type { Address } from "viem";
import { tick } from "../src/agent";
import os from "node:os";
import path from "node:path";

const MOCK_VAULT: Address = "0x9999999999999999999999999999999999999999";
const MOCK_UNDERLYING_1: Address = "0x0000000000000000000000000000000000000aaa";
const MOCK_UNDERLYING_2: Address = "0x0000000000000000000000000000000000000bbb";
const MOCK_CHAIN_ID = 84532;
const MOCK_UNDERLYINGS = [
  { address: MOCK_UNDERLYING_1 },
  { address: MOCK_UNDERLYING_2 },
];

const TEST_DB = path.join(
  os.tmpdir(),
  `agent-failure-${Date.now()}-${Math.random().toString(36).slice(2)}.db`,
);

describe("agent failure paths", () => {
  let sqlite: Database;
  let db: BunSQLiteDatabase;
  const acct = privateKeyToAccount(
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

  function mockPc(nonce: bigint) {
    return {
      readContract: async (args: { functionName: string; address: Address }) => {
        if (args.functionName === "nextNonce") return nonce;
        if (args.functionName === "convertToAssets") return 1_000_500n;
        throw new Error(`unexpected readContract: ${args.functionName}`);
      },
      waitForTransactionReceipt: async () => {
        throw new Error("should not reach receipt wait on writeContract rejection");
      },
    };
  }

  it("logs 'failed' when writeContract rejects", async () => {
    const result = await tick({
      publicClient: mockPc(5n) as any,
      walletClient: {
        writeContract: async () => {
          throw new Error("simulated RPC error: nonce too low");
        },
      } as any,
      account: acct,
      vault: MOCK_VAULT,
      db,
      chainId: MOCK_CHAIN_ID,
      underlyings: MOCK_UNDERLYINGS,
    });

    expect(result.status).toBe("failed");
    expect(result.errorMsg).toContain("simulated RPC error");
    expect(result.txHash).toBeNull();
  });

  it("logs 'failed' when waitForTransactionReceipt rejects", async () => {
    const result = await tick({
      publicClient: {
        readContract: async (args: { functionName: string; address: Address }) => {
          if (args.functionName === "nextNonce") return 0n;
          if (args.functionName === "convertToAssets") return 1_001_000n;
          throw new Error("unexpected");
        },
        waitForTransactionReceipt: async () => {
          throw new Error("transaction reverted: execution error");
        },
      } as any,
      walletClient: {
        writeContract: async () =>
          "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
      } as any,
      account: acct,
      vault: MOCK_VAULT,
      db,
      chainId: MOCK_CHAIN_ID,
      underlyings: MOCK_UNDERLYINGS,
    });

    expect(result.status).toBe("failed");
    expect(result.errorMsg).toContain("transaction reverted");
  });

  it("handles non-Error throws (plain string)", async () => {
    const result = await tick({
      publicClient: mockPc(1n) as any,
      walletClient: {
        writeContract: async () => {
          throw "plain string error";
        },
      } as any,
      account: acct,
      vault: MOCK_VAULT,
      db,
      chainId: MOCK_CHAIN_ID,
      underlyings: MOCK_UNDERLYINGS,
    });

    expect(result.status).toBe("failed");
    expect(result.errorMsg).toBe("plain string error");
  });
});
