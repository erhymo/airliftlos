import { NextResponse } from "next/server";
import { requireApiAccess } from "../../../lib/apiAccess";
import { getDb } from "../../../lib/firebaseAdmin";

const TO_ADDRESSES = ["oyvind.myhre@airlift.no", "tom.ostrem@airlift.no"];

interface ExtendDriftPayload {
	subject: string;
	body: string;
	fromName?: string;
	base?: string;
	/** ID til driftsrapporten i Firestore (driftsrapporter/{id}), for å lagre forlenget-status. */
	reportId?: string;
	forlengetTilDato?: string;
	forlengetTilTid?: string;
	forlengetKommentar?: string;
}

type ExtendDriftResponseBody = {
	ok: boolean;
	forlengetSendtAt?: number;
	error?: string;
	details?: string;
};

export async function POST(req: Request) {
	const accessError = await requireApiAccess();
	if (accessError) return accessError;

	const apiKey = process.env.SENDGRID_API_KEY;
	const fromEmail = process.env.SENDGRID_FROM;
	if (!apiKey || !fromEmail) {
		return NextResponse.json({ error: "Missing SENDGRID_API_KEY or SENDGRID_FROM" }, { status: 500 });
	}

	let payload: ExtendDriftPayload;
	try {
		payload = (await req.json()) as ExtendDriftPayload;
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const {
		subject,
		body: emailBody,
		fromName,
		base,
		reportId,
		forlengetTilDato,
		forlengetTilTid,
		forlengetKommentar,
	} = payload;

	if (!subject || !emailBody) {
		return NextResponse.json({ error: "subject and body are required" }, { status: 400 });
	}

	// Samme mottakerlogikk som for selve driftsforstyrrelsen og gjenopptatt drift.
	let to: { email: string }[] = TO_ADDRESSES.map((email) => ({ email }));
	let cc: { email: string }[] = [];

	if (base === "Bergen") {
		to = [
			{ email: "aina.giskeodegard.balsnes@kystverket.no" },
			{ email: "kjell.asle.djupevag@kystverket.no" },
			{ email: "losformidling.kvitsoy@kystverket.no" },
		];
		cc = [
			{ email: "erlend.haugsbo@airlift.no" },
			{ email: "loshelikopter.bergen@airlift.no" },
			{ email: "tom.ostrem@airlift.no" },
		];
	} else if (base === "Hammerfest") {
		to = [
			{ email: "aina.giskeodegard.balsnes@kystverket.no" },
			{ email: "roy.arne.rotnes@kystverket.no" },
			{ email: "losformidling.nordland@kystverket.no" },
		];
		cc = [
			{ email: "erlend.haugsbo@airlift.no" },
			{ email: "loshelikopter.hammerfest@airlift.no" },
			{ email: "tom.ostrem@airlift.no" },
		];
	}

	try {
		const sgResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				personalizations: [
					{
						to,
						...(cc.length > 0 ? { cc } : {}),
						subject,
					},
				],
				from: { email: fromEmail, name: fromName || "LOS Helikopter" },
				content: [{ type: "text/plain", value: emailBody }],
			}),
		});

		if (!sgResponse.ok) {
			const text = await sgResponse.text();
			return NextResponse.json({ error: "SendGrid error", details: text }, { status: 502 });
		}

		// Forsøk å lagre forlenget-status på rapporten i Firestore slik at alle
		// enheter kan se ny estimert gjenopptakelse. Ikke kritisk for selve e-posten.
		let forlengetSendtAt: number | undefined;
		if (reportId) {
			try {
				const db = getDb();
				forlengetSendtAt = Date.now();
				const update: Record<string, unknown> = { forlengetSendtAt };
				if (typeof forlengetTilDato === "string") update.forlengetTilDato = forlengetTilDato;
				if (typeof forlengetTilTid === "string") update.forlengetTilTid = forlengetTilTid;
				if (typeof forlengetKommentar === "string") update.forlengetKommentar = forlengetKommentar;
				await db.collection("driftsrapporter").doc(reportId).set(update, { merge: true });
			} catch (err) {
				console.error(
					"Firestore: klarte ikke å lagre forlenget-status for driftsrapport",
					(err as Error).message,
				);
			}
		}

		const responseBody: ExtendDriftResponseBody = {
			ok: true,
			...(forlengetSendtAt ? { forlengetSendtAt } : {}),
		};
		return NextResponse.json(responseBody satisfies ExtendDriftResponseBody);
	} catch (error) {
		console.error("Failed to send extend drift email", error);
		return NextResponse.json({ error: "Failed to send extend drift email" }, { status: 500 });
	}
}
