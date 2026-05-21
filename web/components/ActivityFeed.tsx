"use client";
import { useEffect, useState } from "react";

interface Decision {
  id: number;
  ts: number;
  intentHash: string;
  nonce: number;
  status: string;
  txHash: string | null;
}

export function ActivityFeed() {
  const [rows, setRows] = useState<Decision[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = () =>
      fetch("/api/decisions")
        .then((r) => r.json())
        .then((data: Decision[]) => {
          setRows(data);
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>Agent Activity</h3>
      {!loaded && <p style={{ fontSize: 12 }}>loading...</p>}
      {loaded && rows.length === 0 && (
        <p style={{ fontSize: 12 }}>No decisions yet. Agent runs every 5 min.</p>
      )}
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {rows.map((r) => (
          <li key={r.id} style={{ fontFamily: "monospace", fontSize: 12 }}>
            #{r.nonce} · {new Date(r.ts).toLocaleTimeString()} ·{" "}
            <span
              style={{
                color: r.status === "success" ? "green" : r.status === "failed" ? "red" : "gray",
              }}
            >
              {r.status}
            </span>
            {r.txHash && (
              <a
                href={`https://sepolia.basescan.org/tx/${r.txHash}`}
                target="_blank"
                rel="noreferrer"
                style={{ marginLeft: 4 }}
              >
                ↗
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
