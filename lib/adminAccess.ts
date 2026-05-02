import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ADMIN_COOKIE_NAME = "airliftlos_admin_session";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24 * 365;
const LEGACY_ADMIN_PASSWORD = "annegrethe";

type AdminSessionPayload = {
	iat: number;
	exp: number;
	v: 1;
};

function getAdminPassword() {
	// Fallback bevarer eksisterende admin-passord til ADMIN_PASSWORD er satt i miljøet.
	return process.env.ADMIN_PASSWORD || LEGACY_ADMIN_PASSWORD;
}

function getSecret() {
	const base = process.env.ADMIN_SESSION_SECRET || process.env.ACCESS_CODE || getAdminPassword();
	return crypto.createHash("sha256").update(base).digest();
}

function base64UrlEncode(buf: Buffer) {
	return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
	const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
	const padLength = (4 - (normalized.length % 4)) % 4;
	return Buffer.from(normalized + "=".repeat(padLength), "base64");
}

function safeEquals(left: string, right: string) {
	const leftHash = crypto.createHash("sha256").update(left).digest();
	const rightHash = crypto.createHash("sha256").update(right).digest();
	return crypto.timingSafeEqual(leftHash, rightHash);
}

export function verifyAdminPassword(password: unknown) {
	return typeof password === "string" && safeEquals(password, getAdminPassword());
}

export function createAdminSessionToken() {
	const now = Date.now();
	const payload: AdminSessionPayload = { iat: now, exp: now + ADMIN_SESSION_TTL_SECONDS * 1000, v: 1 };
	const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
	const signatureB64 = base64UrlEncode(crypto.createHmac("sha256", getSecret()).update(payloadB64).digest());
	return `${payloadB64}.${signatureB64}`;
}

function verifyAdminSessionToken(token: string) {
	try {
		const parts = token.split(".");
		if (parts.length !== 2) return false;
		const [payloadB64, signatureB64] = parts;
		const expectedSig = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest();
		const givenSig = base64UrlDecode(signatureB64);
		if (expectedSig.length !== givenSig.length || !crypto.timingSafeEqual(expectedSig, givenSig)) return false;
		const payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8")) as Partial<AdminSessionPayload>;
		return payload.v === 1 && typeof payload.exp === "number" && payload.exp > Date.now();
	} catch {
		return false;
	}
}

export function setAdminSessionCookie(res: NextResponse, token: string) {
	res.cookies.set(ADMIN_COOKIE_NAME, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: ADMIN_SESSION_TTL_SECONDS,
	});
}

export function clearAdminSessionCookie(res: NextResponse) {
	res.cookies.set(ADMIN_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function requireAdminAccess(): Promise<NextResponse | null> {
	const cookieStore = await cookies();
	const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
	if (!token || !verifyAdminSessionToken(token)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
	}
	return null;
}
