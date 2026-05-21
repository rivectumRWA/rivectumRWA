"use client";
import { ShieldCheck, Pause, Play, Coins, Network, Layers } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useVaultSnapshot } from "@/lib/useVaultSnapshot";
import { Address } from "./AddressLink";

export function VaultStateGrid() {
  const { data, isLoading } = useVaultSnapshot();

  return (
    <Card>
      <CardHeader
        icon={<ShieldCheck size={16} strokeWidth={1.5} />}
        title="vault state"
        badge={
          <div className="flex items-center gap-2">
            {data?.source === "demo" && <Badge variant="neutral">demo</Badge>}
            <Badge variant={isLoading ? "fresh" : data?.paused ? "blocked" : "enabled"}>
              {isLoading ? "loading" : data?.paused ? "paused" : "live"}
            </Badge>
          </div>
        }
      />

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        <Row
          icon={data?.paused ? <Pause size={14} strokeWidth={1.5} /> : <Play size={14} strokeWidth={1.5} />}
          label="status"
          value={data?.paused ? "paused (deposits + rebalance frozen)" : "operational"}
        />
        <Row
          icon={<Network size={14} strokeWidth={1.5} />}
          label="network"
          value={data?.network ?? "—"}
          mono
        />
        <Row
          icon={<Coins size={14} strokeWidth={1.5} />}
          label="underlying asset"
          value={data?.asset ? <Address address={data.asset} /> : "—"}
        />
        <Row
          icon={<Layers size={14} strokeWidth={1.5} />}
          label="underlyings"
          value={data ? `${data.underlyings.length} whitelisted` : "—"}
          mono
        />
        <Row
          icon={<ShieldCheck size={14} strokeWidth={1.5} />}
          label="owner"
          value={data?.owner ? <Address address={data.owner} /> : "—"}
        />
        <Row
          icon={<ShieldCheck size={14} strokeWidth={1.5} />}
          label="agent did"
          value={data?.agentDid ? <Address address={data.agentDid} /> : "—"}
        />
      </dl>
    </Card>
  );
}

function Row({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="microlabel flex items-center gap-1.5">
        <span className="text-text-subtle">{icon}</span>
        <span>{label}</span>
      </dt>
      <dd className={mono ? "text-sm font-mono text-text" : "text-sm text-text"}>
        {value}
      </dd>
    </div>
  );
}
