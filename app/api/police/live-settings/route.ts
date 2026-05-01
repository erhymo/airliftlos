import { NextResponse } from "next/server";
import { requireApiAccess } from "../../../../lib/apiAccess";
import { getDb } from "../../../../lib/firebaseAdmin";
import { getPoliceLiveSettings, parseLiveFrom } from "../../../../lib/policeLiveSettings";

export const runtime = "nodejs";

type LiveSettingsPayload = {
	liveFrom?: unknown;
	isLive?: unknown;
};

export async function GET() {
	const accessError = await requireApiAccess();
	if (accessError) return accessError;
	return NextResponse.json({ ok: true, live: await getPoliceLiveSettings() });
}

export async function POST(req: Request) {
	const accessError = await requireApiAccess();
	if (accessError) return accessError;

	let payload: LiveSettingsPayload = {};
	try {
		payload = (await req.json().catch(() => ({}))) as LiveSettingsPayload;
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const liveFrom = payload.liveFrom === undefined ? Date.now() : parseLiveFrom(payload.liveFrom);
	if (!liveFrom) return NextResponse.json({ error: "Ugyldig liveFrom. Bruk ISO-dato eller millisekunder." }, { status: 400 });

	const updatedAt = Date.now();
	await getDb().collection("policeSettings").doc("live").set({
		isLive: payload.isLive === false ? false : true,
		liveFrom,
		liveFromIso: new Date(liveFrom).toISOString(),
		updatedAt,
	}, { merge: true });

	return NextResponse.json({ ok: true, live: await getPoliceLiveSettings() });
}
