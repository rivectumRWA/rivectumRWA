"use client";
import { useEffect, useState } from "react";

interface Decision {
  id: number;
  ts: number;
  allocationsJson: string;
  status: string;
}

export function AllocationPie() {
  const [latest, setLatest] = useState<Decision | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = () =>
      fetch("/api/decisions")
        .then((r) => r.json())
        .then((rows: Decision[]) => {
          const success = rows.find((r) => r.status === "success") ?? rows[0] ?? null;
          setLatest(success);
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  if (!loaded) {
    return (
      <div style={{ padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
        <h3 style={{ marginTop: 0 }}>Current Allocation</h3>
        <p style={{ fontSize: 12 }}>loading...</p>
      </div>
    );
  }

  if (!latest) {
    return (
      <div style={{ padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
        <h3 style={{ marginTop: 0 }}>Current Allocation</h3>
        <p style={{ fontSize: 12 }}>No allocation yet.</p>
      </div>
    );
  }

  let allocs: { asset: string; bps: number }[] = [];
  try {
    allocs = JSON.parse(latest.allocationsJson);
  } catch {
    /* ignore parse errors */
  }

  return (
    <div style={{ padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>Current Allocation</h3>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {allocs.map((a) => (
          <li key={a.asset} style={{ fontFamily: "monospace", fontSize: 13 }}>
            {a.asset.slice(0, 10)}… {(a.bps / 100).toFixed(1)}%
          </li>
        ))}
      </ul>
    </div>
  );
}
