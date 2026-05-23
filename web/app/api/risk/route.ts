import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { authenticateRequest } from "@/lib/auth";
import { lookupRwaMeta, type RwaAssetMeta } from "@/lib/rwa-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AllocationEntry {
  asset: string;
  bps: number;
}

export interface AssetRisk {
  address: string;
  symbol: string;
  name: string;
  category: string;
  riskLabel: string;
  riskLevel: "low" | "medium" | "high";
  currentBps: number;
  currentAllocPct: number;
  exposureLimitBps: number;
  exposureOk: boolean;
  successRate: number;
  lastRebalanceAgoSec: number | null;
  iconName: RwaAssetMeta["iconName"];
}

export interface RiskOverview {
  overallRisk: "low" | "medium" | "high";
  score: number;
  assets: AssetRisk[];
  totalAllocations: number;
  complianceIssues: number;
  lastDecisionTs: number | null;
  checkedAt: string;
}

function riskLevelFromLabel(label: string): "low" | "medium" | "high" {
  const l = label.toLowerCase();
  if (l.includes("low")) return "low";
  if (l.includes("high")) return "high";
  return "medium";
}

function computeBpsRisk(score: number): "low" | "medium" | "high" {
  if (score <= 33) return "low";
  if (score <= 66) return "high";
  return "medium";
}

export async function GET(_req: Request) {
  const dbPath =
    process.env.AGENT_DB_PATH ??
    path.join(process.cwd(), "..", "agent", "agent.db");

  const now = Date.now();
  let lastDecisionTs: number | null = null;
  let allocations: AllocationEntry[] = [];
  let successCount = 0;
  let totalCount = 0;

  if (fs.existsSync(dbPath)) {
    try {
      const db = new Database(dbPath, {
        readonly: true,
        fileMustExist: true,
      });
      try {
        const row = db
          .prepare(
            "SELECT ts, allocations_json, status FROM decisions ORDER BY ts DESC LIMIT 1",
          )
          .get() as { ts: number; allocations_json: string; status: string } | undefined;
        if (row) {
          lastDecisionTs = row.ts;
          allocations = JSON.parse(row.allocations_json) as AllocationEntry[];
        }

        const stats = db
          .prepare(
            "SELECT status, COUNT(*) as n FROM decisions GROUP BY status",
          )
          .all() as { status: string; n: number }[];
        for (const s of stats) {
          totalCount += s.n;
          if (s.status === "confirmed") successCount = s.n;
        }
      } finally {
        db.close();
      }
    } catch {
      /* degraded — return empty */
    }
  }

  const successRate = totalCount > 0 ? successCount / totalCount : 1;

  const assets: AssetRisk[] = allocations.map((a) => {
    const addr = a.asset;
    const meta = lookupRwaMeta(addr);
    const riskLabel = meta?.riskLabel ?? "unknown";
    const riskLevel = riskLevelFromLabel(riskLabel);
    const exposureLimitBps = riskLevel === "low" ? 70_00 : riskLevel === "high" ? 40_00 : 55_00;
    const lastRebalanceAgoSec = lastDecisionTs
      ? Math.round((now - lastDecisionTs) / 1000)
      : null;

    return {
      address: addr,
      symbol: meta?.category?.split("·")[0]?.trim() ?? addr.slice(0, 10),
      name: meta?.description ?? addr,
      category: meta?.category ?? "unknown",
      riskLabel,
      riskLevel,
      currentBps: a.bps,
      currentAllocPct: +(a.bps / 100).toFixed(1),
      exposureLimitBps,
      exposureOk: a.bps <= exposureLimitBps,
      successRate: +(successRate * 100).toFixed(0),
      lastRebalanceAgoSec,
      iconName: meta?.iconName ?? "Shield",
    };
  });

  // Fallback: if no live allocations, seed from demo underlyings
  if (assets.length === 0) {
    const { DEMO_UNDERLYING_LIST } = await import("@/lib/demo");
    for (const u of DEMO_UNDERLYING_LIST) {
      const meta = lookupRwaMeta(u.address);
      const riskLabel = meta?.riskLabel ?? "medium";
      assets.push({
        address: u.address,
        symbol: u.symbol,
        name: u.name,
        category: meta?.category ?? "unknown",
        riskLabel,
        riskLevel: riskLevelFromLabel(riskLabel),
        currentBps: 6000,
        currentAllocPct: 60,
        exposureLimitBps: 7000,
        exposureOk: true,
        successRate: 94,
        lastRebalanceAgoSec: 120,
        iconName: meta?.iconName ?? "Shield",
      });
    }
  }

  const complianceIssues = assets.filter((a) => !a.exposureOk).length;

  const riskScores = assets.map((a) =>
    a.riskLevel === "high" ? 3 : a.riskLevel === "medium" ? 2 : 1,
  );
  const avgRisk =
    riskScores.length > 0
      ? riskScores.reduce((s, v) => s + v, 0) / riskScores.length
      : 1;

  const score = Math.round(((avgRisk - 1) / 2) * 100);
  const overallRisk = computeBpsRisk(score);

  return NextResponse.json({
    overallRisk,
    score,
    assets,
    totalAllocations: assets.length,
    complianceIssues,
    lastDecisionTs,
    checkedAt: new Date().toISOString(),
  } satisfies RiskOverview);
}
