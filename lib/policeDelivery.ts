import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type PoliceDeliveryKind = "crew" | "utmelding" | "report";

export type DeliveryStatus = {
	ok: boolean;
	skipped?: boolean;
	error?: string;
};

const EMAIL_ENV: Record<PoliceDeliveryKind, string> = {
	crew: "POLICE_CREW_TO_EMAILS",
	utmelding: "POLICE_UTMELDING_TO_EMAILS",
	report: "POLICE_REPORT_TO_EMAILS",
};

const SHAREPOINT_ENV: Record<PoliceDeliveryKind, string> = {
	crew: "POLICE_CREW_SHAREPOINT_FOLDER_PATH",
	utmelding: "POLICE_UTMELDING_SHAREPOINT_FOLDER_PATH",
	report: "POLICE_REPORT_SHAREPOINT_FOLDER_PATH",
};

function parseEmails(value: string | undefined): string[] {
	return (value ?? "")
		.split(/[;,]/)
		.map((item) => item.trim())
		.filter(Boolean);
}

function wrapText(text: string, maxChars: number): string[] {
	const words = text.split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let line = "";
	for (const word of words) {
		const next = line ? `${line} ${word}` : word;
		if (next.length > maxChars) {
			if (line) lines.push(line);
			line = word;
		} else {
			line = next;
		}
	}
	if (line) lines.push(line);
	return lines;
}

export async function createPolicePdf(title: string, body: string): Promise<Uint8Array> {
	const pdf = await PDFDocument.create();
	let page = pdf.addPage([595, 842]);
	const font = await pdf.embedFont(StandardFonts.Helvetica);
	const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
	let y = 790;
	page.drawText(title, { x: 50, y, size: 18, font: bold, color: rgb(0, 0, 0) });
	y -= 30;
	for (const rawLine of body.split("\n")) {
		const lines = rawLine.trim() ? wrapText(rawLine, 86) : [""];
		for (const line of lines) {
			if (y < 50) {
				page = pdf.addPage([595, 842]);
				y = 790;
			}
			page.drawText(line || " ", { x: 50, y, size: 11, font, color: rgb(0, 0, 0) });
			y -= 16;
		}
	}
	return pdf.save();
}

async function sendEmail(kind: PoliceDeliveryKind, subject: string, body: string, fileName: string, pdfBytes: Uint8Array): Promise<DeliveryStatus> {
	const toEmails = parseEmails(process.env[EMAIL_ENV[kind]]);
	if (toEmails.length === 0) return { ok: true, skipped: true, error: `${EMAIL_ENV[kind]} er ikke konfigurert` };
	const apiKey = process.env.SENDGRID_API_KEY;
	const fromEmail = process.env.SENDGRID_FROM;
	if (!apiKey || !fromEmail) return { ok: true, skipped: true, error: "SendGrid er ikke konfigurert" };

	const ccEmails = parseEmails(process.env[`${EMAIL_ENV[kind].replace("_TO_", "_CC_")}`]);
	const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
		method: "POST",
		headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
		body: JSON.stringify({
			personalizations: [{ to: toEmails.map((email) => ({ email })), ...(ccEmails.length ? { cc: ccEmails.map((email) => ({ email })) } : {}), subject }],
			from: { email: fromEmail, name: "Airlift Politiberedskap" },
			content: [{ type: "text/plain", value: body }],
			attachments: [{ content: Buffer.from(pdfBytes).toString("base64"), type: "application/pdf", filename: fileName, disposition: "attachment" }],
		}),
	});

	if (!res.ok) return { ok: false, error: await res.text().catch(() => "SendGrid-feil") };
	return { ok: true };
}

function buildSharePointItemPath(folderPath: string, fileName: string): string {
	const encodedFolder = folderPath.split("/").filter(Boolean).map(encodeURIComponent).join("/");
	return `${encodedFolder}/${encodeURIComponent(fileName)}`;
}

async function getGraphToken(): Promise<string | null> {
	const tenantId = process.env.MS_TENANT_ID;
	const clientId = process.env.MS_CLIENT_ID;
	const clientSecret = process.env.MS_CLIENT_SECRET;
	if (!tenantId || !clientId || !clientSecret) return null;
	const params = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" });
	const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params });
	if (!res.ok) return null;
	const data = (await res.json()) as { access_token?: string };
	return data.access_token ?? null;
}

function withYearFolder(folderPath: string, year: number): string {
	const segments = folderPath.split("/").filter(Boolean);
	const last = segments[segments.length - 1];
	if (/^(19|20)[0-9]{2}$/.test(last)) segments[segments.length - 1] = String(year);
	else segments.push(String(year));
	return segments.join("/");
}

async function uploadSharePoint(kind: PoliceDeliveryKind, fileName: string, pdfBytes: Uint8Array, year: number): Promise<DeliveryStatus> {
	const folderPath = process.env[SHAREPOINT_ENV[kind]];
	if (!folderPath) return { ok: true, skipped: true, error: `${SHAREPOINT_ENV[kind]} er ikke konfigurert` };
	const siteId = process.env.SHAREPOINT_SITE_ID;
	const token = await getGraphToken();
	if (!siteId || !token) return { ok: false, error: "SharePoint/Graph er ikke konfigurert komplett" };
	const itemPath = buildSharePointItemPath(withYearFolder(folderPath, year), fileName);
	const body = pdfBytes.buffer.slice(
		pdfBytes.byteOffset,
		pdfBytes.byteOffset + pdfBytes.byteLength,
	) as ArrayBuffer;
	const res = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${itemPath}:/content`, {
		method: "PUT",
		headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/pdf" },
		body,
	});
	if (!res.ok) return { ok: false, error: await res.text().catch(() => "SharePoint-feil") };
	return { ok: true };
}

export async function deliverPoliceSubmission(kind: PoliceDeliveryKind, title: string, body: string, fileName: string, year: number) {
	const pdfBytes = await createPolicePdf(title, body);
	const [email, sharepoint] = await Promise.all([
		sendEmail(kind, title, body, fileName, pdfBytes),
		uploadSharePoint(kind, fileName, pdfBytes, year),
	]);
	return { email, sharepoint };
}