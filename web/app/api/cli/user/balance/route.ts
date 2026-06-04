/**
 * GET /api/cli/user/balance — user balances (read-only)
 */
import { NextResponse } from "next/server";
import { type Address, formatUnits } from "viem";
import { getPublicClient } from "@/lib/server-rpc";
import { VAULT_ABI, USDC_ABI } from "@/lib/abi";
import { authenticateCliRequest } from "@/lib/cli-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateCliRequest(req);
  if (auth instanceof Response) return auth;

  const vault = process.env.NEXT_PUBLIC_VAULT_ADDRESS as Address | undefined;
  const usdcAddr = process.env.NEXT_PUBLIC_USDC_ADDRESS as Address | undefined;
  if (!vault || !usdcAddr) {
    return NextResponse.json(
      { error: "VAULT_ADDRESS or USDC_ADDRESS not configured" },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const addr = url.searchParams.get("address") || auth.user_wallet;

  try {
    const client = getPublicClient();
    const address = addr as Address;
    const [usdcBalance, sharesBalRaw, previewRedeemOut] = await Promise.all([
      client.readContract({ address: usdcAddr, abi: USDC_ABI, functionName: "balanceOf", args: [address] }),
      client.readContract({ address: vault, abi: VAULT_ABI, functionName: "balanceOf", args: [address] }),
      client.readContract({ address: vault, abi: VAULT_ABI, functionName: "previewRedeem", args: [1n] }).catch(() => 0n),
    ]);

    const sharesBal = sharesBalRaw as bigint;
    let redeemable = 0n;
    if (sharesBal > 0n) {
      redeemable = (await client.readContract({
        address: vault,
        abi: VAULT_ABI,
        functionName: "previewRedeem",
        args: [sharesBal],
      }).catch(() => 0n)) as bigint;
    }

    return NextResponse.json({
      address,
      usdc: formatUnits(usdcBalance as bigint, 6),
      shares: formatUnits(sharesBal, 18),
      redeemableUsdc: formatUnits(redeemable, 6),
      shareRate: formatUnits(previewRedeemOut as bigint, 6),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "balance read failed" },
      { status: 502 },
    );
  }
}
