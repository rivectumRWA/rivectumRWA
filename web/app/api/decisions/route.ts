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

const ALLOWED_STATUSES = new Set(["success", "failed", "pending"]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const limitParam = url.searchParams.get("limit");
  const limit = clampLimit(limitParam);

  const dbPath =
    process.env.AGENT_DB_PATH ??
    path.join(process.cwd(), "..", "agent", "agent.db");

  if (!fs.existsSync(dbPath)) {
    return NextResponse.json([]);
  }

  try {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    try {
      const where =
        status && ALLOWED_STATUSES.has(status) ? "WHERE status = ?" : "";
      const sql = `SELECT id, ts, intent_hash, nonce, allocations_json, tx_hash, status, error_msg FROM decisions ${where} ORDER BY id DESC LIMIT ?`;
      const args =
        status && ALLOWED_STATUSES.has(status) ? [status, limit] : [limit];
      const rows = db.prepare(sql).all(...args) as Row[];
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

function clampLimit(v: string | null): number {
  const n = v ? Number(v) : 50;
  if (!Number.isFinite(n) || n <= 0) return 50;
  return Math.min(Math.floor(n), 500);
}
