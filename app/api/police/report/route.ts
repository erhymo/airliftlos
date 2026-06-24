import { NextResponse } from "next/server";
import { requireApiAccess } from "../../../../lib/apiAccess";
import { getDb } from "../../../../lib/firebaseAdmin";
import { appendPoliceMissionLogToExcel, type PoliceMissionExcelLog, type PoliceMissionExcelStatus } from "../../../../lib/policeMissionExcel";
import { buildPoliceReportPdfFileName, deliverPoliceReportSubmission, type DeliveryStatus } from "../../../../lib/policeDelivery";

export const runtime = "nodejs";

type PinType = "trainingArea" | "landingPoint" | "other";
type Pin = { lat: number; lng: number; type: PinType; label?: string };
type MissionLogPayload = Partial<Omit<PoliceMissionExcelLog, "date" | "crew" | "cancelled">> & { cancelled?: boolean };
type ReportPayload = {
	clientSubmissionId?: string;
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
	missionLog?: MissionLogPayload;
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

function asBoolean(value: unknown) {
	return value === true;
}

function cleanClientSubmissionId(value: unknown) {
	const text = asString(value);
	return /^[A-Za-z0-9_-]{8,80}$/.test(text) ? text : "";
}

function extractCrewCode(value: string) {
	const match = value.match(/\(([^)]+)\)\s*$/);
	const code = (match?.[1] ?? "").trim().toLocaleUpperCase("nb-NO");
	if (code) return code;
	const trimmed = value.trim().toLocaleUpperCase("nb-NO");
	return /^[A-ZÆØÅ]{2,4}$/.test(trimmed) ? trimmed : "";
}

function displayCrewName(value: string) {
	return value.replace(/\s*\([^)]+\)\s*$/, "").trim();
}

function line(label: string, value: unknown) {
	const text = Array.isArray(value) ? value.join(", ") : String(value ?? "").trim();
	return `${label}: ${text || "-"}`;
}

function validDate(value: string) {
	return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value);
}

function buildMissionExcelLog(payload: ReportPayload, date: string, crew: string[]): PoliceMissionExcelLog {
	const missionLog = payload.missionLog ?? {};
	const reporter = asString(payload.reporter);
	return {
		sign: asString(missionLog.sign) || extractCrewCode(reporter),
		date,
		alertTime: asString(missionLog.alertTime),
		readyTime: asString(missionLog.readyTime),
		readinessDeviation: asString(missionLog.readinessDeviation),
		ref: asString(missionLog.ref),
		poId: asString(missionLog.poId),
		bid: asString(missionLog.bid),
		cancelled: asBoolean(missionLog.cancelled),
		techlogNumber: asString(missionLog.techlogNumber),
		crew,
		blockOff1: asString(missionLog.blockOff1),
		blockOn1: asString(missionLog.blockOn1),
		blockTime1: asString(missionLog.blockTime1),
		waitTime: asString(missionLog.waitTime),
		blockOff2: asString(missionLog.blockOff2),
		blockOn2: asString(missionLog.blockOn2),
		blockTime2: asString(missionLog.blockTime2),
		totalBlock: asString(missionLog.totalBlock),
		flightRoute: asString(missionLog.flightRoute),
		pax: asString(missionLog.pax),
		description: asString(missionLog.description) || asString(payload.description),
		readinessDeviationReason: asString(missionLog.readinessDeviationReason),
	};
}

