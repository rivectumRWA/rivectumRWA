"use client";
import useSWR from "swr";
import type { VaultSnapshot } from "@/app/api/vault/snapshot/route";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`vault snapshot ${r.status}`);
    return r.json() as Promise<VaultSnapshot>;
  });

export function useVaultSnapshot() {
  return useSWR<VaultSnapshot>("/api/vault/snapshot", fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    dedupingInterval: 10_000,
  });
}
