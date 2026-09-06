import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/firebaseAdmin";
import { CREW_CHANGE_EVENTS_COLLECTION, DISPENSATION_START_MS, type CrewChangeEvent } from "../../../../lib/crewChangeEvents";

export const runtime = "nodejs";

const DEFAULT_PASSWORD = "Crewchange";

export async function POST(req: Request) {
	let payload: { password?: string };
	try {
		payload = (await req.json()) as { password?: string };
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const expected = process.env.CREW_CHANGE_STATS_PASSWORD || DEFAULT_PASSWORD;
	if (typeof payload.password !== "string" || payload.password !== expected) {
		return NextResponse.json({ error: "Feil passord." }, { status: 401 });
	}

	try {
		const db = getDb();
		const snapshot = await db
			.collection(CREW_CHANGE_EVENTS_COLLECTION)
			.where("createdAt", ">=", DISPENSATION_START_MS)
			.orderBy("createdAt", "desc")
			.get();

		const events = snapshot.docs.map((doc) => doc.data() as CrewChangeEvent);
		return NextResponse.json({ ok: true, events });
	} catch (error) {
		console.error("Crew change-statistikk: klarte ikke å hente hendelser", error);
		return NextResponse.json({ error: "Klarte ikke å hente statistikk." }, { status: 500 });
	}
}
