import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { requireApiAccess } from "../../../../lib/apiAccess";
import { getDb } from "../../../../lib/firebaseAdmin";

export const runtime = "nodejs";

const COLLECTION_NAME = "policeCrewOptions";
const ROLES = ["captains", "firstOfficers", "technicians"] as const;
type CrewRole = (typeof ROLES)[number];

function isCrewRole(value: unknown): value is CrewRole {
	return typeof value === "string" && ROLES.includes(value as CrewRole);
}

async function getNames(role: CrewRole): Promise<string[]> {
	const doc = await getDb().collection(COLLECTION_NAME).doc(role).get();
	const data = doc.data() as { names?: unknown } | undefined;
	const names = Array.isArray(data?.names) ? data.names : [];
	return Array.from(new Set(names.filter((name): name is string => typeof name === "string").map((name) => name.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "nb-NO"));
}

export async function GET() {
	const accessError = await requireApiAccess();
	if (accessError) return accessError;

	try {
		const [captains, firstOfficers, technicians] = await Promise.all([
			getNames("captains"),
			getNames("firstOfficers"),
			getNames("technicians"),
		]);
		return NextResponse.json({ ok: true, captains, firstOfficers, technicians });
	} catch (error) {
		console.error("Police crew options: klarte ikke å hente crew-valg", error);
		return NextResponse.json({ error: "Klarte ikke å hente crew-valg" }, { status: 500 });
	}
}

export async function POST(req: Request) {
	const accessError = await requireApiAccess();
	if (accessError) return accessError;

	let body: { role?: unknown; name?: unknown };
	try {
		body = (await req.json()) as { role?: unknown; name?: unknown };
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	if (!isCrewRole(body.role)) {
		return NextResponse.json({ error: "Ugyldig stilling" }, { status: 400 });
	}

	const name = typeof body.name === "string" ? body.name.trim() : "";
	if (!name) {
		return NextResponse.json({ error: "Navn mangler" }, { status: 400 });
	}

	try {
		await getDb().collection(COLLECTION_NAME).doc(body.role).set(
			{
				names: FieldValue.arrayUnion(name),
				updatedAt: Date.now(),
			},
			{ merge: true },
		);

		return NextResponse.json({ ok: true, role: body.role, name });
	} catch (error) {
		console.error("Police crew options: klarte ikke å lagre crew-valg", error);
		return NextResponse.json({ error: "Klarte ikke å lagre person" }, { status: 500 });
	}
}