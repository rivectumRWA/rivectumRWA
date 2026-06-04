"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Key, Copy, Check, Trash2, Plus, ShieldAlert } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

interface ApiKeyItem {
  id: number;
  user_wallet: string;
  label: string;
  created_at: number;
  revoked: boolean;
}

interface GenerateResult {
  raw: string;
  key: ApiKeyItem;
}

export function ApiKeyManager() {
  const { getAccessToken } = usePrivy();

  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const authHeaders = useCallback(async () => {
    const token = await getAccessToken();
    const h: Record<string, string> = { "content-type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [getAccessToken]);

  const fetchKeys = useCallback(async () => {
    const headers = await authHeaders();
    const r = await fetch("/api/settings/api-keys", { headers });
    if (r.ok) setKeys(await r.json());
    setLoading(false);
  }, [authHeaders]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const headers = await authHeaders();
      const r = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers,
        body: JSON.stringify({ label }),
      });
      if (r.ok) {
        const data: GenerateResult = await r.json();
        setNewKey(data.raw);
        await fetchKeys();
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke(id: number) {
    const headers = await authHeaders();
    const r = await fetch(`/api/settings/api-keys?id=${id}`, {
      method: "DELETE",
      headers,
    });
    if (r.ok) await fetchKeys();
  }

  async function copyKey(raw: string) {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <Card>
      <CardHeader
        icon={<Key size={16} strokeWidth={1.5} />}
        title="api keys"
        badge={
          keys.length > 0 ? (
            <Badge variant="ready">{keys.length} active</Badge>
          ) : undefined
        }
      />

      {/* NEW KEY WARNING */}
      {newKey && (
        <div className="mb-4 rounded-lg border border-accent bg-surface-muted p-4">
          <div className="flex items-start gap-2">
            <ShieldAlert
              size={16}
              strokeWidth={1.5}
              className="mt-0.5 shrink-0 text-accent"
            />
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-medium text-text">
                Save this key — it will not be shown again
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 block text-[12px] font-mono text-text bg-bg rounded px-2 py-1.5 break-all select-all">
                  {newKey}
                </code>
                <Button
                  size="sm"
                  variant="secondary"
                  iconRight={
                    copied ? (
                      <Check size={14} strokeWidth={2} />
                    ) : (
                      <Copy size={14} strokeWidth={1.5} />
                    )
                  }
                  onClick={() => copyKey(newKey)}
                >
                  {copied ? "copied" : "copy"}
                </Button>
              </div>
              <p className="text-[11px] font-mono text-text-subtle">
                Use with CLI: <code>serra --api-key KEY</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* GENERATE FORM */}
      <div className="flex items-end gap-2 mb-4">
        <div className="flex-1">
          <label className="microlabel block mb-1">key label (optional)</label>
          <Input
            placeholder="e.g. ops-bot-1"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleGenerate();
            }}
          />
        </div>
        <Button
          variant="primary"
          iconLeft={<Plus size={14} strokeWidth={1.5} />}
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? "generating…" : "generate"}
        </Button>
      </div>

      {/* KEY LIST */}
      {loading ? (
        <p className="text-sm text-text-subtle">loading…</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-text-subtle">
          no api keys yet. generate one to connect the CLI.
        </p>
      ) : (
        <ul className="space-y-2">
          {keys.map((k) => (
            <li
              key={k.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm text-text truncate">
                  {k.label || `key #${k.id}`}
                </p>
                <p className="text-[11px] font-mono text-text-subtle">
                  created{" "}
                  {new Date(k.created_at * 1000).toLocaleDateString()}
                </p>
              </div>
              <Button
                size="sm"
                variant="danger"
                iconLeft={<Trash2 size={12} strokeWidth={1.5} />}
                onClick={() => handleRevoke(k.id)}
              >
                revoke
              </Button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-[11px] font-mono text-text-subtle">
        keys are hashed with sha-256 · never stored in plaintext
      </p>
    </Card>
  );
}