function fallbackReportFileName(reportType: "training" | "mission", date: string) {
	const match = date.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
	const formattedDate = match ? `${match[3]}.${match[2]}.${match[1]}` : date;
	return `${reportType === "mission" ? "Mission Report" : "Training Report"} ${formattedDate}.pdf`;
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
	if (reportType === "mission" && !reporter) return NextResponse.json({ error: "Rapportskriver må velges for Mission Report" }, { status: 400 });
	const crew = asStringArray(payload.crew);
	const missionExcelLog = reportType === "mission" ? buildMissionExcelLog(payload, date, crew) : null;
	const missionNumber = reportType === "mission" ? asString(payload.missionNumber) || missionExcelLog?.bid || "" : asString(payload.missionNumber);
	if (reportType === "mission" && !missionExcelLog?.sign) return NextResponse.json({ error: "Rapportskriver mangler crew-kode for Excel-sign" }, { status: 400 });
	const reporterDisplayName = displayCrewName(reporter) || reporter;

	const createdAt = Date.now();
	const db = getDb();
	const clientSubmissionId = cleanClientSubmissionId(payload.clientSubmissionId);
	const ref = clientSubmissionId ? db.collection("policeReports").doc(clientSubmissionId) : db.collection("policeReports").doc();
	if (clientSubmissionId) {
		const claim = await db.runTransaction(async (transaction) => {
			const snapshot = await transaction.get(ref);
			if (snapshot.exists) return { exists: true, data: snapshot.data() as { delivery?: unknown } | undefined };
			transaction.set(ref, { id: ref.id, reportType, date, createdAt, processingStartedAt: createdAt });
			return { exists: false, data: null };
		});
		if (claim.exists) {
			const delivery = claim.data?.delivery && typeof claim.data.delivery === "object" ? claim.data.delivery : {};
			return NextResponse.json({ ok: true, id: ref.id, duplicate: true, delivery: { database: { ok: true }, ...delivery } });
		}
	}
	const typeLabel = reportType === "mission" ? "Mission" : "Training";
	const pins = normalizePins(payload.pins);
	const year = Number(date.slice(0, 4)) || new Date().getFullYear();
	const helicopter = asString(payload.helicopter);
	const trainingTypes = asStringArray(payload.trainingTypes);
	const reportDurationText = reportType === "mission" ? missionExcelLog?.totalBlock ?? "" : asString(payload.durationText);
	let fileName = fallbackReportFileName(reportType, date);
	const title = `Airlift Politiberedskap - ${typeLabel} Report ${base} ${date}`.trim();
	const staticMap = await fetchStaticMap(pins);
	const body = [
		"GENERELT",
		line("Rapporttype", `${typeLabel} Report`),
		line("Base", base),
		line("Dato", date),
		line("Rapportskriver", reporterDisplayName),
		line("Varighet", reportDurationText),
		line("Vær/forhold", asString(payload.conditions)),
		...(reportType === "mission" ? [line("BID", missionExcelLog?.bid ?? missionNumber)] : []),
		line("Helikopter", helicopter),
		line("Crew", crew),
		...(reportType === "training" ? [line("Treningstyper", trainingTypes)] : []),
		...(reportType === "mission" ? [line("Involverte etater", asString(payload.involvedAgencies)), line("Resultat/utfall", asString(payload.result)), line("Sikkerhetsmomenter", asString(payload.safetyNotes))] : []),
		"",
		"KARTMARKERINGER",
		...formatPins(pins),
		"",
		"BESKRIVELSE",
		line(reportType === "mission" ? "Beskrivelse av oppdrag" : "Beskrivelse", payload.description),
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
		reporter: reporterDisplayName,
		durationText: reportDurationText,
		conditions: asString(payload.conditions),
		crew,
		helicopter,
		pins,
		trainingTypes,
		involvedAgencies: asString(payload.involvedAgencies),
		result: asString(payload.result),
		description: asString(payload.description),
		lessonsLearned: asString(payload.lessonsLearned),
		followUp: asString(payload.followUp),
		safetyNotes: asString(payload.safetyNotes),
		missionLog: missionExcelLog,
		id: ref.id,
		fileName,
		createdAt,
		savedAt: createdAt,
	};
	await ref.set(reportDoc, { merge: true });
	const batch = db.batch();
	pins.forEach((pin, index) => {
		const pinRef = db.collection("policePins").doc();
		batch.set(pinRef, { ...pin, id: pinRef.id, reportId: ref.id, reportType, base, date, helicopter, order: index, createdAt });
	});
	await batch.commit();
	let delivery: Awaited<ReturnType<typeof deliverPoliceReportSubmission>>;
	try {
		fileName = await buildPoliceReportPdfFileName(reportType, date, year);
		delivery = await deliverPoliceReportSubmission(reportType, title, body, fileName, year, { map: staticMap.status, mapImageBytes: staticMap.bytes, mapImageContentType: staticMap.contentType, mapTitle: "Kartmarkeringer" });
	} catch (error) {
		delivery = {
			email: { ok: true, skipped: true, error: "E-post er deaktivert for rapport" },
			sharepoint: { ok: false, error: (error as Error).message || "SharePoint-opplasting feilet" },
			map: staticMap.status,
		};
	}
	let excel: PoliceMissionExcelStatus = { ok: true, skipped: true, error: "Excel-logg gjelder kun Mission Report" };
	if (reportType === "mission" && missionExcelLog) {
		try {
			excel = await appendPoliceMissionLogToExcel(missionExcelLog);
		} catch (error) {
			excel = { ok: false, error: (error as Error).message || "Excel-skriving feilet" };
		}
	}
	await ref.set({ delivery: { ...delivery, excel }, ...(excel.ok && !excel.skipped ? { missionExcelLoggedAt: Date.now(), missionExcelRow: excel.row ?? null } : {}) }, { merge: true });
	if (delivery.sharepoint.ok) await ref.set({ fileName }, { merge: true });

	return NextResponse.json({ ok: true, id: ref.id, delivery: { database: { ok: true }, ...delivery, excel } });
}