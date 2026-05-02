import { NextResponse } from "next/server";
import { requireApiAccess } from "../../../../lib/apiAccess";
import { getDb } from "../../../../lib/firebaseAdmin";
import { buildPoliceReportPdfFileName, deliverPoliceReportSubmission, type DeliveryStatus } from "../../../../lib/policeDelivery";

export const runtime = "nodejs";

type PinType = "trainingArea" | "landingPoint" | "other";
type Pin = { lat: number; lng: number; type: PinType; label?: string };
type ReportPayload = {
	base?: string;
	reportType?: "training" | "mission";
	missionNumber?: string;
	date?: string;
	reporter?: string;
	durationText?: string;
	conditions?: string;
	crew?: string[];
	helicopter?: string;
	pins?: Array<Partial<Pin>>;
	trainingTypes?: string[];
	involvedAgencies?: string;
	result?: string;
	description?: string;
	lessonsLearned?: string;
	followUp?: string;
	safetyNotes?: string;
};

const PIN_TYPE_LABELS: Record<PinType, string> = {
	trainingArea: "Treningsområde",
	landingPoint: "Landingspunkt",
	other: "Annet",
};
const PIN_STATIC_MAP: Record<PinType, { color: string; label: string }> = {
	trainingArea: { color: "blue", label: "T" },
	landingPoint: { color: "green", label: "L" },
	other: { color: "gray", label: "A" },
};

function asString(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown) {
	return Array.isArray(value) ? value.map(asString).filter(Boolean) : [];
}

function line(label: string, value: unknown) {
	const text = Array.isArray(value) ? value.join(", ") : String(value ?? "").trim();
	return `${label}: ${text || "-"}`;
}

function validDate(value: string) {
	return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value);
}

function normalizePins(value: ReportPayload["pins"]): Pin[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((pin) => {
		const lat = typeof pin.lat === "number" && Number.isFinite(pin.lat) ? pin.lat : null;
		const lng = typeof pin.lng === "number" && Number.isFinite(pin.lng) ? pin.lng : null;
		if (lat === null || lng === null) return [];
		const type = pin.type === "landingPoint" || pin.type === "other" || pin.type === "trainingArea" ? pin.type : "trainingArea";
		const label = asString(pin.label);
		return [{ lat, lng, type, ...(label ? { label } : {}) }];
	});
}

function formatPins(pins: Pin[]) {
	if (pins.length === 0) return ["Ingen kartmarkeringer registrert."];
	return pins.map((pin, index) => `${index + 1}. ${PIN_TYPE_LABELS[pin.type]}${pin.label ? ` - ${pin.label}` : ""}: ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`);
}

async function fetchStaticMap(pins: Pin[]): Promise<{ status: DeliveryStatus; bytes?: Uint8Array; contentType?: string }> {
	if (pins.length === 0) return { status: { ok: true, skipped: true, error: "Ingen kartmarkeringer" } };
	const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
	if (!apiKey) return { status: { ok: true, skipped: true, error: "Google Static Maps er ikke konfigurert" } };

	const params = new URLSearchParams({ size: "640x360", scale: "2", maptype: "terrain", key: apiKey });
	for (const pin of pins.slice(0, 20)) {
		const style = PIN_STATIC_MAP[pin.type];
		params.append("markers", `color:${style.color}|label:${style.label}|${pin.lat.toFixed(5)},${pin.lng.toFixed(5)}`);
	}

	try {
		const res = await fetch(`https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`);
		if (!res.ok) return { status: { ok: false, error: `Google Static Maps svarte HTTP ${res.status}` } };
		const contentType = res.headers.get("content-type") || "image/png";
		return { status: { ok: true }, bytes: new Uint8Array(await res.arrayBuffer()), contentType };
	} catch (error) {
		return { status: { ok: false, error: (error as Error).message } };
	}
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
	const base = asString(payload.base) || "Tromsø";
	const date = validDate(asString(payload.date)) ? asString(payload.date) : new Date().toISOString().slice(0, 10);
	const reporter = asString(payload.reporter);
	const missionNumber = asString(payload.missionNumber);
	if (reportType === "mission" && !missionNumber) return NextResponse.json({ error: "Oppdragsnummer må fylles ut for Mission Report" }, { status: 400 });

	const createdAt = Date.now();
	const db = getDb();
	const ref = db.collection("policeReports").doc();
	const typeLabel = reportType === "mission" ? "Mission" : "Training";
	const pins = normalizePins(payload.pins);
	const year = Number(date.slice(0, 4)) || new Date().getFullYear();
	const helicopter = asString(payload.helicopter);
	const trainingTypes = asStringArray(payload.trainingTypes);
	const fileName = await buildPoliceReportPdfFileName(reportType, date, year);
	const title = `Airlift Politiberedskap - ${typeLabel} Report ${base} ${date}`.trim();
	const staticMap = await fetchStaticMap(pins);
	const body = [
		"GENERELT",
		line("Rapporttype", `${typeLabel} Report`),
		line("Base", base),
		line("Dato", date),
		line("Rapportskriver", reporter),
		line("Varighet", asString(payload.durationText)),
		line("Vær/forhold", asString(payload.conditions)),
		...(reportType === "mission" ? [line("Oppdragsnummer", payload.missionNumber)] : []),
		line("Helikopter", helicopter),
		line("Crew", asStringArray(payload.crew)),
		...(reportType === "training" ? [line("Treningstyper", trainingTypes)] : []),
		...(reportType === "mission" ? [line("Involverte etater", asString(payload.involvedAgencies)), line("Resultat/utfall", asString(payload.result)), line("Sikkerhetsmomenter", asString(payload.safetyNotes))] : []),
		"",
		"KARTMARKERINGER",
		...formatPins(pins),
		"",
		"BESKRIVELSE",
		line("Beskrivelse", payload.description),
		"",
		"LESSONS LEARNED / OPPFØLGING",
		line("Lessons learned", payload.lessonsLearned),
		line("Tiltak/oppfølging", payload.followUp),
	].join("\n");

	const reportDoc = {
		...payload,
		base,
		reportType,
		missionNumber,
		date,
		reporter,
		durationText: asString(payload.durationText),
		conditions: asString(payload.conditions),
		crew: asStringArray(payload.crew),
		helicopter,
		pins,
		trainingTypes,
		involvedAgencies: asString(payload.involvedAgencies),
		result: asString(payload.result),
		description: asString(payload.description),
		lessonsLearned: asString(payload.lessonsLearned),
		followUp: asString(payload.followUp),
		safetyNotes: asString(payload.safetyNotes),
		id: ref.id,
		fileName,
		createdAt,
		savedAt: createdAt,
	};
	await ref.set(reportDoc);
	const batch = db.batch();
	pins.forEach((pin, index) => {
		const pinRef = db.collection("policePins").doc();
		batch.set(pinRef, { ...pin, id: pinRef.id, reportId: ref.id, reportType, base, date, helicopter, order: index, createdAt });
	});
	await batch.commit();
	const delivery = await deliverPoliceReportSubmission(reportType, title, body, fileName, year, { map: staticMap.status, mapImageBytes: staticMap.bytes, mapImageContentType: staticMap.contentType, mapTitle: "Kartmarkeringer" });
	await ref.set({ delivery }, { merge: true });

	return NextResponse.json({ ok: true, id: ref.id, delivery: { database: { ok: true }, ...delivery } });
}