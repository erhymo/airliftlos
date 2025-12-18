import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "../../../lib/firebaseAdmin";
import { saveGtForVessel } from "../../../lib/vesselGt";

const MONTH_SHEETS = [
	"Januar",
	"Februar",
	"Mars",
	"April",
	"Mai",
	"Juni",
	"Juli",
	"August",
	"September",
	"Oktober",
	"November",
	"Desember",
];

type LosLoggPayload = {
	bookingId?: string;
	date?: string | null;
	orderNumber?: string | null;
	vesselName?: string | null;
		gt?: number | null;
	base?: string | null;
	pilots?: string[];
	techlogNumber?: number | null;
	location?: string | null;
	losType?: string | null;
	shipLanding?: boolean;
	tokeBomtur?: boolean;
	losToAirportCount?: number | null;
	enfjLandings?: number | null;
	hoistCount?: number | null;
	comment?: string | null;
	sign?: string | null;
};

	function getExcelVesselName(raw?: string | null): string {
		if (!raw) return "";
		// Fjern eventuelle koder/registreringer i parentes til slutt,
		// f.eks. "ALFA FINLANDIA (C6D7Y)" -> "ALFA FINLANDIA".
		const withoutParen = raw.replace(/\s*\([^)]*\)\s*$/, "");
		return withoutParen.trim();
	}

function getExcelDateAndSheet(dateIso?: string | null) {
	const d = dateIso ? new Date(dateIso) : new Date();
	if (Number.isNaN(d.getTime())) {
		return { excelDate: "", sheetName: MONTH_SHEETS[new Date().getMonth()] };
	}
	const day = String(d.getDate()).padStart(2, "0");
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const year = d.getFullYear();
	return {
		excelDate: `${day}.${month}.${year}`,
		sheetName: MONTH_SHEETS[d.getMonth()],
	};
}

