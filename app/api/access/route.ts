import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const accessCode = process.env.ACCESS_CODE;

  // Hvis ACCESS_CODE ikke er satt i miljøet, lar vi tilgang være åpen
  // slik at vi ikke låser appen utilsiktet i lokal utvikling. I produksjon/preview
  // skal en manglende ACCESS_CODE derimot nekte alle, ikke slippe alle inn.
  if (!accessCode) {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ ok: true, warning: "ACCESS_CODE not configured" });
    }
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = (await req.json()) as { code?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  if (body.code !== accessCode) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  // Sett en HttpOnly-cookie som kan brukes av API-et til  verifisere tilgang
  res.cookies.set("airliftlos_access", "ok", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // ett r
  });

  return res;
}

