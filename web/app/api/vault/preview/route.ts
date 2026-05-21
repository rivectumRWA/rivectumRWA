import { NextResponse } from "next/server";
import { type Address, isAddress, parseUnits, formatUnits } from "viem";
import { getPublicClient } from "@/lib/server-rpc";
import { VAULT_ABI } from "@/lib/abi";
import { DEMO } from "@/lib/demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PreviewResponse {
  source: "live" | "demo";
  previewDepositShares: string;
  previewRedeemAssets: string;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const assetsStr = url.searchParams.get("assets") ?? "100";
  const sharesStr = url.searchParams.get("shares") ?? "100";
  const vault = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? "") as string;

  let assetsRaw: bigint;
  let sharesRaw: bigint;
  try {
    assetsRaw = parseUnits(assetsStr, 6);
    sharesRaw = parseUnits(sharesStr, 18);
  } catch {
    return NextResponse.json(
      { error: "invalid amount" },
      { status: 400 },
    );
  }

  if (!isAddress(vault) || vault === "0x0000000000000000000000000000000000000000") {
    if (DEMO) return NextResponse.json(demoPreview(assetsStr, sharesStr));
    return NextResponse.json(
      { error: "vault not configured" },
      { status: 503 },
    );
  }

  try {
    const client = getPublicClient();
    const [shares, assetsOut] = await Promise.all([
      client.readContract({
        address: vault as Address,
        abi: VAULT_ABI,
        functionName: "previewDeposit",
        args: [assetsRaw],
      }),
      client.readContract({
        address: vault as Address,
        abi: VAULT_ABI,
        functionName: "previewRedeem",
        args: [sharesRaw],
      }),
    ]);
    const body: PreviewResponse = {
      source: "live",
      previewDepositShares: formatUnits(shares as bigint, 18),
      previewRedeemAssets: formatUnits(assetsOut as bigint, 6),
    };
    return NextResponse.json(body);
  } catch (err) {
    if (DEMO) return NextResponse.json(demoPreview(assetsStr, sharesStr));
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "preview failed" },
      { status: 502 },
    );
  }
}

function demoPreview(assets: string, shares: string): PreviewResponse {
  // Demo: ~1.0 share-price, sub-bps slippage so deposit shares ≈ assets, redeem ≈ shares
  const a = Number(assets);
  const s = Number(shares);
  return {
    source: "demo",
    previewDepositShares: Number.isFinite(a) ? (a * 0.998).toFixed(6) : "0",
    previewRedeemAssets: Number.isFinite(s) ? (s * 1.002).toFixed(6) : "0",
  };
}
