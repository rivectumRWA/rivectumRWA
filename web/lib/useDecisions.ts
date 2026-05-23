"use client";
import useSWR from "swr";
import { usePrivy } from "@privy-io/react-auth";

export type DecisionStatus = "success" | "failed" | "pending";

export interface Decision {
  id: number;
  ts: number;
  intentHash: string;
  nonce: number;
  allocationsJson: string;
  txHash: string | null;
  status: DecisionStatus;
  errorMsg: string | null;
}

export function useDecisions(
  params: { status?: DecisionStatus | "all"; limit?: number } = {},
) {
  const { getAccessToken } = usePrivy();

  const fetcher = async (url: string): Promise<Decision[]> => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`decisions ${r.status}`);
    return r.json();
  };

  const qs = new URLSearchParams();
  if (params.status && params.status !== "all") qs.set("status", params.status);
  if (params.limit) qs.set("limit", String(params.limit));
  const key = `/api/decisions${qs.toString() ? `?${qs}` : ""}`;
  return useSWR<Decision[]>(key, fetcher, {
    refreshInterval: 15_000,
    revalidateOnFocus: true,
    keepPreviousData: true,
  });
}
