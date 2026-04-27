import { NextResponse } from "next/server";
import { requireApiAccess } from "../../../../lib/apiAccess";
import { getDb } from "../../../../lib/firebaseAdmin";
import { deliverPoliceSubmission } from "../../../../lib/policeDelivery";

export const runtime = "nodejs";

type CrewPayload = {
	base?: string;
	periodFromDate?: string;
	periodFromTime?: string;
	periodToDate?: string;
	periodToTime?: string;
	watchPhone?: string;
	captain?: string;
	firstOfficer?: string;
	technician?: string;
	helicopter?: string;
};

function line(label: string, value: unknown) {
	return `${label}: ${String(value ?? "")}`;
}

export async function POST(req: Request) {
	const accessError = await requireApiAccess();
	if (accessError) return accessError;

	let payload: CrewPayload;
	try {
		payload = (await req.json()) as CrewPayload;
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const createdAt = Date.now();
	const db = getDb();
	const ref = db.collection("policeCrewForms").doc();
	const fileName = `Politiet_Crew_${payload.periodFromDate ?? new Date().toISOString().slice(0, 10)}_${ref.id}.pdf`;
	const title = `Politiet crew-skjema Tromsø ${payload.periodFromDate ?? ""}`.trim();
	const body = [
		"Airlift Politiberedskap - Crew-skjema",
		line("Base", payload.base ?? "Tromsø"),
		line("Fra", `${payload.periodFromDate ?? ""} ${payload.periodFromTime ?? ""}`.trim()),
		line("Til", `${payload.periodToDate ?? ""} ${payload.periodToTime ?? ""}`.trim()),
		line("Vakttelefon", payload.watchPhone),
		line("Fartøysjef", payload.captain),
		line("Co-pilot", payload.firstOfficer),
		line("Tekniker", payload.technician),
		line("Helikopter", payload.helicopter),
	].join("\n");

	await ref.set({ ...payload, base: "Tromsø", id: ref.id, fileName, createdAt, sentAt: createdAt });
	const year = Number((payload.periodFromDate ?? "").slice(0, 4)) || new Date().getFullYear();
	const delivery = await deliverPoliceSubmission("crew", title, body, fileName, year);
	await ref.set({ delivery }, { merge: true });

	return NextResponse.json({ ok: true, id: ref.id, delivery: { database: { ok: true }, ...delivery } });
}