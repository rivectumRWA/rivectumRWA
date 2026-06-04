process.env.AGENT_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
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
  `agent-smoke-${Date.now()}-${Math.random().toString(36).slice(2)}.db`,
);

function mockPc(nonce: bigint) {
  return {
    readContract: async (args: { functionName: string; address: Address }) => {
      if (args.functionName === "nextNonce") return nonce;
      if (args.functionName === "convertToAssets") {
        if (args.address === MOCK_UNDERLYING_1) return 1_001_000n;
        if (args.address === MOCK_UNDERLYING_2) return 1_000_500n;
        return 0n;
      }
      throw new Error(`unexpected: ${args.functionName}`);
    },
    waitForTransactionReceipt: async () => {},
  };
}

const mockWc = {
  writeContract: async () =>
    `0x${Math.random().toString(16).slice(2).padStart(64, "0")}`,
};

describe("agent loop smoke", () => {
  let sqlite: Database;
  let db: BunSQLiteDatabase;
  const acct = privateKeyToAccount(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  );

  const decisions = sqliteTable("decisions", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ts: integer("ts").notNull(),
    intentHash: text("intent_hash").notNull(),
    nonce: integer("nonce").notNull(),
    allocationsJson: text("allocations_json").notNull(),
    txHash: text("tx_hash"),
    status: text("status").notNull(),
    errorMsg: text("error_msg"),
  });

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

  it("completes 3 consecutive ticks with monotonic nonce", async () => {
    const results = [];
    for (let i = 0; i < 3; i++) {
      const r = await tick({
        publicClient: mockPc(BigInt(i)) as any,
        walletClient: mockWc as any,
        account: acct,
        vault: MOCK_VAULT,
        db,
        chainId: MOCK_CHAIN_ID,
        underlyings: MOCK_UNDERLYINGS,
      });
      results.push(r);
    }

    results.forEach((r) => {
      expect(r.status).toBe("confirmed");
    });

    const rows = db.select().from(decisions).all();
    expect(rows.length).toBe(3);

    const nonces = rows.map((r) => r.nonce);
    expect(nonces).toEqual([0, 1, 2]);

    // All entries have distinct intent hashes (nonce differs)
    const hashes = rows.map((r) => r.intentHash);
    const unique = new Set(hashes);
    expect(unique.size).toBe(3);
  });

  it("continues after a failed tick (mid-loop resilience)", async () => {
    // First tick fails
    const r1 = await tick({
      publicClient: mockPc(0n) as any,
      walletClient: {
        writeContract: async () => {
          throw new Error("insufficient gas price");
        },
      } as any,
      account: acct,
      vault: MOCK_VAULT,
      db,
      chainId: MOCK_CHAIN_ID,
      underlyings: MOCK_UNDERLYINGS,
    });
    expect(r1.status).toBe("failed");

    // Second tick succeeds
    const r2 = await tick({
      publicClient: mockPc(0n) as any,
      walletClient: mockWc as any,
      account: acct,
      vault: MOCK_VAULT,
      db,
      chainId: MOCK_CHAIN_ID,
      underlyings: MOCK_UNDERLYINGS,
    });
    expect(r2.status).toBe("confirmed");

    const rows = db.select().from(decisions).all();
    const statuses = rows.map((r) => r.status);
    expect(statuses).toContain("failed");
    expect(statuses).toContain("confirmed");
  });

  it("each tick produces unique timestamp", async () => {
    await tick({
      publicClient: mockPc(9n) as any,
      walletClient: mockWc as any,
      account: acct,
      vault: MOCK_VAULT,
      db,
      chainId: MOCK_CHAIN_ID,
      underlyings: MOCK_UNDERLYINGS,
    });

    await tick({
      publicClient: mockPc(10n) as any,
      walletClient: mockWc as any,
      account: acct,
      vault: MOCK_VAULT,
      db,
      chainId: MOCK_CHAIN_ID,
      underlyings: MOCK_UNDERLYINGS,
    });

    const rows = db.select().from(decisions).all();
    const filtered = rows.filter((r) => r.nonce >= 9);
    expect(filtered.length).toBe(2);
    expect(filtered[0].ts).toBeLessThanOrEqual(filtered[1].ts);
  });
});
