import { NextResponse } from "next/server";
import { requireApiAccess } from "../../../lib/apiAccess";
import {
	DEFAULT_CREW_DIRECTORY,
	isCrewRole,
	normalizeCrewCode,
	sortCrewDirectoryEntries,
	type CrewDirectoryEntry,
} from "../../../lib/crewDirectory";
import { getDb } from "../../../lib/firebaseAdmin";

export const runtime = "nodejs";

const COLLECTION_NAME = "crewDirectory";

type CrewDirectoryPayload = Partial<Pick<CrewDirectoryEntry, "id" | "code" | "fullName" | "role" | "active">>;

function cleanEntry(id: string, data: CrewDirectoryPayload, updatedAt = Date.now()): CrewDirectoryEntry | null {
	const code = typeof data.code === "string" ? normalizeCrewCode(data.code) : "";
	const fullName = typeof data.fullName === "string" ? data.fullName.trim() : "";
	const active = typeof data.active === "boolean" ? data.active : true;
	if (!code || !isCrewRole(data.role)) return null;
	return { id, code, fullName, role: data.role, active, updatedAt };
}

async function getDirectoryEntries() {
	const defaults = new Map(DEFAULT_CREW_DIRECTORY.map((entry) => [entry.id, entry]));
	const snapshot = await getDb().collection(COLLECTION_NAME).get();
	snapshot.forEach((doc) => {
		const data = doc.data() as CrewDirectoryPayload & { updatedAt?: number };
		const entry = cleanEntry(doc.id, data, typeof data.updatedAt === "number" ? data.updatedAt : undefined);
		if (entry) defaults.set(doc.id, entry);
	});
	return sortCrewDirectoryEntries(Array.from(defaults.values()));
}

export async function GET() {
	const accessError = await requireApiAccess();
	if (accessError) return accessError;

	try {
		const entries = await getDirectoryEntries();
		return NextResponse.json({ ok: true, entries });
	} catch (error) {
		console.error("Crew directory: klarte ikke å hente navn", error);
		return NextResponse.json({ ok: true, entries: sortCrewDirectoryEntries(DEFAULT_CREW_DIRECTORY), fallback: true });
	}
}

async function saveEntry(req: Request, createNew: boolean) {
	const accessError = await requireApiAccess();
	if (accessError) return accessError;

	let payload: CrewDirectoryPayload;
	try {
		payload = (await req.json()) as CrewDirectoryPayload;
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const db = getDb();
	const ref = createNew || !payload.id ? db.collection(COLLECTION_NAME).doc() : db.collection(COLLECTION_NAME).doc(String(payload.id));
	const entry = cleanEntry(ref.id, payload);
	if (!entry) return NextResponse.json({ error: "Navn må ha crew-kode og gyldig rolle" }, { status: 400 });

	try {
		await ref.set(entry, { merge: true });
		return NextResponse.json({ ok: true, entry });
	} catch (error) {
		console.error("Crew directory: klarte ikke å lagre navn", error);
		return NextResponse.json({ error: "Klarte ikke å lagre navn" }, { status: 500 });
	}
}

export async function POST(req: Request) {
	return saveEntry(req, true);
}

export async function PATCH(req: Request) {
	return saveEntry(req, false);
}