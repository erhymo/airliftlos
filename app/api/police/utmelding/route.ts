import { NextResponse } from "next/server";
import { requireApiAccess } from "../../../../lib/apiAccess";
import { getDb } from "../../../../lib/firebaseAdmin";
import { deliverPoliceSubmission } from "../../../../lib/policeDelivery";

export const runtime = "nodejs";

type UtmeldingPayload = Record<string, unknown> & {
	date?: string;
	time?: string;
	reason?: string;
};

function line(label: string, value: unknown) {
	return `${label}: ${String(value ?? "")}`;
}

export async function POST(req: Request) {
	const accessError = await requireApiAccess();
	if (accessError) return accessError;

	let payload: UtmeldingPayload;
	try {
		payload = (await req.json()) as UtmeldingPayload;
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const createdAt = Date.now();
	const db = getDb();
	const ref = db.collection("policeUtmeldinger").doc();
	const fileName = `Politiet_Utmelding_${payload.date ?? new Date().toISOString().slice(0, 10)}_${ref.id}.pdf`;
	const title = `Politiet utmelding Tromsø ${payload.date ?? ""}`.trim();
	const body = [
		"Airlift Politiberedskap - Utmelding",
		line("Base", "Tromsø"),
		line("Dato/tid", `${payload.date ?? ""} ${payload.time ?? ""}`.trim()),
		line("Årsak", payload.reason),
		line("Utdyping", payload.reasonDetails),
		line("Varighet timer", payload.durationHours),
		line("Forventet varighet", payload.durationText),
		line("Mitigerende tiltak", payload.mitigatingAction),
		line("Tilleggsinfo tiltak", payload.mitigatingActionDetails),
		line("Avsender", payload.sender),
		line("Vakttelefon", payload.watchPhone),
	].join("\n");

	await ref.set({ ...payload, base: "Tromsø", id: ref.id, fileName, createdAt, sentAt: createdAt });
	const year = Number((payload.date ?? "").slice(0, 4)) || new Date().getFullYear();
	const delivery = await deliverPoliceSubmission("utmelding", title, body, fileName, year);
	await ref.set({ delivery }, { merge: true });

	return NextResponse.json({ ok: true, id: ref.id, delivery: { database: { ok: true }, ...delivery } });
}