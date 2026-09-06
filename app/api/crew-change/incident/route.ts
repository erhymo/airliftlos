import { NextResponse } from "next/server";
import { requireApiAccess } from "../../../../lib/apiAccess";
import { getDb } from "../../../../lib/firebaseAdmin";
import {
	CREW_CHANGE_EVENTS_COLLECTION,
	fetchCrewChangeWeather,
	isCrewChangeBase,
	isCrewChangeReason,
	type CrewChangeEvent,
	type CrewChangeReason,
} from "../../../../lib/crewChangeEvents";

export const runtime = "nodejs";

type IncidentPayload = {
	base?: string;
	outcome?: string;
	reasons?: unknown;
	comment?: string;
};

export async function POST(req: Request) {
	const accessError = await requireApiAccess();
	if (accessError) return accessError;

	let payload: IncidentPayload;
	try {
		payload = (await req.json()) as IncidentPayload;
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	if (!isCrewChangeBase(payload.base)) {
		return NextResponse.json({ error: "Ugyldig base." }, { status: 400 });
	}
	if (payload.outcome !== "postponed" && payload.outcome !== "cancelled") {
		return NextResponse.json({ error: "Ugyldig type (må være utsatt eller kansellert)." }, { status: 400 });
	}

	const reasons: CrewChangeReason[] = Array.isArray(payload.reasons)
		? payload.reasons.filter(isCrewChangeReason)
		: [];
	if (reasons.length === 0) {
		return NextResponse.json({ error: "Velg minst én årsak." }, { status: 400 });
	}

	const comment = typeof payload.comment === "string" ? payload.comment.trim() : "";

	try {
		const weather = await fetchCrewChangeWeather(payload.base);
		const db = getDb();
		const ref = db.collection(CREW_CHANGE_EVENTS_COLLECTION).doc();
		const event: CrewChangeEvent = {
			id: ref.id,
			createdAt: Date.now(),
			base: payload.base,
			outcome: payload.outcome,
			reasons,
			comment: comment || undefined,
			weather,
		};
		await ref.set(event);
		return NextResponse.json({ ok: true, id: ref.id });
	} catch (error) {
		console.error("Crew change-hendelse: klarte ikke å lagre", error);
		return NextResponse.json({ error: "Klarte ikke å lagre hendelsen. Prøv igjen." }, { status: 500 });
	}
}
