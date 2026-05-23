"use client";
import { useState } from "react";
import useSWR from "swr";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowDownToLine, ArrowUpFromLine, Calculator } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";

interface PreviewData {
  source: "live" | "demo";
  previewDepositShares: string;
  previewRedeemAssets: string;
}

export function PreviewSimulator() {
  const [assets, setAssets] = useState("100");
  const [shares, setShares] = useState("100");
  const { getAccessToken } = usePrivy();

  const fetcher = async (url: string): Promise<PreviewData> => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`preview ${r.status}`);
    return r.json();
  };

  const params = new URLSearchParams({
    assets: assets || "0",
    shares: shares || "0",
  });
  const { data, isLoading, error } = useSWR<PreviewData>(
    `/api/vault/preview?${params.toString()}`,
    fetcher,
    {
      refreshInterval: 30_000,
      keepPreviousData: true,
      dedupingInterval: 800,
    },
  );

  return (
    <Card>
      <CardHeader
        icon={<Calculator size={16} strokeWidth={1.5} />}
        title="preview simulator"
        badge={
          <div className="flex items-center gap-2">
            {data?.source === "demo" && <Badge variant="neutral">demo</Badge>}
            <Badge variant={error ? "blocked" : isLoading ? "fresh" : "ready"}>
              {error ? "rpc error" : isLoading ? "computing" : "live"}
            </Badge>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SimRow
          icon={<ArrowDownToLine size={14} strokeWidth={1.5} />}
          label="if i deposit"
          unit="usdc"
          inputValue={assets}
          onChange={setAssets}
          resultLabel="i would receive"
          resultValue={data?.previewDepositShares}
          resultUnit="vault shares"
        />
        <SimRow
          icon={<ArrowUpFromLine size={14} strokeWidth={1.5} />}
          label="if i redeem"
          unit="shares"
          inputValue={shares}
          onChange={setShares}
          resultLabel="i would receive"
          resultValue={data?.previewRedeemAssets}
          resultUnit="usdc"
        />
      </div>

      <p className="mt-4 text-[11px] text-text-subtle font-mono border-t border-border pt-3">
        previews are non-binding view calls and exclude tx gas. live values
        update every 30s.
      </p>
    </Card>
  );
}

function SimRow({
  icon,
  label,
  unit,
  inputValue,
  onChange,
  resultLabel,
  resultValue,
  resultUnit,
}: {
  icon: React.ReactNode;
  label: string;
  unit: string;
  inputValue: string;
  onChange: (v: string) => void;
  resultLabel: string;
  resultValue?: string;
  resultUnit: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 microlabel mb-2">
        <span className="text-text-subtle">{icon}</span>
        <span>{label}</span>
      </div>
      <Input
        value={inputValue}
        onChange={(e) => onChange(sanitize(e.target.value))}
        suffix={unit}
        mono
        inputMode="decimal"
      />
      <div className="mt-3 pt-3 border-t border-border">
        <p className="microlabel mb-1">{resultLabel}</p>
        <p className="text-base font-mono tabular text-text break-words">
          {resultValue ? trim(resultValue) : "—"}{" "}
          <span className="text-text-subtle text-sm">{resultUnit}</span>
        </p>
      </div>
    </div>
  );
}

function sanitize(v: string): string {
  return v.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
}

function trim(v: string): string {
  if (!v.includes(".")) return v;
  return v.replace(/\.?0+$/, "");
}
