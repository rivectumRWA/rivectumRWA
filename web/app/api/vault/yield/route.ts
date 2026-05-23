import { NextResponse } from "next/server";
import { type Address, isAddress, formatUnits } from "viem";
import { getPublicClient } from "@/lib/server-rpc";
import { ERC4626_ABI } from "@/lib/abi";
import { DEMO, DEMO_UNDERLYING_LIST } from "@/lib/demo";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface YieldEntry {
  address: string;
  symbol: string;
  name: string;
  /** APY in basis points. 1 bp = 0.01%. */
  apyBps: number;
  /** Human-readable APY string, e.g. "5.84%". */
  apyDisplay: string;
  /** Raw convertToAssets(1e18) scaled to 1e6 for ranking. */
  rawScore: number;
  source: "live" | "demo";
}

/**
 * Probe APY for a single ERC-4626 vault via convertToAssets(1e18).
 * Higher value = more assets per share = better return proxy.
 * Returns scaled score (1e6 base) for ranking.
 */
async function probeYield(asset: Address): Promise<number> {
  const client = getPublicClient();
  const v = (await client.readContract({
    address: asset,
    abi: ERC4626_ABI,
    functionName: "convertToAssets",
    args: [10n ** 18n],
  })) as bigint;
  return Number(v / 10n ** 12n);
}

export async function GET(req: Request) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const envVault = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? "") as string;

  if (!isAddress(envVault) || envVault === "0x0000000000000000000000000000000000000000") {
    return NextResponse.json(buildDemoYield());
  }

  try {
    // Derive underlyings from on-chain + env config
    const underlying1 = (process.env.NEXT_PUBLIC_UNDERLYING_1 ?? "") as string;
    const underlying2 = (process.env.NEXT_PUBLIC_UNDERLYING_2 ?? "") as string;
    const addrs = [underlying1, underlying2].filter(
      (a) => isAddress(a) && a !== "0x0000000000000000000000000000000000000000",
    );

    if (addrs.length === 0) {
      return NextResponse.json(buildDemoYield());
    }

    const client = getPublicClient();
    const entries = await Promise.all(
      addrs.map(async (addr) => {
        const addrTyped = addr as Address;
        const [symbol, name, rawScore] = await Promise.all([
          client
            .readContract({ address: addrTyped, abi: ERC4626_ABI, functionName: "symbol" })
            .catch(() => "—"),
          client
            .readContract({ address: addrTyped, abi: ERC4626_ABI, functionName: "name" })
            .catch(() => "unknown vault"),
          probeYield(addrTyped).catch(() => 0),
        ]);

        const apyBps = rawScore > 0 ? Math.round((rawScore / 1e6 - 1) * 10000) : 0;
        return {
          address: addr,
          symbol: symbol as string,
          name: name as string,
          apyBps: Math.max(0, apyBps),
          apyDisplay: `${(apyBps / 100).toFixed(2)}%`,
          rawScore,
          source: "live" as const,
        };
      }),
    );

    entries.sort((a, b) => b.rawScore - a.rawScore);
    return NextResponse.json(entries);
  } catch {
    if (DEMO) return NextResponse.json(buildDemoYield());
    return NextResponse.json(
      { error: "yield probe failed" },
      { status: 502 },
    );
  }
}

function buildDemoYield(): YieldEntry[] {
  const entries: YieldEntry[] = [
    {
      address: DEMO_UNDERLYING_LIST[0].address,
      symbol: "sUSDe",
      name: "Ethena Staked USDe",
      apyBps: 1042,
      apyDisplay: "10.42%",
      rawScore: 1103000,
      source: "demo",
    },
    {
      address: DEMO_UNDERLYING_LIST[1].address,
      symbol: "sDAI",
      name: "Spark Savings DAI",
      apyBps: 750,
      apyDisplay: "7.50%",
      rawScore: 1075000,
      source: "demo",
    },
  ];
  entries.sort((a, b) => b.apyBps - a.apyBps);
  return entries;
}
