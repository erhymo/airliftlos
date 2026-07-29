import { NextResponse } from "next/server";
import { requireApiAccess } from "../../../../lib/apiAccess";
import { getDb } from "../../../../lib/firebaseAdmin";
import { deliverPoliceSubmission } from "../../../../lib/policeDelivery";

export const runtime = "nodejs";

type UtmeldingPayload = Record<string, unknown> & {
	clientSubmissionId?: string;
	base?: string;
	date?: string;
	time?: string;
	reason?: string;
	reasonDetails?: string;
	durationHours?: number;
	durationText?: string;
	mitigatingAction?: string;
	mitigatingActionDetails?: string;
	sender?: string;
	watchPhone?: string;
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

function stripCrewCode(value: string | undefined) {
	return (value ?? "").replace(/\s*\([^()]+\)\s*$/, "").trim();
}

function valueOrDash(value: string | number | undefined) {
	return String(value ?? "").trim() || "-";
}

function cleanClientSubmissionId(value: unknown) {
	const text = typeof value === "string" ? value : "";
	return /^[A-Za-z0-9_-]{8,80}$/.test(text) ? text : "";
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
	const clientSubmissionId = cleanClientSubmissionId(payload.clientSubmissionId);
	const ref = clientSubmissionId
		? db.collection("policeUtmeldinger").doc(clientSubmissionId)
		: db.collection("policeUtmeldinger").doc();

	if (clientSubmissionId) {
		const claim = await db.runTransaction(async (transaction) => {
			const snapshot = await transaction.get(ref);
			if (snapshot.exists) return { exists: true, data: snapshot.data() as { delivery?: unknown } | undefined };
			transaction.set(ref, { id: ref.id, createdAt, processingStartedAt: createdAt });
			return { exists: false, data: null };
		});
		if (claim.exists) {
			const delivery = claim.data?.delivery && typeof claim.data.delivery === "object" ? claim.data.delivery : {};
			return NextResponse.json({ ok: true, id: ref.id, duplicate: true, delivery: { database: { ok: true }, ...delivery } });
		}
	}

	const fileName = `Politiet_Utmelding_${payload.date ?? new Date().toISOString().slice(0, 10)}_${ref.id}.pdf`;
	const base = payload.base === "Hammerfest" ? "Hammerfest" : "Tromsø";
	const title = `Utmelding Airlift Politiberedskap – ${base} – ${formatDate(payload.date)}`.trim();
	const expectedDuration = payload.durationText?.trim() || (payload.durationHours ? `${payload.durationHours} timer` : "-");
	const mitigatingText = [payload.mitigatingAction, payload.mitigatingActionDetails].map((value) => value?.trim()).filter(Boolean).join(". ") || "-";
	const body = [
		"Airlift Politiberedskap – Utmelding",
		"",
		line("Base", base),
		"",
		"Tidspunkt for utmelding:",
		valueOrDash(formatDateTime(payload.date, payload.time)),
		"",
		"Årsak:",
		valueOrDash(payload.reason),
		"",
		"Beskrivelse:",
		valueOrDash(payload.reasonDetails),
		"",
		"Forventet varighet:",
		expectedDuration,
		"",
		"Mitigerende tiltak:",
		mitigatingText,
		"",
		"Status:",
		"Politiberedskapen er midlertidig redusert inntil maskinen er tilgjengelig igjen eller alternativ løsning er etablert.",
		"",
		"Avsender:",
		valueOrDash(stripCrewCode(payload.sender)),
		"",
		line("Vakttelefon", valueOrDash(payload.watchPhone)),
	].join("\n");

	await ref.set({ ...payload, base, id: ref.id, fileName, createdAt, sentAt: createdAt }, { merge: true });
	const year = Number((payload.date ?? "").slice(0, 4)) || new Date().getFullYear();
	const delivery = await deliverPoliceSubmission("utmelding", title, body, fileName, year);
	await ref.set({ delivery }, { merge: true });

	return NextResponse.json({ ok: true, id: ref.id, delivery: { database: { ok: true }, ...delivery } });
}