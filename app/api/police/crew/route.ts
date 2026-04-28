import { NextResponse } from "next/server";
import { requireApiAccess } from "../../../../lib/apiAccess";
import {
	DEFAULT_CREW_DIRECTORY,
	formatCrewDirectoryEntry,
	formatCrewDisplayNameForRole,
	isCrewRole,
	normalizeCrewCode,
	type CrewDirectoryEntry,
	type CrewRole,
} from "../../../../lib/crewDirectory";
import { getDb } from "../../../../lib/firebaseAdmin";
import { deliverPoliceSubmission } from "../../../../lib/policeDelivery";

export const runtime = "nodejs";
const CREW_SUBMISSION_ENABLED = process.env.POLICE_CREW_SUBMISSION_ENABLED === "true";

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

function extractCrewCode(value: string | undefined) {
	const clean = value?.trim();
	if (!clean) return "";
	const codeMatch = clean.match(/\(([^()]+)\)\s*$/);
	return normalizeCrewCode(codeMatch?.[1] ?? clean);
}

function cleanCrewEntry(id: string, data: Partial<CrewDirectoryEntry>): CrewDirectoryEntry | null {
	const code = typeof data.code === "string" ? normalizeCrewCode(data.code) : "";
	const fullName = typeof data.fullName === "string" ? data.fullName.trim() : "";
	const phone = typeof data.phone === "string" ? data.phone.trim() : "";
	const active = typeof data.active === "boolean" ? data.active : true;
	if (!code || !isCrewRole(data.role)) return null;
	return { id, code, fullName, phone, role: data.role, active };
}

async function getCrewDirectoryEntries() {
	const entries = new Map(DEFAULT_CREW_DIRECTORY.map((entry) => [entry.id, entry]));
	try {
		const snapshot = await getDb().collection("crewDirectory").get();
		snapshot.forEach((doc) => {
			const entry = cleanCrewEntry(doc.id, doc.data() as Partial<CrewDirectoryEntry>);
			if (entry) entries.set(doc.id, entry);
		});
	} catch (error) {
		console.error("Politiet crew: bruker fallback for crew-directory", error);
	}
	return Array.from(entries.values());
}

function findCrewEntry(value: string | undefined, role: CrewRole, entries: CrewDirectoryEntry[]) {
	const code = extractCrewCode(value);
	return entries.find((entry) => entry.active && entry.role === role && normalizeCrewCode(entry.code) === code);
}

function crewOrDash(value: string | undefined, role: CrewRole, entries: CrewDirectoryEntry[]) {
	const entry = findCrewEntry(value, role, entries);
	const displayName = entry ? formatCrewDirectoryEntry(entry) : formatCrewDisplayNameForRole(value, role);
	if (!displayName) return "-";
	return `${displayName} - ${entry?.phone?.trim() || "Telefonnummer"}`;
}

export async function POST(req: Request) {
	const accessError = await requireApiAccess();
	if (accessError) return accessError;
	if (!CREW_SUBMISSION_ENABLED) return NextResponse.json({ error: "Crew-skjema er midlertidig deaktivert" }, { status: 403 });

	let payload: CrewPayload;
	try {
		payload = (await req.json()) as CrewPayload;
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const createdAt = Date.now();
	const db = getDb();
	const ref = db.collection("policeCrewForms").doc();
	const crewEntries = await getCrewDirectoryEntries();
	const fileName = `Vaktbytte_Airlift_Politiberedskap_${payload.periodFromDate ?? new Date().toISOString().slice(0, 10)}_${ref.id}.pdf`;
	const title = "Vaktbytte Airlift Politiberedskap";
	const body = [
		"Periode:",
		line("Fra", formatDateTime(payload.periodFromDate, payload.periodFromTime)),
		line("Til", formatDateTime(payload.periodToDate, payload.periodToTime)),
		"",
		line("Base", "Tromsø/Hammerfest"),
		"",
		line("Vakttelefon", valueOrDash(payload.watchPhone)),
		"",
		"Crew:",
		line("Fartøysjef", crewOrDash(payload.captain, "captain", crewEntries)),
		line("Co-pilot", crewOrDash(payload.firstOfficer, "firstOfficer", crewEntries)),
		line("Tekniker / Task Specialist", crewOrDash(payload.technician, "technician", crewEntries)),
		"",
		"Helikopter:",
		`AW169 ${valueOrDash(payload.helicopter)}: telefonnummer: xxxxxxxxx - Iridium: xxxxxxxxxxx`,
		"",
		"Andre relevante nummer:",
		"Driftssjef Airlift: Erlend Haugsbø - 90129863",
		"Sjefsflyger AW169: Tom A. Østrem - 98623414",
	].join("\n");

	await ref.set({ ...payload, base: "Tromsø", id: ref.id, fileName, createdAt, sentAt: createdAt });
	const year = Number((payload.periodFromDate ?? "").slice(0, 4)) || new Date().getFullYear();
	const delivery = await deliverPoliceSubmission("crew", title, body, fileName, year);
	await ref.set({ delivery }, { merge: true });

	return NextResponse.json({ ok: true, id: ref.id, delivery: { database: { ok: true }, ...delivery } });
}