import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const decisions = sqliteTable("decisions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ts: integer("ts").notNull(),
  intentHash: text("intent_hash").notNull(),
  nonce: integer("nonce").notNull(),
  allocationsJson: text("allocations_json").notNull(),
  txHash: text("tx_hash"),
  status: text("status").notNull(), // 'submitted' | 'confirmed' | 'failed'
  errorMsg: text("error_msg"),
});

const sqlite = new Database(process.env.DB_PATH ?? "./agent.db");
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS decisions (
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

export const db = drizzle(sqlite);
