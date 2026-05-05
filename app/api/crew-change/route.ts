import { NextResponse } from "next/server";
import { requireApiAccess } from "../../../lib/apiAccess";
import { getDb } from "../../../lib/firebaseAdmin";

export const runtime = "nodejs";

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

const PLACE_TYPES = ["Crew Change Bergen", "Crew Change Hammerfest", "Other Bergen", "Other Hammerfest"] as const;
type PlaceType = (typeof PLACE_TYPES)[number];

type CrewChangePayload = {
	date?: string;
	techlogNumber?: number;
	vesselName?: string;
	placeType?: string;
	isCrewChange?: boolean;
	totalFlightDistance?: number;
	pax?: number;
	helideckIdleTime?: number;
	reposMinutes?: number;
	comment?: string;
	weatherComment?: string;
	weatherDelayComment?: string;
	sign?: string;
};

function isPlaceType(value: unknown): value is PlaceType {
	return typeof value === "string" && PLACE_TYPES.includes(value as PlaceType);
}

function cleanText(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

function cleanInteger(value: unknown) {
	return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function getExcelDateAndSheet(dateIso?: string | null) {
	const d = dateIso ? new Date(dateIso) : new Date();
	if (Number.isNaN(d.getTime())) {
		return { excelDate: "", sheetName: MONTH_SHEETS[new Date().getMonth()], excelYear: new Date().getFullYear() };
	}
	const day = String(d.getDate()).padStart(2, "0");
	const month = String(d.getMonth() + 1).padStart(2, "0");
	return { excelDate: `${day}.${month}.${d.getFullYear()}`, sheetName: MONTH_SHEETS[d.getMonth()], excelYear: d.getFullYear() };
}

function requiresWeatherComment(dateIso: string) {
	const [, monthRaw, dayRaw] = dateIso.split("-");
	const month = Number(monthRaw);
	const day = Number(dayRaw);
	if (!month || !day) return false;
	return month >= 9 || month < 5 || (month === 5 && day === 1);
}

function getCrewChangeExcelPath(excelYear: number) {
	if (excelYear >= 2026 && process.env.CREW_CHANGE_EXCEL_PATH_2026) return process.env.CREW_CHANGE_EXCEL_PATH_2026;
	return process.env.CREW_CHANGE_EXCEL_PATH || "LOS/LOS rapporter/Logg Crew Change 2026.xlsx";
}

async function getGraphAccessToken(): Promise<string | null> {
	const tenantId = process.env.MS_TENANT_ID;
	const clientId = process.env.MS_CLIENT_ID;
	const clientSecret = process.env.MS_CLIENT_SECRET;
	if (!tenantId || !clientId || !clientSecret) return null;

	const params = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" });
	const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString() });
	if (!res.ok) return null;
	const data = (await res.json()) as { access_token?: string };
	return data.access_token ?? null;
}

function workbookBaseUrl(siteId: string, excelPath: string) {
	const encodedPath = excelPath.split("/").filter(Boolean).map(encodeURIComponent).join("/");
	return `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodedPath}:/workbook`;
}

function normalizeSheetName(value: string) {
	return value.trim().toLowerCase().replace(/[.\-_ ]+/g, "");
}

async function resolveWorksheetName(baseUrl: string, token: string, requestedSheetName: string) {
	const sheetsRes = await fetch(`${baseUrl}/worksheets?$select=name`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!sheetsRes.ok) return requestedSheetName;

	const data = (await sheetsRes.json().catch(() => ({}))) as { value?: Array<{ name?: string }> };
	const sheets = (data.value ?? []).map((sheet) => sheet.name).filter((name): name is string => !!name);
	const normalizedRequested = normalizeSheetName(requestedSheetName);
	return sheets.find((name) => normalizeSheetName(name) === normalizedRequested) ?? requestedSheetName;
}

