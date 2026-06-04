/**
 * GET /api/cli/agent/status — vault status (read-only)
 */
import { NextResponse } from "next/server";
import { type Address, formatUnits } from "viem";
import { getPublicClient } from "@/lib/server-rpc";
import { VAULT_ABI } from "@/lib/abi";
import { authenticateCliRequest } from "@/lib/cli-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateCliRequest(req);
  if (auth instanceof Response) return auth;

  const vault = process.env.NEXT_PUBLIC_VAULT_ADDRESS as Address | undefined;
  if (!vault) {
    return NextResponse.json({ error: "VAULT_ADDRESS not configured" }, { status: 503 });
  }

  try {
    const client = getPublicClient();
    const [paused, totalAssetsRaw, totalSupplyRaw, agentDid, owner, nextNonce, underlyings] =
      await Promise.all([
        client.readContract({ address: vault, abi: VAULT_ABI, functionName: "paused" }),
        client.readContract({ address: vault, abi: VAULT_ABI, functionName: "totalAssets" }),
        client.readContract({ address: vault, abi: VAULT_ABI, functionName: "totalSupply" }),
        client.readContract({ address: vault, abi: VAULT_ABI, functionName: "agentDid" }),
        client.readContract({ address: vault, abi: VAULT_ABI, functionName: "owner" }),
        client.readContract({ address: vault, abi: VAULT_ABI, functionName: "nextNonce" }),
        client.readContract({ address: vault, abi: VAULT_ABI, functionName: "getUnderlyings" }),
      ]);

    return NextResponse.json({
      vault,
      paused: paused as boolean,
      totalAssets: formatUnits(totalAssetsRaw as bigint, 6),
      totalSupply: formatUnits(totalSupplyRaw as bigint, 18),
      agentDid: agentDid as Address,
      owner: owner as Address,
      nextNonce: Number(nextNonce as bigint),
      underlyings: underlyings as readonly Address[],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "rpc read failed" },
      { status: 502 },
    );
  }
}
