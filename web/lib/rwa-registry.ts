/**
 * RWA Metadata Registry — maps underlying vault addresses to real-world
 * asset class information for the dashboard metadata panel.
 *
 * Extend this registry as new underlying vaults are whitelisted.
 */

export interface RwaAssetMeta {
  /** The underlying vault address (checksummed). */
  address: string;
  /** Asset class label, e.g. "Treasury Yield". */
  category: string;
  /** One-liner description of the backing asset. */
  description: string;
  /** Short collateral or risk summary. */
  riskLabel: string;
  /** Icon from lucide-react to display. */
  iconName: "Building2" | "Landmark" | "Home" | "CreditCard" | "Shield" | "Coins";
}

const REGISTRY: ReadonlyArray<RwaAssetMeta> = [
  {
    address: "0x4D5F47FA6Ab8B4C5e2E11a0EF67E63b5b7c93Cb1",
    category: "Delta-Neutral Yield",
    description:
      "Ethena Staked USDe — basis-trade yield from ETH spot + perpetual futures funding rates.",
    riskLabel: "medium · funding-rate risk",
    iconName: "Building2",
  },
  {
    address: "0x9e68F6Be0bDD78B7C2a4F9bF2D0c9C4D3A2B1E50",
    category: "T-Bill / Savings",
    description:
      "Spark Savings DAI — yield from MakerDAO's DSR, backed by US T-Bills and real-world collateral.",
    riskLabel: "low · sovereign bond",
    iconName: "Landmark",
  },
];

export function lookupRwaMeta(address: string): RwaAssetMeta | undefined {
  const lower = address.toLowerCase();
  return REGISTRY.find((m) => m.address.toLowerCase() === lower);
}

export function getRwaMeta(addresses: string[]): Map<string, RwaAssetMeta> {
  const map = new Map<string, RwaAssetMeta>();
  for (const addr of addresses) {
    const meta = lookupRwaMeta(addr);
    if (meta) map.set(addr.toLowerCase(), meta);
  }
  return map;
}
