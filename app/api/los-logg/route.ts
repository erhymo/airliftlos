import { NextResponse } from "next/server";
import { cookies } from "next/headers";

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

	// Finn neste ledige rad basert på brukt område i arket
	const usedRes = await fetch(
		`${baseUrl}/worksheets('${encodeURIComponent(sheetName)}')/usedRange(valuesOnly=true)`,
		{ headers: { Authorization: `Bearer ${token}` } },
	);
	if (!usedRes.ok) {
		const text = await usedRes.text().catch(() => "");
		console.error(
			`LOS-logg: Klarte ikke å lese brukt område for arket ${sheetName}. Status ${usedRes.status}. Respons:`,
			text,
		);
		throw new Error(
			`Klarte ikke å lese brukt område for arket ${sheetName} (status ${usedRes.status}).`,
		);
	}

		const used = (await usedRes.json()) as { values?: unknown[][] };
		const rowCount = used.values?.length ?? 1; // minst header-rad
		const nextRow = rowCount + 1;
		// Vi peker eksplisitt på arket via worksheets('{sheetName}') og bruker lokal adresse A:R
		const address = `A${nextRow}:R${nextRow}`;

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
			body.location ?? "", // H Sted
			body.losType ?? "", // I Type
			hasLos ? 1 : "", // J Skriv 1 hvis LOS
			hasLos ? body.pilots?.[0] ?? "" : "", // K Los 1
			hasLos && body.pilots && body.pilots.length > 1 ? body.pilots[1] : "", // L Los 2
			body.shipLanding ? 1 : "", // M Ship landing
			body.tokeBomtur ? 1 : "", // N Ekstra flagg (1/blank)
			body.losToAirportCount ?? "", // O Antall los til flyplass
			body.enfjLandings ?? "", // P Antall landinger ENFJ
			body.hoistCount ?? "", // Q Hoists
			body.comment ?? "", // R Kommentar
		];

		await appendRowToExcel(row, sheetName);

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