async function getGraphAccessToken(): Promise<string | null> {
	const tenantId = process.env.MS_TENANT_ID;
	const clientId = process.env.MS_CLIENT_ID;
	const clientSecret = process.env.MS_CLIENT_SECRET;

	if (!tenantId || !clientId || !clientSecret) {
		console.error(
			"LOS-logg: MS_TENANT_ID, MS_CLIENT_ID eller MS_CLIENT_SECRET mangler, kan ikke hente Graph-token.",
		);
		return null;
	}

	const params = new URLSearchParams({
		client_id: clientId,
		client_secret: clientSecret,
		scope: "https://graph.microsoft.com/.default",
		grant_type: "client_credentials",
	});

	const res = await fetch(
		`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
		{
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: params.toString(),
		},
	);

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		console.error("LOS-logg: Klarte ikke å hente Graph-token", text);
		return null;
	}

	const data = (await res.json()) as { access_token?: string };
	if (!data.access_token) {
		console.error("LOS-logg: access_token mangler i Graph-responsen");
		return null;
	}

	return data.access_token;
}

async function appendRowToExcel(row: (string | number | null)[], sheetName: string) {
	const siteId = process.env.SHAREPOINT_SITE_ID;
	const excelPath = process.env.LOS_LOGG_EXCEL_PATH;
	if (!siteId || !excelPath) {
		console.error("LOS-logg: SHAREPOINT_SITE_ID eller LOS_LOGG_EXCEL_PATH mangler.");
		throw new Error(
			"LOS-logg mot Excel er ikke konfigurert (mangler SHAREPOINT_SITE_ID eller LOS_LOGG_EXCEL_PATH).",
		);
	}

	const token = await getGraphAccessToken();
	if (!token) {
		throw new Error("LOS-logg: Mangler Graph-token for å skrive til Excel.");
	}

		const encodedPath = excelPath
			.split("/")
			.filter(Boolean)
			.map((segment) => encodeURIComponent(segment))
			.join("/");
		const baseUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodedPath}:/workbook`;

		// Finn neste ledige rad i selve LOS-griden ved å se etter første "tomme" rad
		// under header-raden (der kolonne C har teksten "Sign"). En rad regnes som
		// tom hvis nøkkelfeltene vi fyller (Sign, Ordrenummer, Navn på fartøy) er
		// tomme – vi ignorerer formatering og evt. formler i andre kolonner.
			const rangeRes = await fetch(
				`${baseUrl}/worksheets('${encodeURIComponent(sheetName)}')/range(address='A1:S500')`,
				{ headers: { Authorization: `Bearer ${token}` } },
			);
		if (!rangeRes.ok) {
			const text = await rangeRes.text().catch(() => "");
			console.error(
				`LOS-logg: Klarte ikke å lese område A1:R500 for arket ${sheetName}. Status ${rangeRes.status}. Respons:`,
				text,
			);
			throw new Error(
				`Klarte ikke å lese brukt område for arket ${sheetName} (status ${rangeRes.status}).`,
			);
		}

		const rangeData = (await rangeRes.json()) as { values?: unknown[][] };
		const values = (rangeData.values ?? []) as (string | number | null)[][];

		// Finn header-raden for griden (der kolonne C har "Sign"), så vi starter søket under den
		let startIndex = 0;
		for (let i = 0; i < values.length; i += 1) {
			const cell = values[i]?.[2]; // kolonne C
			if (typeof cell === "string" && cell.trim().toLowerCase() === "sign") {
				startIndex = i + 1;
				break;
			}
		}

		// Finn første rad der nøkkelfeltene vi fyller er helt tomme
		// C (Sign), E (Ordrenummer), G (Navn på fartøy).
		let nextRow = values.length + 1; // fallback hvis vi ikke finner tom rad
		for (let i = startIndex; i < values.length; i += 1) {
			const rowValues = values[i] ?? [];
			const signVal = rowValues[2]; // C
			const orderVal = rowValues[4]; // E
			const vesselVal = rowValues[6]; // G
			const isEmpty = [signVal, orderVal, vesselVal].every((v) => v === null || v === "" || typeof v === "undefined");
			if (isEmpty) {
				// Range A1:R500 starter på rad 1, så vi legger til 1 for å få faktisk radnummer
				nextRow = i + 1;
				break;
			}
		}

			// Vi peker eksplisitt på arket via worksheets('{sheetName}') og bruker lokal adresse A:S
			const address = `A${nextRow}:S${nextRow}`;

		// Skriv raden inn i riktig område på riktig ark
		const patchRes = await fetch(
			`${baseUrl}/worksheets('${encodeURIComponent(sheetName)}')/range(address='${address}')`,
			{
				method: "PATCH",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ values: [row] }),
			},
		);

		if (!patchRes.ok) {
			const text = await patchRes.text().catch(() => "");
			console.error("LOS-logg: Feil ved skriving til Excel", text);

			// Prøv å hente ut en mer forklarende feilmelding fra Graph-responsen
			let detailedMessage = "";
			try {
				const parsed = JSON.parse(text) as { error?: { message?: string } };
				if (parsed.error?.message) {
					detailedMessage = parsed.error.message;
				}
			} catch {
				// Ignorer JSON-parse-feil, vi faller tilbake til statuskode-meldingen
			}

			const baseMessage = `Klarte ikke å skrive rad til Excel (status ${patchRes.status}).`;
			const combined = detailedMessage
				? `${baseMessage} Detaljer fra Microsoft Graph: ${detailedMessage}`
				: `${baseMessage} Se logg for flere detaljer.`;

			throw new Error(combined);
		}
}

