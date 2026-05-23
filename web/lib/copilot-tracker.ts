/**
 * Lightweight copilot usage tracker backed by a JSON file.
 * Records query stats for the analytics dashboard.
 */
import fs from "node:fs";
import path from "node:path";

export interface CopilotStats {
  totalQueries: number;
  guardedQueries: number;
  llmQueries: number;
  errors: number;
  totalTokensEst: number;
  queries: Array<{
    ts: number;
    guarded: boolean;
    error: boolean;
    tokenEst: number;
  }>;
}

const STATS_PATH = path.join(process.cwd(), ".copilot-stats.json");

function emptyStats(): CopilotStats {
  return {
    totalQueries: 0,
    guardedQueries: 0,
    llmQueries: 0,
    errors: 0,
    totalTokensEst: 0,
    queries: [],
  };
}

function readStats(): CopilotStats {
  try {
    if (fs.existsSync(STATS_PATH)) {
      return JSON.parse(fs.readFileSync(STATS_PATH, "utf-8"));
    }
  } catch {
    /* corrupt file — start fresh */
  }
  return emptyStats();
}

function writeStats(s: CopilotStats): void {
  fs.writeFileSync(STATS_PATH, JSON.stringify(s), "utf-8");
}

export function recordQuery(opts: {
  guarded: boolean;
  error: boolean;
  tokenEst: number;
}): void {
  const s = readStats();
  s.totalQueries++;
  if (opts.guarded) s.guardedQueries++;
  if (opts.error) s.errors++;
  if (!opts.guarded && !opts.error) s.llmQueries++;
  s.totalTokensEst += opts.tokenEst;
  s.queries.push({
    ts: Date.now(),
    guarded: opts.guarded,
    error: opts.error,
    tokenEst: opts.tokenEst,
  });
  if (s.queries.length > 200) s.queries = s.queries.slice(-200);
  writeStats(s);
}

export function getStats(): CopilotStats {
  return readStats();
}

export function resetStats(): void {
  writeStats(emptyStats());
}
