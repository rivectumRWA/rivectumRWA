/**
 * db.ts — server-side API key store for SerraRWA web.
 *
 * Uses a small JSON file instead of native SQLite bindings so Next.js API
 * routes can run without better-sqlite3 runtime build issues.
 */
import { createHash, randomBytes } from "node:crypto";
import path from "node:path";
import fs from "node:fs";

// ---- API key operations ----

export interface ApiKeyRow {
  id: number;
  user_wallet: string;
  key_hash: string;
  label: string;
  created_at: number;
  revoked: number;
}

export interface ApiKeyListItem {
  id: number;
  user_wallet: string;
  label: string;
  created_at: number;
  revoked: boolean;
}

interface ApiKeyStore {
  nextId: number;
  keys: ApiKeyRow[];
}

function getStorePath(): string {
  return path.join(process.cwd(), "data", "api-keys.json");
}

function emptyStore(): ApiKeyStore {
  return { nextId: 1, keys: [] };
}

function readStore(): ApiKeyStore {
  const storePath = getStorePath();
  if (!fs.existsSync(storePath)) return emptyStore();

  const parsed = JSON.parse(fs.readFileSync(storePath, "utf8")) as ApiKeyStore;
  return {
    nextId: parsed.nextId,
    keys: parsed.keys,
  };
}

function writeStore(store: ApiKeyStore): void {
  const storePath = getStorePath();
  const dir = path.dirname(storePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const tmpPath = `${storePath}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  fs.renameSync(tmpPath, storePath);
}

/** Hash a raw API key with SHA-256 for storage. */
function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Generate a new API key: returns the raw key (shown once) and stores the hash. */
export function generateApiKey(userWallet: string, label: string): { raw: string; row: ApiKeyRow } {
  const raw = `serra_${randomBytes(32).toString("hex")}`;
  const keyHash = hashKey(raw);
  const store = readStore();
  const row: ApiKeyRow = {
    id: store.nextId,
    user_wallet: userWallet,
    key_hash: keyHash,
    label,
    created_at: Math.floor(Date.now() / 1000),
    revoked: 0,
  };
  store.keys.push(row);
  store.nextId += 1;
  writeStore(store);
  return { raw, row };
}

/** Revoke an API key by id. */
export function revokeApiKey(id: number): boolean {
  const store = readStore();
  const row = store.keys.find((key) => key.id === id);
  if (!row) return false;
  row.revoked = 1;
  writeStore(store);
  return true;
}

/** List active (non-revoked) API keys for a user. */
export function listApiKeys(user_wallet?: string): ApiKeyListItem[] {
  const store = readStore();
  return store.keys
    .filter((row) => row.revoked === 0)
    .filter((row) => (user_wallet ? row.user_wallet === user_wallet : true))
    .sort((a, b) => b.id - a.id)
    .map((r) => ({
      id: r.id,
      user_wallet: r.user_wallet,
      label: r.label,
      created_at: r.created_at,
      revoked: r.revoked === 1,
    }));
}

/** Validate a raw API key. Returns the matching row if valid and not revoked, null otherwise. */
export function validateApiKey(rawKey: string): ApiKeyRow | null {
  const keyHash = hashKey(rawKey);
  const row = readStore().keys.find(
    (key) => key.key_hash === keyHash && key.revoked === 0,
  );
  return row ?? null;
}
