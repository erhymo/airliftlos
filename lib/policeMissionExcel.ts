export type PoliceMissionExcelLog = {
	sign: string;
	date: string;
	alertTime: string;
	readyTime: string;
	readinessDeviation: string;
	ref: string;
	poId: string;
	bid: string;
	cancelled: boolean;
	techlogNumber: string;
	crew: string[];
	blockOff1: string;
	blockOn1: string;
	blockTime1: string;
	waitTime: string;
	blockOff2: string;
	blockOn2: string;
	blockTime2: string;
	totalBlock: string;
	flightRoute: string;
	pax: string;
	description: string;
	readinessDeviationReason: string;
};

export type PoliceMissionExcelStatus = {
	ok: boolean;
	skipped?: boolean;
	error?: string;
	row?: number;
};

type GraphRange = { values?: unknown[][] };
type GraphWorksheetList = { value?: Array<{ name?: string }> };

function excelDate(value: string) {
	const match = value.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
	return match ? `${match[3]}.${match[2]}.${match[1]}` : value;
}

function excelPathForYear(year: number) {
	return process.env.POLICE_MISSION_LOG_EXCEL_PATH || `Politiet/Politiberedskap/Logg ${year}.xlsx`;
}

function encodeDrivePath(path: string) {
	return path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

function escapeWorksheetName(name: string) {
	return name.replace(/'/g, "''");
}

function cellIsEmpty(value: unknown) {
	return value === null || typeof value === "undefined" || String(value).trim() === "";
}

function crewCode(value: string) {
	const match = value.match(/\(([^)]+)\)\s*$/);
	return (match?.[1] || value).trim().toLocaleUpperCase("nb-NO");
}

async function getGraphAccessToken(): Promise<string | null> {
	const tenantId = process.env.MS_TENANT_ID;
	const clientId = process.env.MS_CLIENT_ID;
	const clientSecret = process.env.MS_CLIENT_SECRET;
	if (!tenantId || !clientId || !clientSecret) return null;

	const params = new URLSearchParams({
		client_id: clientId,
		client_secret: clientSecret,
		scope: "https://graph.microsoft.com/.default",
		grant_type: "client_credentials",
	});
	const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: params.toString(),
	});
	if (!res.ok) return null;
	const data = (await res.json().catch(() => ({}))) as { access_token?: string };
	return data.access_token ?? null;
}

async function getWorksheetName(baseUrl: string, token: string) {
	const configured = process.env.POLICE_MISSION_LOG_WORKSHEET_NAME?.trim();
	if (configured) return configured;

	const res = await fetch(`${baseUrl}/worksheets?$select=name`, { headers: { Authorization: `Bearer ${token}` } });
	if (!res.ok) throw new Error(`Klarte ikke å lese arkfaner i Politiet-loggen (status ${res.status}).`);
	const data = (await res.json().catch(() => ({}))) as GraphWorksheetList;
	const firstName = data.value?.map((sheet) => sheet.name).find(Boolean);
	if (!firstName) throw new Error("Fant ingen arkfane i Politiet-loggen.");
	return firstName;
}

function buildExcelRow(log: PoliceMissionExcelLog): (string | number | null)[] {
	return [
		log.sign.toLocaleUpperCase("nb-NO"),
		excelDate(log.date),
		log.alertTime,
		log.readyTime,
		log.readinessDeviation,
		log.ref,
		log.poId,
		log.bid,
		log.cancelled ? "JA" : "",
		log.techlogNumber,
		log.crew.map(crewCode).filter(Boolean).join("/"),
		log.blockOff1,
		log.blockOn1,
		log.blockTime1,
		log.waitTime,
		log.blockOff2,
		log.blockOn2,
		log.blockTime2,
		log.totalBlock,
		log.flightRoute,
		log.pax,
		log.description,
		log.readinessDeviationReason,
	];
}

async function findNextRow(baseUrl: string, worksheetName: string, token: string) {
	const sheet = encodeURIComponent(escapeWorksheetName(worksheetName));
	const res = await fetch(`${baseUrl}/worksheets('${sheet}')/range(address='C1:Y1000')`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok) throw new Error(`Klarte ikke å lese Politiet-loggen (status ${res.status}).`);

	const data = (await res.json().catch(() => ({}))) as GraphRange;
	const values = data.values ?? [];
	let startIndex = 0;
	for (let i = 0; i < values.length; i += 1) {
		const firstCell = values[i]?.[0];
		if (typeof firstCell === "string" && firstCell.trim().toLowerCase() === "sign") {
			startIndex = i + 1;
			break;
		}
	}

	for (let i = startIndex; i < values.length; i += 1) {
		const row = values[i] ?? [];
		if ([row[0], row[1], row[6], row[7], row[9]].every(cellIsEmpty)) return i + 1;
	}
	return values.length + 1;
}

export async function appendPoliceMissionLogToExcel(log: PoliceMissionExcelLog): Promise<PoliceMissionExcelStatus> {
	const siteId = process.env.SHAREPOINT_SITE_ID;
	const year = Number(log.date.slice(0, 4)) || new Date().getFullYear();
	const excelPath = excelPathForYear(year);
	if (!siteId || !excelPath) return { ok: true, skipped: true, error: "Politiet Excel-logg er ikke konfigurert" };

	const token = await getGraphAccessToken();
	if (!token) return { ok: false, error: "Mangler Graph-token for å skrive Politiet-logg til Excel" };

	const baseUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodeDrivePath(excelPath)}:/workbook`;
	const worksheetName = await getWorksheetName(baseUrl, token);
	const rowNumber = await findNextRow(baseUrl, worksheetName, token);
	const sheet = encodeURIComponent(escapeWorksheetName(worksheetName));
	const address = `C${rowNumber}:Y${rowNumber}`;
	const patchRes = await fetch(`${baseUrl}/worksheets('${sheet}')/range(address='${address}')`, {
		method: "PATCH",
		headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
		body: JSON.stringify({ values: [buildExcelRow(log)] }),
	});

	if (!patchRes.ok) {
		const text = await patchRes.text().catch(() => "");
		return { ok: false, error: `Klarte ikke å skrive Politiet-logg til Excel (status ${patchRes.status}). ${text}`.trim() };
	}
	return { ok: true, row: rowNumber };
}