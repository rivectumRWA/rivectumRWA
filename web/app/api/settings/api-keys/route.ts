import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import {
  generateApiKey,
  revokeApiKey,
  listApiKeys,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — list active API keys for the authenticated user
export async function GET(req: Request) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const all = url.searchParams.get("all") === "1";

  const rows = all ? listApiKeys() : listApiKeys(auth.userId ?? undefined);
  return NextResponse.json(rows);
}

// POST — generate a new API key
export async function POST(req: Request) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const body = await req.json().catch(() => ({}));
  const label = typeof body.label === "string" ? body.label.slice(0, 60) : "";

  const { raw, row } = generateApiKey(auth.userId ?? "unknown", label);

  return NextResponse.json({
    raw,
    key: {
      id: row.id,
      user_wallet: row.user_wallet,
      label: row.label,
      created_at: row.created_at,
      revoked: row.revoked === 1,
    },
  });
}

// DELETE — revoke an API key by id
export async function DELETE(req: Request) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const idParam = url.searchParams.get("id");
  const id = idParam ? Number(idParam) : NaN;

  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "invalid key id" }, { status: 400 });
  }

  const ok = revokeApiKey(id);
  if (!ok) {
    return NextResponse.json({ error: "key not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
