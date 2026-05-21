/**
 * Demo-mode helper. When NEXT_PUBLIC_DEMO=1, components fall back to seeded
 * mock state so screenshots and pitch demos look "alive" without an active
 * deployment. Real on-chain reads still take priority when they return data.
 */

export const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

export interface DemoDecision {
  id: number;
  ts: number;
  intentHash: string;
  nonce: number;
  allocationsJson: string;
  txHash: string | null;
  status: "success" | "failed" | "pending";
  errorMsg: string | null;
}

const DEMO_UNDERLYINGS = [
  "0x4D5F47FA6Ab8B4C5e2E11a0EF67E63b5b7c93Cb1",
  "0x9e68F6Be0bDD78B7C2a4F9bF2D0c9C4D3A2B1E50",
];

/** Deterministic 64-char hex stream so a re-render does not shuffle hashes. */
function hex64(seed: number): string {
  let s = (seed * 2654435761) >>> 0;
  let out = "0x";
  for (let i = 0; i < 8; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    out += s.toString(16).padStart(8, "0");
  }
  return out.slice(0, 66);
}

/** Distribute timestamps non-uniformly so they look like real cron drift. */
function decisionTs(now: number, i: number, jitterSeed: number): number {
  // base 5-min slots back in time, jittered by ±~60s using deterministic noise
  const base = i * 5 * 60_000;
  const j = (Math.sin(jitterSeed + i * 1.7) * 60_000) | 0;
  return now - base - 90_000 - j;
}

/**
 * Generate a deterministic-ish stream of past decisions for demo purposes.
 * Latest entry is `success` with full 60/40 allocation.
 */
export function demoDecisions(count = 8): DemoDecision[] {
  const now = Date.now();
  const out: DemoDecision[] = [];
  for (let i = 0; i < count; i++) {
    const status: DemoDecision["status"] =
      i === 2 ? "failed" : i === 0 ? "success" : i % 5 === 0 ? "pending" : "success";
    const swap60 = i % 2 === 0;
    out.push({
      id: count - i,
      ts: decisionTs(now, i, 0xb0b),
      intentHash: hex64(0xa11ce + i * 7),
      nonce: count - i - 1,
      allocationsJson: JSON.stringify([
        {
          asset: swap60 ? DEMO_UNDERLYINGS[0] : DEMO_UNDERLYINGS[1],
          bps: 6000,
        },
        {
          asset: swap60 ? DEMO_UNDERLYINGS[1] : DEMO_UNDERLYINGS[0],
          bps: 4000,
        },
      ]),
      txHash: status === "success" ? hex64(0xdead + i * 13) : null,
      status,
      errorMsg:
        status === "failed"
          ? "underlying.previewRedeem reverted: insufficient liquidity"
          : null,
    });
  }
  return out;
}

/** TVL placeholder when no on-chain data + demo mode on (in raw 6-dec units). */
export const DEMO_TVL_USDC = 124_580n * 10n ** 6n;
/** Total supply placeholder (18 decimals). */
export const DEMO_TOTAL_SUPPLY = 124_127n * 10n ** 18n;

/** Fake but plausible address book for ContractCard when contract not deployed. */
export const DEMO_VAULT_ADDRESS = "0xC1bA38EaD03DB7Bb04F2c6e80B3F12d495c81b34";
export const DEMO_AGENT_DID = "0x71E2dC9B9dF8E5b88a4c5E36F0b5D9F07Ab92a4D";
export const DEMO_OWNER_ADDRESS = "0x4F8A22a3DcCDB8Db4fF0e7b3a8d4A99e3c1B6e72";

export const DEMO_UNDERLYING_LIST: ReadonlyArray<{
  address: string;
  symbol: string;
  name: string;
}> = [
  {
    address: DEMO_UNDERLYINGS[0],
    symbol: "sUSDe",
    name: "Ethena Staked USDe",
  },
  {
    address: DEMO_UNDERLYINGS[1],
    symbol: "sDAI",
    name: "Spark Savings DAI",
  },
];
