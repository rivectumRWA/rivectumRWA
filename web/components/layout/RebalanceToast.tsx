"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import useSWR from "swr";
import { BellRing, X, ExternalLink } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import type { Decision } from "@/lib/useDecisions";

const BASESCAN = "https://sepolia.basescan.org";

export function RebalanceToast() {
  const { getAccessToken } = usePrivy();
  const lastNonceRef = useRef<number | null>(null);
  const initRef = useRef(false);
  const [toast, setToast] = useState<Decision | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout>>();

  const fetcher = useCallback(
    async (url: string): Promise<Decision[]> => {
      const token = await getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error(`decisions ${r.status}`);
      return r.json();
    },
    [getAccessToken],
  );

  const { data } = useSWR<Decision[]>(
    "/api/decisions?limit=3",
    fetcher,
    { refreshInterval: 15_000, dedupingInterval: 10_000 },
  );

  useEffect(() => {
    if (!data || data.length === 0) return;
    const latest = data[0];

    if (!initRef.current) {
      lastNonceRef.current = latest.nonce;
      initRef.current = true;
      return;
    }

    if (latest.nonce > (lastNonceRef.current ?? 0) && latest.status === "success") {
      setToast(latest);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(() => setToast(null), 8000);
    }

    lastNonceRef.current = Math.max(latest.nonce, lastNonceRef.current ?? 0);
  }, [data]);

  const dismiss = () => {
    setToast(null);
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
  };

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full">
      <div className="rounded-xl border border-border bg-bg-elevated shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success">
            <BellRing size={16} strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text">
              new rebalance detected
            </p>
            <p className="mt-1 text-xs text-text-muted leading-5">
              agent submitted intent #{toast.nonce} with a new allocation
              split. activity feed has full details.
            </p>
            {toast.txHash && (
              <a
                href={`${BASESCAN}/tx/${toast.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-text-muted hover:text-text transition-colors"
              >
                <ExternalLink size={11} />
                view on basescan
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 p-1 -m-1 rounded-md text-text-subtle hover:text-text transition-colors"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
