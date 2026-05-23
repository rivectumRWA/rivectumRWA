import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UiDecisionStatus = "success" | "failed" | "pending";
type DbDecisionStatus = "confirmed" | "failed" | "submitted";

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

const UI_TO_DB_STATUS: Record<UiDecisionStatus, DbDecisionStatus> = {
  success: "confirmed",
  failed: "failed",
  pending: "submitted",
};

export async function GET(req: Request) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

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
      const dbStatus = toDbStatus(status);
      const where = dbStatus ? "WHERE status = ?" : "";
      const sql = `SELECT id, ts, intent_hash, nonce, allocations_json, tx_hash, status, error_msg FROM decisions ${where} ORDER BY id DESC LIMIT ?`;
      const args = dbStatus ? [dbStatus, limit] : [limit];
      const rows = db.prepare(sql).all(...args) as Row[];
      return NextResponse.json(
        rows.map((r) => ({
          id: r.id,
          ts: r.ts,
          intentHash: r.intent_hash,
          nonce: r.nonce,
          allocationsJson: r.allocations_json,
          txHash: r.tx_hash,
          status: toUiStatus(r.status),
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

function toDbStatus(status: string | null): DbDecisionStatus | null {
  if (!status) return null;
  if (status === "success" || status === "failed" || status === "pending") {
    return UI_TO_DB_STATUS[status];
  }
  return null;
}

function toUiStatus(status: string): UiDecisionStatus {
  if (status === "confirmed") return "success";
  if (status === "submitted") return "pending";
  return "failed";
}
