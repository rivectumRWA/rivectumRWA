/**
 * GET /api/cli/user/preview — preview deposit/redeem (read-only)
 */
import { NextResponse } from "next/server";
import { type Address, formatUnits, parseUnits } from "viem";
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

  const url = new URL(req.url);
  const deposit = url.searchParams.get("deposit");
  const shares = url.searchParams.get("shares");

  try {
    const client = getPublicClient();

    if (deposit) {
      const assets = parseUnits(deposit, 6);
      const out = (await client.readContract({
        address: vault,
        abi: VAULT_ABI,
        functionName: "previewDeposit",
        args: [assets],
      })) as bigint;
      return NextResponse.json({ deposit: deposit, shares: formatUnits(out, 18) });
    }

    if (shares) {
      const out = (await client.readContract({
        address: vault,
        abi: VAULT_ABI,
        functionName: "previewRedeem",
        args: [parseUnits(shares, 18)],
      })) as bigint;
      return NextResponse.json({ shares, assets: formatUnits(out, 6) });
    }

    return NextResponse.json(
      { error: "specify --deposit <usdc> or --shares <n>" },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "preview failed" },
      { status: 502 },
    );
  }
}
