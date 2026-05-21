"use client";
import useSWR from "swr";

export interface Decision {
  id: number;
  ts: number;
  intentHash: string;
  nonce: number;
  allocationsJson: string;
  txHash: string | null;
  status: string;
  errorMsg: string | null;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`decisions ${r.status}`);
    return r.json() as Promise<Decision[]>;
  });

export function useDecisions(params: { status?: string; limit?: number } = {}) {
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
