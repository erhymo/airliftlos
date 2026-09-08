import { NextResponse } from "next/server";
import { requireApiAccess } from "../../../../../lib/apiAccess";
import { getDb } from "../../../../../lib/firebaseAdmin";

export const runtime = "nodejs";

/**
 * Henter siste utmelding som ikke er innmeldt ennå. Brukes til å "koble" en
 * telefon til en utmelding sendt fra en annen telefon (eller sendt før
 * innmeldingsfunksjonen fantes), slik at den kan følges opp uten at man må
 * vite Firestore-ID-en fra før.
 */
export async function GET() {
	const accessError = await requireApiAccess();
	if (accessError) return accessError;

	try {
		const db = getDb();
		const snapshot = await db.collection("policeUtmeldinger").orderBy("createdAt", "desc").limit(20).get();

		for (const doc of snapshot.docs) {
			const data = doc.data() as { innmeldtSendtAt?: unknown; base?: string; date?: string; time?: string; createdAt?: number };
			if (typeof data.innmeldtSendtAt === "number" && data.innmeldtSendtAt > 0) continue;
			return NextResponse.json({
				ok: true,
				report: {
					id: doc.id,
					base: data.base ?? "Tromsø",
					date: data.date ?? "",
					time: data.time ?? "",
					createdAt: data.createdAt ?? 0,
				},
			});
		}

		return NextResponse.json({ ok: true, report: null });
	} catch (error) {
		console.error("Klarte ikke å hente siste utmelding", error);
		return NextResponse.json({ ok: false, error: "Klarte ikke å hente siste utmelding." }, { status: 500 });
	}
}
