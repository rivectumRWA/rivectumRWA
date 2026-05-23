"use client";
import useSWR from "swr";
import { usePrivy } from "@privy-io/react-auth";
import type { VaultSnapshot } from "@/app/api/vault/snapshot/route";

export function useVaultSnapshot() {
  const { getAccessToken } = usePrivy();

  const fetcher = async (url: string): Promise<VaultSnapshot> => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`vault snapshot ${r.status}`);
    return r.json();
  };

  return useSWR<VaultSnapshot>("/api/vault/snapshot", fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    dedupingInterval: 10_000,
  });
}
