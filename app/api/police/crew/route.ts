import { NextResponse } from "next/server";
import { requireApiAccess } from "../../../../lib/apiAccess";
import { formatCrewDisplayNameForRole, type CrewRole } from "../../../../lib/crewDirectory";
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

function formatDate(date: string | undefined) {
	if (!date) return "";
	const match = date.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
	if (!match) return date;
	return `${match[3]}.${match[2]}.${match[1]}`;
}

function formatDateTime(date: string | undefined, time: string | undefined) {
	return [formatDate(date), time ? `kl. ${time}` : ""].filter(Boolean).join(" ");
}

function valueOrDash(value: string | undefined) {
	return value?.trim() || "-";
}

function crewOrDash(value: string | undefined, role: CrewRole) {
	return formatCrewDisplayNameForRole(value, role) || "-";
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
		"Hei,",
		"",
		"Airlift melder følgende crew for politiberedskap Tromsø:",
		"",
		"Periode:",
		line("Fra", formatDateTime(payload.periodFromDate, payload.periodFromTime)),
		line("Til", formatDateTime(payload.periodToDate, payload.periodToTime)),
		"",
		"Crew:",
		line("Fartøysjef", crewOrDash(payload.captain, "captain")),
		line("Co-pilot", crewOrDash(payload.firstOfficer, "firstOfficer")),
		line("Tekniker / Task Specialist", crewOrDash(payload.technician, "technician")),
		line("Helikopter", valueOrDash(payload.helicopter)),
		"",
		"Vakttelefon:",
		valueOrDash(payload.watchPhone),
		"",
		"Mvh",
		"Airlift Politiberedskap",
	].join("\n");

	await ref.set({ ...payload, base: "Tromsø", id: ref.id, fileName, createdAt, sentAt: createdAt });
	const year = Number((payload.periodFromDate ?? "").slice(0, 4)) || new Date().getFullYear();
	const delivery = await deliverPoliceSubmission("crew", title, body, fileName, year);
	await ref.set({ delivery }, { merge: true });

	return NextResponse.json({ ok: true, id: ref.id, delivery: { database: { ok: true }, ...delivery } });
}