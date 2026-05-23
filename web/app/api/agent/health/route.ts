import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface AgentHealth {
  status: "healthy" | "stale" | "offline";
  lastDecisionTs: number | null;
  lastDecisionAgeSec: number | null;
  totalDecisions: number;
  dbOk: boolean;
  /** Approximate interval in seconds, based on agent config default. */
  expectedIntervalSec: number;
  checkedAt: string;
}

export async function GET(req: Request) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const now = Date.now();
  const expectedIntervalSec = 300; // default 5 min REBALANCE_INTERVAL_MS

  const dbPath =
    process.env.AGENT_DB_PATH ??
    path.join(process.cwd(), "..", "agent", "agent.db");

  const dbOk = fs.existsSync(dbPath);
  let lastDecisionTs: number | null = null;
  let totalDecisions = 0;

  if (dbOk) {
    try {
      const db = new Database(dbPath, { readonly: true, fileMustExist: true });
      try {
        const row = db
          .prepare("SELECT ts FROM decisions ORDER BY ts DESC LIMIT 1")
          .get() as { ts: number } | undefined;
        if (row) lastDecisionTs = row.ts;

        const count = db
          .prepare("SELECT COUNT(*) as n FROM decisions")
          .get() as { n: number };
        totalDecisions = count.n;
      } finally {
        db.close();
      }
    } catch {
      // DB exists but can't be read — treat as degraded
    }
  }

  const lastDecisionAgeSec = lastDecisionTs
    ? Math.round((now - lastDecisionTs) / 1000)
    : null;

  let status: AgentHealth["status"] = "offline";
  if (lastDecisionAgeSec !== null) {
    if (lastDecisionAgeSec <= expectedIntervalSec * 2) {
      status = "healthy";
    } else if (lastDecisionAgeSec <= expectedIntervalSec * 4) {
      status = "stale";
    }
  }

  return NextResponse.json({
    status,
    lastDecisionTs,
    lastDecisionAgeSec,
    totalDecisions,
    dbOk,
    expectedIntervalSec,
    checkedAt: new Date().toISOString(),
  } satisfies AgentHealth);
}
