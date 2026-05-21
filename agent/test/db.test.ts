import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import os from "node:os";
import path from "node:path";

const TEST_DB = path.join(os.tmpdir(), `agent-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);

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

describe("decisions table", () => {
  let sqlite: Database;
  let db: BunSQLiteDatabase;

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
    // Note: skip unlink on Windows — bun:sqlite holds file handle past close().
    // Temp dir is OS-swept.
  });

  it("inserts and reads a decision", () => {
    db.insert(decisions).values({
      ts: Date.now(),
      intentHash: "0xabc",
      nonce: 0,
      allocationsJson: JSON.stringify([{ asset: "0x1", bps: 5000 }]),
      txHash: null,
      status: "submitted" as const,
      errorMsg: null,
    }).run();
    const all = db.select().from(decisions).all();
    expect(all.length).toBe(1);
    expect(all[0].nonce).toBe(0);
    expect(all[0].status).toBe("submitted");
  });
});
