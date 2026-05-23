import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  status: "pass" | "fail" | "warn";
  detail: string;
}

export interface ReadinessResponse {
  overall: "ready" | "partial" | "not-ready";
  items: ChecklistItem[];
  passCount: number;
  failCount: number;
  warnCount: number;
  checkedAt: string;
}

export async function GET(req: Request) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const now = Date.now();
  const items: ChecklistItem[] = [];

  // 1. Agent DB
  const dbPath =
    process.env.AGENT_DB_PATH ??
    path.join(process.cwd(), "..", "agent", "agent.db");
  const dbExists = fs.existsSync(dbPath);
  let dbRowCount = 0;
  let lastDecisionAgeSec: number | null = null;

  if (dbExists) {
    try {
      const db = new Database(dbPath, { readonly: true, fileMustExist: true });
      try {
        const count = db
          .prepare("SELECT COUNT(*) as n FROM decisions")
          .get() as { n: number };
        dbRowCount = count.n;
        const row = db
          .prepare("SELECT ts FROM decisions ORDER BY ts DESC LIMIT 1")
          .get() as { ts: number } | undefined;
        if (row) {
          lastDecisionAgeSec = Math.round((now - row.ts) / 1000);
        }
      } finally {
        db.close();
      }
    } catch {
      /* degraded */
    }
  }

  items.push({
    id: "agent-db",
    label: "agent database",
    description: "SQLite decisions database present and readable",
    status: dbExists ? "pass" : "fail",
    detail: dbExists
      ? `${dbRowCount} decisions, last ${lastDecisionAgeSec != null ? fmtAge(lastDecisionAgeSec) + " ago" : "never"}`
      : "agent.db not found",
  });

  // 2. Agent health (derived from DB)
  const agentOk =
    dbExists && lastDecisionAgeSec !== null && lastDecisionAgeSec < 1200;
  items.push({
    id: "agent-health",
    label: "agent health",
    description: "Agent has produced a decision within the last 20 minutes",
    status: agentOk ? "pass" : lastDecisionAgeSec !== null ? "warn" : "fail",
    detail: agentOk
      ? `last decision ${fmtAge(lastDecisionAgeSec!)} ago`
      : lastDecisionAgeSec !== null
        ? `agent stale — last decision ${fmtAge(lastDecisionAgeSec)} ago`
        : "no decision history",
  });

  // 3. Privy config
  const privyOk =
    !!process.env.NEXT_PUBLIC_PRIVY_APP_ID &&
    !!process.env.PRIVY_APP_SECRET;
  items.push({
    id: "privy-config",
    label: "privy auth",
    description: "Privy app ID and secret configured",
    status: privyOk ? "pass" : "fail",
    detail: privyOk ? "configured" : "NEXT_PUBLIC_PRIVY_APP_ID or PRIVY_APP_SECRET missing",
  });

  // 4. OpenAI key (for copilot)
  const llmOk = !!process.env.OPENAI_API_KEY;
  items.push({
    id: "llm-key",
    label: "openai key",
    description: "OPENAI_API_KEY set for Serra Copilot",
    status: llmOk ? "pass" : "warn",
    detail: llmOk ? "configured" : "not set — copilot will use guard-only mode",
  });

  // 5. RPC endpoint
  const rpcOk = !!process.env.NEXT_PUBLIC_RPC_URL;
  items.push({
    id: "rpc-url",
    label: "rpc endpoint",
    description: "On-chain RPC URL configured for contract reads",
    status: rpcOk ? "pass" : "warn",
    detail: rpcOk ? "configured" : "not set — on-chain data will be unavailable",
  });

  // 6. Vault contract
  const vaultAddr = process.env.NEXT_PUBLIC_VAULT_ADDRESS;
  items.push({
    id: "vault-contract",
    label: "vault contract",
    description: "ERC-4626 vault contract address configured",
    status: vaultAddr ? "pass" : "warn",
    detail: vaultAddr ? vaultAddr : "NEXT_PUBLIC_VAULT_ADDRESS not set",
  });

  // 7. Demo mode
  items.push({
    id: "demo-mode",
    label: "demo mode",
    description: "NEXT_PUBLIC_DEMO fallback available",
    status:
      process.env.NEXT_PUBLIC_DEMO === "1"
        ? "pass"
        : "warn",
    detail:
      process.env.NEXT_PUBLIC_DEMO === "1"
        ? "enabled — mock data will fill gaps"
        : "disabled — live data only",
  });

  const failCount = items.filter((i) => i.status === "fail").length;
  const warnCount = items.filter((i) => i.status === "warn").length;
  const passCount = items.filter((i) => i.status === "pass").length;

  const overall: ReadinessResponse["overall"] =
    failCount > 0 ? "not-ready" : warnCount > 0 ? "partial" : "ready";

  return NextResponse.json({
    overall,
    items,
    passCount,
    failCount,
    warnCount,
    checkedAt: new Date().toISOString(),
  } satisfies ReadinessResponse);
}

function fmtAge(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}
