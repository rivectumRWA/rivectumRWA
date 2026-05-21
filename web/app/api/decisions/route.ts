import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Row {
  id: number;
  ts: number;
  intent_hash: string;
  nonce: number;
  allocations_json: string;
  tx_hash: string | null;
  status: string;
  error_msg: string | null;
}

export async function GET() {
  const dbPath =
    process.env.AGENT_DB_PATH ??
    path.join(process.cwd(), "..", "agent", "agent.db");

  if (!fs.existsSync(dbPath)) {
    return NextResponse.json([]);
  }

  try {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    try {
      const rows = db
        .prepare(
          "SELECT id, ts, intent_hash, nonce, allocations_json, tx_hash, status, error_msg FROM decisions ORDER BY id DESC LIMIT 50"
        )
        .all() as Row[];
      return NextResponse.json(
        rows.map((r) => ({
          id: r.id,
          ts: r.ts,
          intentHash: r.intent_hash,
          nonce: r.nonce,
          allocationsJson: r.allocations_json,
          txHash: r.tx_hash,
          status: r.status,
          errorMsg: r.error_msg,
        }))
      );
    } finally {
      db.close();
    }
  } catch {
    return NextResponse.json([]);
  }
}
