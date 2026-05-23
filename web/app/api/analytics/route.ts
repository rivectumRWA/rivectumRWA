import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { getStats, type CopilotStats } from "@/lib/copilot-tracker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface AnalyticsResponse {
  copilot: CopilotStats;
  rateLimit: {
    maxPerHour: number;
    currentHour: number;
    status: "ok" | "warning" | "exceeded";
  };
  serverUptimeSec: number;
  checkedAt: string;
}

const serverStart = Date.now();

export async function GET(req: Request) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const stats = getStats();

  // Rate limit: count queries in current hour
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;
  const queriesThisHour = stats.queries.filter(
    (q) => q.ts > hourAgo,
  ).length;
  const maxPerHour = 50;
  const rateLimitStatus: AnalyticsResponse["rateLimit"]["status"] =
    queriesThisHour >= maxPerHour
      ? "exceeded"
      : queriesThisHour >= maxPerHour * 0.8
        ? "warning"
        : "ok";

  return NextResponse.json({
    copilot: stats,
    rateLimit: {
      maxPerHour,
      currentHour: queriesThisHour,
      status: rateLimitStatus,
    },
    serverUptimeSec: Math.round((now - serverStart) / 1000),
    checkedAt: new Date().toISOString(),
  } satisfies AnalyticsResponse);
}