async function appendCrewChangeRow(row: (string | number | null)[], sheetName: string, excelYear: number) {
	const siteId = process.env.SHAREPOINT_SITE_ID;
	const excelPath = getCrewChangeExcelPath(excelYear);
	if (!siteId || !excelPath) throw new Error("Crew change mot Excel er ikke konfigurert.");
	const token = await getGraphAccessToken();
	if (!token) throw new Error("Mangler Graph-token for å skrive Crew change til Excel.");

	const baseUrl = workbookBaseUrl(siteId, excelPath);
	const worksheetName = await resolveWorksheetName(baseUrl, token, sheetName);
	const rangeRes = await fetch(`${baseUrl}/worksheets('${encodeURIComponent(worksheetName)}')/range(address='A1:X500')`, { headers: { Authorization: `Bearer ${token}` } });
	if (!rangeRes.ok) throw new Error(`Klarte ikke å lese Crew change-arket ${worksheetName} (status ${rangeRes.status}).`);

	const rangeData = (await rangeRes.json()) as { values?: unknown[][] };
	const values = (rangeData.values ?? []) as (string | number | null)[][];
	let startIndex = 3;
	for (let i = 0; i < values.length; i += 1) {
		const cell = values[i]?.[2];
		if (typeof cell === "string" && cell.trim().toLowerCase().startsWith("sign")) {
			startIndex = i + 2;
			break;
		}
	}

	let nextRow = values.length + 1;
	for (let i = startIndex; i < values.length; i += 1) {
		const rowValues = values[i] ?? [];
		const isEmpty = [rowValues[2], rowValues[3], rowValues[5], rowValues[6], rowValues[7]].every((v) => v === null || v === "" || typeof v === "undefined");
		if (isEmpty) {
			nextRow = i + 1;
			break;
		}
	}

	const patchRes = await fetch(`${baseUrl}/worksheets('${encodeURIComponent(worksheetName)}')/range(address='A${nextRow}:X${nextRow}')`, {
		method: "PATCH",
		headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
		body: JSON.stringify({ values: [row] }),
	});
	if (!patchRes.ok) {
		const text = await patchRes.text().catch(() => "");
		throw new Error(`Klarte ikke å skrive Crew change til Excel (status ${patchRes.status}). ${text.slice(0, 250)}`);
	}
}

async function getLatestLosTechlogNumber() {
	try {
		const snapshot = await getDb().collection("losBookings").orderBy("losLogSentAt", "desc").limit(50).get();
		for (const doc of snapshot.docs) {
			const value = doc.get("techlogNumber");
			if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
		}
	} catch (error) {
		console.error("Crew change: klarte ikke å hente siste LOS-techlognummer", error);
	}
	return null;
}

export async function GET() {
	const accessError = await requireApiAccess();
	if (accessError) return accessError;
	return NextResponse.json({ ok: true, latestTechlogNumber: await getLatestLosTechlogNumber() });
}

export async function POST(req: Request) {
	const accessError = await requireApiAccess();
	if (accessError) return accessError;

	let payload: CrewChangePayload;
	try {
		payload = (await req.json()) as CrewChangePayload;
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const date = cleanText(payload.date);
	const sign = cleanText(payload.sign).toUpperCase();
	const vesselName = cleanText(payload.vesselName);
	const techlogNumber = cleanInteger(payload.techlogNumber);
	const totalFlightDistance = cleanInteger(payload.totalFlightDistance);
	const pax = cleanInteger(payload.pax);
	const helideckIdleTime = cleanInteger(payload.helideckIdleTime);
	const comment = cleanText(payload.comment);
	if (!date) return NextResponse.json({ error: "Husk å fylle inn Dato." }, { status: 400 });
	if (sign.length !== 3) return NextResponse.json({ error: "Husk å fylle inn Sign." }, { status: 400 });
	if (techlogNumber === null) return NextResponse.json({ error: "Husk å fylle inn TechLogNr." }, { status: 400 });
	if (!vesselName) return NextResponse.json({ error: "Husk å fylle inn Navn på fartøy." }, { status: 400 });
	if (!isPlaceType(payload.placeType)) return NextResponse.json({ error: "Husk å fylle inn Sted/type." }, { status: 400 });
	if (totalFlightDistance === null) return NextResponse.json({ error: "Husk å fylle inn Total flight distance in NM." }, { status: 400 });
	if (pax === null) return NextResponse.json({ error: "Husk å fylle inn PAX." }, { status: 400 });
	if (helideckIdleTime === null) return NextResponse.json({ error: "Husk å fylle inn Helideck idle time." }, { status: 400 });
	if (!comment) return NextResponse.json({ error: "Husk å fylle inn Kommentarer." }, { status: 400 });
	const weatherComment = cleanText(payload.weatherComment);
	if (requiresWeatherComment(date) && !weatherComment) {
		return NextResponse.json({ error: "Kommentarer om værforhold må fylles ut mellom 1. september og 1. mai." }, { status: 400 });
	}

	const { excelDate, sheetName, excelYear } = getExcelDateAndSheet(date);
	const row = Array<string | number | null>(24).fill("");
	row[0] = null; // Fakt. skal stå blankt
	row[1] = null; // Løpenummer fylles ikke av appen
	row[2] = sign;
	row[3] = excelDate;
	row[5] = techlogNumber;
	row[6] = vesselName;
	row[7] = payload.placeType;
	row[16] = payload.isCrewChange ? 1 : "";
	row[17] = totalFlightDistance;
	row[18] = pax;
	row[19] = helideckIdleTime;
	row[20] = cleanInteger(payload.reposMinutes) ?? "";
	row[21] = comment;
	row[22] = weatherComment;
	row[23] = cleanText(payload.weatherDelayComment);

	try {
		await appendCrewChangeRow(row, sheetName, excelYear);
		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("Crew change: feil ved innsending", error);
		return NextResponse.json({ error: error instanceof Error ? error.message : "Klarte ikke å sende Crew change." }, { status: 500 });
	}
}