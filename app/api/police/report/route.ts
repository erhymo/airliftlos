import { NextResponse } from "next/server";
import { requireApiAccess } from "../../../../lib/apiAccess";
import { getDb } from "../../../../lib/firebaseAdmin";
import { deliverPoliceSubmission } from "../../../../lib/policeDelivery";

export const runtime = "nodejs";

type Pin = { lat: number; lng: number };
type ReportPayload = {
	reportType?: "training" | "mission";
	missionNumber?: string;
	date?: string;
	crew?: string[];
	helicopter?: string;
	pins?: Pin[];
	trainingTypes?: string[];
	description?: string;
	lessonsLearned?: string;
};

function line(label: string, value: unknown) {
	return `${label}: ${Array.isArray(value) ? value.join(", ") : String(value ?? "")}`;
}

export async function POST(req: Request) {
	const accessError = await requireApiAccess();
	if (accessError) return accessError;

	let payload: ReportPayload;
	try {
		payload = (await req.json()) as ReportPayload;
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const reportType = payload.reportType === "mission" ? "mission" : "training";
	const createdAt = Date.now();
	const db = getDb();
	const ref = db.collection("policeReports").doc();
	const typeLabel = reportType === "mission" ? "Mission" : "Training";
	const fileName = `Politiet_${typeLabel}_${payload.date ?? new Date().toISOString().slice(0, 10)}_${ref.id}.pdf`;
	const title = `Politiet ${typeLabel} Report Tromsø ${payload.date ?? ""}`.trim();
	const pins = Array.isArray(payload.pins) ? payload.pins : [];
	const body = [
		`Airlift Politiberedskap - ${typeLabel} Report`,
		line("Base", "Tromsø"),
		line("Dato", payload.date),
		...(reportType === "mission" ? [line("Oppdragsnummer", payload.missionNumber)] : []),
		line("Crew", payload.crew),
		line("Helikopter", payload.helicopter),
		line("Typer", payload.trainingTypes),
		line("Pins", pins.map((pin) => `${pin.lat.toFixed(5)},${pin.lng.toFixed(5)}`).join(" | ")),
		line("Beskrivelse", payload.description),
		line("Lessons learned", payload.lessonsLearned),
	].join("\n");

	await ref.set({ ...payload, base: "Tromsø", reportType, pins, id: ref.id, fileName, createdAt, sentAt: createdAt });
	const batch = db.batch();
	pins.forEach((pin, index) => {
		const pinRef = db.collection("policePins").doc();
		batch.set(pinRef, { ...pin, id: pinRef.id, reportId: ref.id, reportType, base: "Tromsø", order: index, createdAt });
	});
	await batch.commit();
	const year = Number((payload.date ?? "").slice(0, 4)) || new Date().getFullYear();
	const delivery = await deliverPoliceSubmission("report", title, body, fileName, year);
	await ref.set({ delivery }, { merge: true });

	return NextResponse.json({ ok: true, id: ref.id, delivery: { database: { ok: true }, ...delivery } });
}