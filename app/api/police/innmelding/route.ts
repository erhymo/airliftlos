import { NextResponse } from "next/server";
import { requireApiAccess } from "../../../../lib/apiAccess";
import { getDb } from "../../../../lib/firebaseAdmin";

// Samme mottakere og avsender som selve utmeldingen bruker (se lib/policeDelivery.ts),
// slik at innmeldingen kommer fra samme adresse Politiet allerede kjenner igjen.
const TO_EMAILS = ["ops211@politiet.no"];
const CC_EMAILS = ["tom.ostrem@airlift.no", "erlend.haugsbo@airlift.no"];
const DEFAULT_POLICE_FROM_EMAIL = "politiberedskap@airlift.no";
const DEFAULT_POLICE_FROM_NAME = "Airlift Politiberedskap";

interface InnmeldingPayload {
	subject?: string;
	body?: string;
	/** ID til utmeldingen i Firestore (policeUtmeldinger/{id}). */
	reportId?: string;
	innmeldtDato?: string;
	innmeldtTid?: string;
	innmeldtKommentar?: string;
}

type InnmeldingResponseBody = {
	ok: boolean;
	alreadySent?: boolean;
	innmeldtSendtAt?: number;
	error?: string;
	details?: string;
};

export async function POST(req: Request) {
	const accessError = await requireApiAccess();
	if (accessError) return accessError;

	const apiKey = process.env.SENDGRID_API_KEY;
	const fromEmail = process.env.POLICE_SENDGRID_FROM_EMAIL || DEFAULT_POLICE_FROM_EMAIL;
	const fromName = process.env.POLICE_SENDGRID_FROM_NAME || DEFAULT_POLICE_FROM_NAME;
	if (!apiKey) {
		return NextResponse.json({ error: "Missing SENDGRID_API_KEY" }, { status: 500 });
	}

	let payload: InnmeldingPayload;
	try {
		payload = (await req.json()) as InnmeldingPayload;
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const { subject, body: emailBody, reportId, innmeldtDato, innmeldtTid, innmeldtKommentar } = payload;

	if (!subject || !emailBody) {
		return NextResponse.json({ error: "subject and body are required" }, { status: 400 });
	}

	try {
		// Bruk Firestore som fasit for om denne utmeldingen allerede er innmeldt,
		// slik at samme mønster som "drift gjenopptatt" hindrer dobbel sending.
		let existingInnmeldtSendtAt: number | undefined;
		if (reportId) {
			try {
				const db = getDb();
				const snap = await db.collection("policeUtmeldinger").doc(reportId).get();
				if (snap.exists) {
					const data = snap.data() as { innmeldtSendtAt?: unknown } | undefined;
					const ts = data?.innmeldtSendtAt;
					if (typeof ts === "number" && Number.isFinite(ts) && ts > 0) existingInnmeldtSendtAt = ts;
				}
			} catch (err) {
				console.error("Firestore: klarte ikke å sjekke innmeldt-status for utmelding", (err as Error).message);
			}
		}

		if (existingInnmeldtSendtAt) {
			const responseBody: InnmeldingResponseBody = { ok: true, alreadySent: true, innmeldtSendtAt: existingInnmeldtSendtAt };
			return NextResponse.json(responseBody satisfies InnmeldingResponseBody);
		}

		const sgResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
			method: "POST",
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
			body: JSON.stringify({
				personalizations: [{ to: TO_EMAILS.map((email) => ({ email })), cc: CC_EMAILS.map((email) => ({ email })), subject }],
				from: { email: fromEmail, name: fromName },
				content: [{ type: "text/plain", value: emailBody }],
			}),
		});

		if (!sgResponse.ok) {
			const text = await sgResponse.text();
			return NextResponse.json({ error: "SendGrid error", details: text }, { status: 502 });
		}

		let innmeldtSendtAt: number | undefined;
		if (reportId) {
			try {
				const db = getDb();
				innmeldtSendtAt = Date.now();
				const update: Record<string, unknown> = { innmeldtSendtAt };
				if (typeof innmeldtDato === "string") update.innmeldtDato = innmeldtDato;
				if (typeof innmeldtTid === "string") update.innmeldtTid = innmeldtTid;
				if (typeof innmeldtKommentar === "string") update.innmeldtKommentar = innmeldtKommentar;
				await db.collection("policeUtmeldinger").doc(reportId).set(update, { merge: true });
			} catch (err) {
				console.error("Firestore: klarte ikke å lagre innmeldt-status for utmelding", (err as Error).message);
			}
		}

		const responseBody: InnmeldingResponseBody = { ok: true, alreadySent: false, ...(innmeldtSendtAt ? { innmeldtSendtAt } : {}) };
		return NextResponse.json(responseBody satisfies InnmeldingResponseBody);
	} catch (error) {
		console.error("Failed to send innmelding email", error);
		return NextResponse.json({ error: "Failed to send innmelding email" }, { status: 500 });
	}
}
