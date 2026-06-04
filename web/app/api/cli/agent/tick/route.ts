/**
 * POST /api/cli/agent/tick — submit signed rebalance transaction
 *
 * CLI signs the rebalance(intent, sig) tx locally and sends the signed raw tx hex.
 * Server broadcasts via sendRawTransaction — AGENT_PRIVATE_KEY not needed server-side.
 */
import { NextResponse } from "next/server";
import { getPublicClient } from "@/lib/server-rpc";
import { authenticateCliRequest } from "@/lib/cli-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await authenticateCliRequest(req);
  if (auth instanceof Response) return auth;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.signedTx !== "string") {
    return NextResponse.json(
      { error: "missing signedTx in request body" },
      { status: 400 },
    );
  }

  try {
    const client = getPublicClient();
    const hash = await client.sendRawTransaction({
      serializedTransaction: body.signedTx as `0x${string}`,
    });
    return NextResponse.json({ txHash: hash });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "tx broadcast failed" },
      { status: 502 },
    );
  }
}
