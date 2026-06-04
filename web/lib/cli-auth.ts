/**
 * cli-auth.ts — API key authentication for CLI endpoints.
 *
 * Verifies the X-API-Key header against the api_keys table.
 * Works in parallel with auth.ts (Privy JWT) for different endpoint families.
 */
import { validateApiKey, type ApiKeyRow } from "@/lib/db";

export interface CliAuthResult {
  user_wallet: string;
}

/**
 * Authenticate a CLI request using the X-API-Key header.
 * Returns { user_wallet } on success, Response (401) on failure.
 */
export async function authenticateCliRequest(
  req: Request,
): Promise<CliAuthResult | Response> {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "missing x-api-key header" }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }

  const row = validateApiKey(apiKey);
  if (!row) {
    return new Response(
      JSON.stringify({ error: "invalid or revoked api key" }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }

  return { user_wallet: row.user_wallet };
}