export async function POST(req: Request) {
	try {
		// Enkelt ACCESS_CODE-sjekk (som resten av appen)
		const accessCode = process.env.ACCESS_CODE;
		if (accessCode) {
			const cookieStore = await cookies();
			const accessCookie = cookieStore.get("airliftlos_access");
			if (!accessCookie || accessCookie.value !== "ok") {
				return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
			}
		}

		const body = (await req.json()) as LosLoggPayload;

		// Valider påkrevde felt
		if (!body.sign || body.sign.length !== 3) {
			return NextResponse.json(
				{ error: "Sign (3 bokstaver) mangler." },
				{ status: 400 },
			);
		}

		if (!body.orderNumber || !body.vesselName) {
			return NextResponse.json(
				{ error: "Ordrenummer og fartøy må være satt." },
				{ status: 400 },
			);
		}

		if (!body.location || !body.losType) {
			return NextResponse.json(
				{ error: "Sted og type må være satt." },
				{ status: 400 },
			);
		}

			const { excelDate, sheetName } = getExcelDateAndSheet(body.date);
			const hasLos = Array.isArray(body.pilots) && body.pilots.length > 0;
			const vesselForExcel = getExcelVesselName(body.vesselName ?? "");

			const row: (string | number | null)[] = [
				null, // A Fakt.
				null, // B Løpenummer
				body.sign.toUpperCase(), // C Sign
				excelDate, // D Dato (DD.MM.ÅÅÅÅ)
				body.orderNumber ?? "", // E Ordrenummer
				body.techlogNumber ?? "", // F Techlognummer
				vesselForExcel, // G Navn på fartøy (uten registreringskode i parentes)
				body.gt ?? "", // H GT
				body.location ?? "", // I Sted
				body.losType ?? "", // J Type
				hasLos ? 1 : "", // K Skriv 1 hvis LOS
				hasLos ? body.pilots?.[0] ?? "" : "", // L Los 1
				hasLos && body.pilots && body.pilots.length > 1 ? body.pilots[1] : "", // M Los 2
				body.shipLanding ? 1 : "", // N Ship landing
				body.tokeBomtur ? 1 : "", // O Ekstra flagg (1/blank)
				body.losToAirportCount ?? "", // P Antall los til flyplass
				body.enfjLandings ?? "", // Q Antall landinger ENFJ
				body.hoistCount ?? "", // R Hoists
				body.comment ?? "", // S Kommentar
			];
		
			await appendRowToExcel(row, sheetName);

			// Lagre GT mot fartøynavnet slik at neste bestilling for samme båt
			// kan få GT forhåndsutfylt automatisk.
			if (typeof body.gt === "number" && body.vesselName) {
				try {
					await saveGtForVessel(body.vesselName, body.gt, "manual");
				} catch (err) {
					console.warn(
						"LOS-logg: klarte ikke å oppdatere vesselGt med manuell GT-verdi",
						err,
					);
				}
			}

			// Hvis denne LOS-loggen hører til en importert bestilling, marker den som lukket
			// i Firestore slik at den ikke lenger vises som åpen i LOS-logg-listen.
			if (body.bookingId) {
				try {
					const db = getDb();
					const ref = db.collection("losBookings").doc(body.bookingId);
					const snap = await ref.get();
					if (snap.exists) {
								const updateData: Record<string, unknown> = {
								status: "closed",
								losLogSentAt: Date.now(),
								losLogSign: body.sign?.toUpperCase() ?? null,
							};
							if (typeof body.techlogNumber === "number") {
								updateData.techlogNumber = body.techlogNumber;
							}
								if (typeof body.gt === "number") {
									updateData.gt = body.gt;
								}

							await ref.set(updateData, { merge: true });
					} else {
						console.warn(
							"LOS-logg: bookingId finnes ikke i losBookings, hopper over status-oppdatering",
							body.bookingId,
						);
					}
				} catch (err) {
					console.error(
						"LOS-logg: klarte ikke å markere losBookings-dokument som lukket etter sending til Excel",
						err,
					);
				}
			}
		
			return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("Feil i LOS-logg POST", error);
		const message =
			error instanceof Error && error.message
				? error.message
				: "Uventet feil ved sending av LOS-logg.";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

