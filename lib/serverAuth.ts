import { NextResponse } from "next/server";
import { verifyAccessToken } from "./accessToken";

const AUTH_HEADER = "authorization";
const ALT_HEADER = "x-airliftlos-access-token";

export function isAccessProtectionEnabled(): boolean {
  return !!process.env.ACCESS_CODE;
}

export function getAccessTokenFromRequest(req: Request): string | null {
  const auth = req.headers.get(AUTH_HEADER);
  if (auth && auth.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length).trim();
    if (token) return token;
  }

  const fallback = req.headers.get(ALT_HEADER);
  return fallback?.trim() || null;
}

export function requireAccess(req: Request) {
  if (!isAccessProtectionEnabled()) {
    // I utvikling / uten ACCESS_CODE er tilgang ikke leset.
    return null;
  }

  const token = getAccessTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ error: "Missing access token" }, { status: 403 });
  }

  const result = verifyAccessToken(token);
  if (!result.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return null;
}

