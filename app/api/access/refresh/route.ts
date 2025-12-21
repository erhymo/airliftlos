import { NextResponse } from "next/server";
import { createAccessToken, verifyAccessToken } from "../../../../lib/accessToken";
import { getAccessTokenFromRequest, isAccessProtectionEnabled } from "../../../../lib/serverAuth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isAccessProtectionEnabled()) {
    // I utvikling uten ACCESS_CODE er det ingen reell ls, men vi svarer ok for enkelhets skyld.
    return NextResponse.json({ ok: true, disabled: true });
  }

  const currentToken = getAccessTokenFromRequest(req);
  if (!currentToken) {
    return NextResponse.json({ error: "Missing access token" }, { status: 403 });
  }

  const ver = verifyAccessToken(currentToken);
  if (!ver.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { token, expiresAt } = createAccessToken();
  return NextResponse.json({ ok: true, token, expiresAt });
}

