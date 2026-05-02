import { NextResponse } from "next/server";
import {
	clearAdminSessionCookie,
	createAdminSessionToken,
	requireAdminAccess,
	setAdminSessionCookie,
	verifyAdminPassword,
} from "../../../../lib/adminAccess";

export const runtime = "nodejs";

export async function GET() {
	const accessError = await requireAdminAccess();
	if (accessError) return accessError;
	return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
	let payload: { password?: unknown };
	try {
		payload = (await req.json()) as { password?: unknown };
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	if (!verifyAdminPassword(payload.password)) {
		return NextResponse.json({ error: "Invalid password" }, { status: 401 });
	}

	const res = NextResponse.json({ ok: true });
	setAdminSessionCookie(res, createAdminSessionToken());
	return res;
}

export async function DELETE() {
	const res = NextResponse.json({ ok: true });
	clearAdminSessionCookie(res);
	return res;
}
