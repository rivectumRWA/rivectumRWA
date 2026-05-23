import { NextResponse } from "next/server";
import { type Address, formatUnits, isAddress } from "viem";
import { getPublicClient } from "@/lib/server-rpc";
import { VAULT_ABI, ERC4626_ABI, USDC_ABI } from "@/lib/abi";
import {
  DEMO,
  DEMO_VAULT_ADDRESS,
  DEMO_AGENT_DID,
  DEMO_OWNER_ADDRESS,
  DEMO_TVL_USDC,
  DEMO_TOTAL_SUPPLY,
  DEMO_UNDERLYING_LIST,
} from "@/lib/demo";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface VaultUnderlying {
  address: Address;
  symbol: string;
  name: string;
  underlyingAsset: Address | null;
  vaultBalance: string;
  redeemValueUsdc: string;
}

export interface VaultSnapshot {
  vaultAddress: Address;
  network: string;
  asset: Address | null;
  paused: boolean;
  owner: Address | null;
  agentDid: Address | null;
  totalAssets: string;
  totalSupply: string;
  sharePrice: number;
  nextNonce: number;
  underlyings: VaultUnderlying[];
  source: "live" | "demo";
  generatedAt: string;
}

export async function GET() {
  const envVault = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? "") as string;
  if (!isAddress(envVault) || envVault === "0x0000000000000000000000000000000000000000") {
    return NextResponse.json(buildDemoSnapshot());
  }

  try {
    const snapshot = await readLiveSnapshot(envVault as Address);
    return NextResponse.json(snapshot);
  } catch (err) {
    if (DEMO) return NextResponse.json(buildDemoSnapshot());
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "rpc read failed" },
      { status: 502 },
    );
  }
}

async function readLiveSnapshot(vault: Address): Promise<VaultSnapshot> {
  const client = getPublicClient();
  const [
    paused,
    owner,
    agentDid,
    totalAssetsRaw,
    totalSupplyRaw,
    nextNonce,
    asset,
    underlyings,
  ] = await Promise.all([
    client.readContract({ address: vault, abi: VAULT_ABI, functionName: "paused" }),
    client.readContract({ address: vault, abi: VAULT_ABI, functionName: "owner" }),
    client.readContract({ address: vault, abi: VAULT_ABI, functionName: "agentDid" }),
    client.readContract({ address: vault, abi: VAULT_ABI, functionName: "totalAssets" }),
    client.readContract({ address: vault, abi: VAULT_ABI, functionName: "totalSupply" }),
    client.readContract({ address: vault, abi: VAULT_ABI, functionName: "nextNonce" }),
    client
      .readContract({ address: vault, abi: VAULT_ABI, functionName: "asset" })
      .catch(() => null),
    client.readContract({
      address: vault,
      abi: VAULT_ABI,
      functionName: "getUnderlyings",
    }),
  ]);

  const ulList = underlyings as readonly Address[];
  const enriched = await Promise.all(
    ulList.map((addr) => readUnderlying(addr, vault)),
  );

  const sharePrice = computeSharePrice(
    totalAssetsRaw as bigint,
    totalSupplyRaw as bigint,
  );

  return {
    vaultAddress: vault,
    network: "base-sepolia",
    asset: (asset as Address) ?? null,
    paused: paused as boolean,
    owner: owner as Address,
    agentDid: agentDid as Address,
    totalAssets: formatUnits(totalAssetsRaw as bigint, 6),
    totalSupply: formatUnits(totalSupplyRaw as bigint, 18),
    sharePrice,
    nextNonce: Number(nextNonce as bigint),
    underlyings: enriched,
    source: "live",
    generatedAt: new Date().toISOString(),
  };
}

async function readUnderlying(addr: Address, vault: Address): Promise<VaultUnderlying> {
  const client = getPublicClient();
  const [symbol, name, underlyingAsset, balance] = await Promise.all([
    client
      .readContract({ address: addr, abi: ERC4626_ABI, functionName: "symbol" })
      .catch(() => "—"),
    client
      .readContract({ address: addr, abi: ERC4626_ABI, functionName: "name" })
      .catch(() => "unknown vault"),
    client
      .readContract({ address: addr, abi: ERC4626_ABI, functionName: "asset" })
      .catch(() => null as unknown as Address),
    client
      .readContract({
        address: addr,
        abi: ERC4626_ABI,
        functionName: "balanceOf",
        args: [vault],
      })
      .catch(() => 0n),
  ]);

  let redeemValueUsdc = "0";
  try {
    const usdcOut = (await client.readContract({
      address: addr,
      abi: ERC4626_ABI,
      functionName: "previewRedeem",
      args: [balance as bigint],
    })) as bigint;
    redeemValueUsdc = formatUnits(usdcOut, 6);
  } catch {
    /* if previewRedeem reverts (paused, illiquid), surface zero */
  }

  return {
    address: addr,
    symbol: symbol as string,
    name: name as string,
    underlyingAsset: (underlyingAsset as Address) ?? null,
    vaultBalance: formatUnits(balance as bigint, 18),
    redeemValueUsdc,
  };
}

function computeSharePrice(totalAssets: bigint, totalSupply: bigint): number {
  if (totalSupply === 0n) return 1;
  // shares are 18 decimals, assets are 6 decimals
  const numerator = Number(totalAssets) / 1e6;
  const denominator = Number(totalSupply) / 1e18;
  if (denominator === 0) return 1;
  return +(numerator / denominator).toFixed(6);
}

function buildDemoSnapshot(): VaultSnapshot {
  const ta = Number(DEMO_TVL_USDC) / 1e6;
  const ts = Number(DEMO_TOTAL_SUPPLY) / 1e18;
  const sharePrice = ts === 0 ? 1 : +(ta / ts).toFixed(6);
  const halfTvl = (DEMO_TVL_USDC * 5n) / 10n;
  const cap60 = (DEMO_TVL_USDC * 6n) / 10n;
  const cap40 = (DEMO_TVL_USDC * 4n) / 10n;

  const underlyings: VaultUnderlying[] = DEMO_UNDERLYING_LIST.map((u, i) => ({
    address: u.address as Address,
    symbol: u.symbol,
    name: u.name,
    underlyingAsset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address,
    vaultBalance: i === 0 ? formatUnits(cap60, 18) : formatUnits(cap40, 18),
    redeemValueUsdc:
      i === 0 ? formatUnits(cap60, 6) : formatUnits(cap40, 6),
  }));

  return {
    vaultAddress: DEMO_VAULT_ADDRESS as Address,
    network: "base-sepolia",
    asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address,
    paused: false,
    owner: DEMO_OWNER_ADDRESS as Address,
    agentDid: DEMO_AGENT_DID as Address,
    totalAssets: formatUnits(DEMO_TVL_USDC, 6),
    totalSupply: formatUnits(DEMO_TOTAL_SUPPLY, 18),
    sharePrice,
    nextNonce: 142,
    underlyings,
    source: "demo",
    generatedAt: new Date().toISOString(),
  };
}
