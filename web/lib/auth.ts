import { PrivyClient, type AuthTokenClaims } from "@privy-io/server-auth";

let _client: PrivyClient | null = null;

function getClient(): PrivyClient {
  if (_client) return _client;
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error(
      "Privy config missing: set NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_APP_SECRET in env",
    );
  }
  _client = new PrivyClient(appId, appSecret);
  return _client;
}

/**
 * Verify the Privy access token from the Authorization header.
 * Returns claims if valid, null if no token provided, throws on invalid token.
 */
async function verifyPrivyAccessToken(
  authHeader: string | null,
): Promise<AuthTokenClaims | null> {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const client = getClient();
  return client.verifyAuthToken(token);
}

/**
 * Authenticate a request using the Privy access token from the Authorization header.
 * Returns AuthTokenClaims on success, or a 401 Response on failure.
 */
export async function authenticateRequest(
  req: Request,
): Promise<AuthTokenClaims | Response> {
  try {
    const claims = await verifyPrivyAccessToken(
      req.headers.get("authorization"),
    );
    if (!claims) {
      return new Response(
        JSON.stringify({ error: "authentication required" }),
        { status: 401, headers: { "content-type": "application/json" } },
      );
    }
    return claims;
  } catch {
    return new Response(
      JSON.stringify({ error: "invalid access token" }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }
}
