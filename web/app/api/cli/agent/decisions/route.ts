/**
 * GET /api/cli/agent/decisions — decision history (read-only)
 */
import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { authenticateCliRequest } from "@/lib/cli-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateCliRequest(req);
  if (auth instanceof Response) return auth;

  const dbPath =
    process.env.AGENT_DB_PATH ??
    path.join(process.cwd(), "..", "agent", "agent.db");

  if (!fs.existsSync(dbPath)) {
    return NextResponse.json([]);
  }

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 500);
  const statusFilter = url.searchParams.get("status");

  try {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    try {
      const where = statusFilter ? "WHERE status = ?" : "";
      const args = statusFilter ? [statusFilter, limit] : [limit];
      const rows = db
        .prepare(
          `SELECT id, ts, intent_hash, nonce, allocations_json, tx_hash, status, error_msg
           FROM decisions ${where} ORDER BY id DESC LIMIT ?`,
        )
        .all(...args) as Array<{
        id: number;
        ts: number;
        intent_hash: string;
        nonce: number;
        allocations_json: string;
        tx_hash: string | null;
        status: string;
        error_msg: string | null;
      }>;

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
        })),
      );
    } finally {
      db.close();
    }
  } catch {
    return NextResponse.json([]);
  }
}
