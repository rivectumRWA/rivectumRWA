import type { Address } from "viem";
import type { AssetInfo } from "./types";

const ZERO: Address = "0x0000000000000000000000000000000000000000";

// Base Sepolia. Verify on https://sepolia.basescan.org before running.
export const BASE_SEPOLIA_USDC: Address =
  ((process.env.USDC_ADDRESS as Address) ??
    "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as Address;

export const UNDERLYINGS: AssetInfo[] = [
  {
    address: ((process.env.UNDERLYING_1 as Address) ?? ZERO) as Address,
    symbol: "U1",
    decimals: 6,
  },
  {
    address: ((process.env.UNDERLYING_2 as Address) ?? ZERO) as Address,
    symbol: "U2",
    decimals: 6,
  },
];
