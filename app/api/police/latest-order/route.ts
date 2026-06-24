import { inflateRawSync } from "node:zlib";
import { NextResponse } from "next/server";
import { requireApiAccess } from "../../../../lib/apiAccess";

export const runtime = "nodejs";

type GraphMessage = {
	id: string;
	subject?: string | null;
	receivedDateTime?: string | null;
	from?: { emailAddress?: { address?: string | null; name?: string | null } | null } | null;
	hasAttachments?: boolean | null;
};

type GraphAttachment = {
	id?: string | null;
	"@odata.type"?: string;
	name?: string | null;
	contentType?: string | null;
	contentBytes?: string | null;
	size?: number | null;
};

const MAILBOX = "politiberedskap@airlift.no";
const SUBJECT_PREFIX = "airlift bestilling";
const MESSAGE_PAGE_SIZE = 50;
const MAX_MESSAGE_PAGES = 4;

class PoliceOrderError extends Error {
	constructor(message: string, public status = 500) {
		super(message);
	}
}

export async function GET() {
	const accessError = await requireApiAccess();
	if (accessError) return accessError;

	try {
		const token = await getGraphAccessToken();
		if (!token) return NextResponse.json({ ok: false, error: "Fikk ikke access token fra Microsoft Graph" }, { status: 500 });

		const message = await findLatestPoliceOrderMessage(token);
		if (!message) return NextResponse.json({ ok: false, error: "Fant ingen ny Politiet-bestilling." }, { status: 404 });

		const attachment = await findDocxAttachment(token, message.id);
		if (!attachment) return NextResponse.json({ ok: false, error: "Fant ingen DOCX-bestilling i siste e-post." }, { status: 404 });
		if (!attachment.contentBytes) throw new PoliceOrderError("Fant DOCX-vedlegg, men klarte ikke å lese innholdet fra Microsoft Graph.", 502);

		const docx = Buffer.from(attachment.contentBytes, "base64");
		let parsed: ReturnType<typeof parsePoliceOrderDocx>;
		try {
			parsed = parsePoliceOrderDocx(docx);
		} catch (error) {
			if (error instanceof PoliceOrderError) throw error;
			throw new PoliceOrderError("DOCX-vedlegget kunne ikke leses som Word-dokument.", 422);
		}
		return NextResponse.json({
			ok: true,
			order: {
				...parsed,
				subject: message.subject ?? "",
				receivedDateTime: message.receivedDateTime ?? null,
				fromName: message.from?.emailAddress?.name ?? null,
				fromAddress: message.from?.emailAddress?.address ?? null,
				attachmentName: attachment.name ?? null,
			},
		});
	} catch (error) {
		const orderError = error instanceof PoliceOrderError ? error : new PoliceOrderError("Klarte ikke å hente eller lese siste bestilling fra Politiet.");
		return NextResponse.json({ ok: false, error: orderError.message }, { status: orderError.status });
	}
}

async function getGraphAccessToken(): Promise<string | null> {
	const tenantId = process.env.MS_TENANT_ID;
	const clientId = process.env.MS_CLIENT_ID;
	const clientSecret = process.env.MS_CLIENT_SECRET;
	if (!tenantId || !clientId || !clientSecret) return null;

	const params = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" });
	const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString() });
	if (!res.ok) return null;
	const data = (await res.json().catch(() => ({}))) as { access_token?: string };
	return data.access_token ?? null;
}

async function findLatestPoliceOrderMessage(token: string) {
	return await findLatestPoliceOrderMessageInFolder(token, "Inbox") ?? await findLatestPoliceOrderMessageInMailbox(token);
}

async function findLatestPoliceOrderMessageInFolder(token: string, folderName: string) {
	const url = new URL(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(MAILBOX)}/mailFolders/${encodeURIComponent(folderName)}/messages`);
	return findLatestPoliceOrderMessageFromUrl(token, url, `Klarte ikke å hente e-post fra Politiet-${folderName}`);
}

async function findLatestPoliceOrderMessageInMailbox(token: string) {
	const url = new URL(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(MAILBOX)}/messages`);
	return findLatestPoliceOrderMessageFromUrl(token, url, "Klarte ikke å søke i Politiet-postboksen");
}

async function findLatestPoliceOrderMessageFromUrl(token: string, url: URL, errorPrefix: string) {
	url.search = new URLSearchParams({ $top: String(MESSAGE_PAGE_SIZE), $orderby: "receivedDateTime desc", $select: "id,subject,receivedDateTime,from,hasAttachments" }).toString();
	let nextUrl: string | null = url.toString();
	for (let page = 0; nextUrl && page < MAX_MESSAGE_PAGES; page += 1) {
		const res = await fetch(nextUrl, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
		if (!res.ok) throw new PoliceOrderError(`${errorPrefix} (HTTP ${res.status}).`, 502);
		const data = (await res.json().catch(() => ({}))) as { value?: GraphMessage[]; "@odata.nextLink"?: string };
		const match = (data.value ?? []).find((message) => subjectMatches(message.subject) && message.hasAttachments);
		if (match) return match;
		nextUrl = data["@odata.nextLink"] ?? null;
	}
	return null;
}

async function findDocxAttachment(token: string, messageId: string) {
	const url = new URL(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(MAILBOX)}/messages/${encodeURIComponent(messageId)}/attachments`);
	url.search = new URLSearchParams({ $select: "id,name,contentType,contentBytes,size", $top: "20" }).toString();
	const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
	if (!res.ok) throw new PoliceOrderError(`Klarte ikke å hente vedlegg fra Politiet-bestilling (HTTP ${res.status}).`, 502);
	const data = (await res.json().catch(() => ({}))) as { value?: GraphAttachment[] };
	const attachment = selectDocxAttachment(data.value ?? []);
	if (!attachment || attachment.contentBytes || !attachment.id) return attachment;

	const attachmentUrl = new URL(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(MAILBOX)}/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachment.id)}`);
	attachmentUrl.search = new URLSearchParams({ $select: "id,name,contentType,contentBytes,size" }).toString();
	const attachmentRes = await fetch(attachmentUrl, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
	if (!attachmentRes.ok) throw new PoliceOrderError(`Klarte ikke å hente DOCX-innhold fra Politiet-bestilling (HTTP ${attachmentRes.status}).`, 502);
	return (await attachmentRes.json().catch(() => attachment)) as GraphAttachment;
}

function subjectMatches(subject: string | null | undefined) {
	return normalizedSubject(subject).includes(SUBJECT_PREFIX);
}

function isDocxAttachment(attachment: GraphAttachment) {
	const name = (attachment.name ?? "").toLocaleLowerCase("nb-NO");
	const contentType = (attachment.contentType ?? "").toLocaleLowerCase("nb-NO");
	return name.endsWith(".docx") || contentType.includes("wordprocessingml.document");
}

function selectDocxAttachment(attachments: GraphAttachment[]) {
	const docxAttachments = attachments.filter(isDocxAttachment);
	return docxAttachments.find((attachment) => (attachment.name ?? "").toLocaleLowerCase("nb-NO").includes("bestillingsskjema")) ?? docxAttachments[0] ?? null;
}

function parsePoliceOrderDocx(docx: Buffer) {
	const xml = readZipTextFile(docx, "word/document.xml");
	const rows = extractDocxRows(xml);
	let poId = "";
	let requester = "";
	let bid = "";

	for (const cells of rows) {
		const label = cells[0] ?? "";
		const value = cells.slice(1).join(" ");
		const combined = `${label} ${value}`.trim();
		if (/PO\s*id\s*:/i.test(combined)) poId = extractLastNumber(value || combined) || poId;
		if (/Rekvirent\s*\/?\s*attestant\s*:/i.test(combined)) {
			requester = extractRequester(value || combined) || requester;
			bid = extractBid(value || combined) || bid;
		}
	}

	const text = rows.flat().join("\n");
	const parsed = {
		poId: poId || extractLastNumber(extractAfter(text, /PO\s*id\s*:/i)),
		requester: requester || extractRequester(extractAfter(text, /Rekvirent\s*\/?\s*attestant\s*:/i)),
		bid: bid || extractBid(text),
	};
	if (!parsed.poId && !parsed.requester && !parsed.bid) throw new PoliceOrderError("DOCX-vedlegget ble lest, men appen fant ikke PO ID, rekvirent eller BID.", 422);
	return parsed;
}

function readZipTextFile(zip: Buffer, fileName: string) {
	const eocd = findSignatureBackwards(zip, 0x06054b50);
	if (eocd < 0) throw new Error("Ugyldig DOCX-fil");
	const entries = zip.readUInt16LE(eocd + 10);
	let offset = zip.readUInt32LE(eocd + 16);
	for (let i = 0; i < entries; i += 1) {
		if (zip.readUInt32LE(offset) !== 0x02014b50) throw new Error("Ugyldig DOCX-katalog");
		const method = zip.readUInt16LE(offset + 10);
		const compressedSize = zip.readUInt32LE(offset + 20);
		const nameLength = zip.readUInt16LE(offset + 28);
		const extraLength = zip.readUInt16LE(offset + 30);
		const commentLength = zip.readUInt16LE(offset + 32);
		const localOffset = zip.readUInt32LE(offset + 42);
		const name = zip.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
		if (name === fileName) return readZipEntry(zip, localOffset, compressedSize, method).toString("utf8");
		offset += 46 + nameLength + extraLength + commentLength;
	}
	throw new Error("Fant ikke Word-innhold i DOCX-filen");
}

function readZipEntry(zip: Buffer, localOffset: number, compressedSize: number, method: number) {
	if (zip.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("Ugyldig DOCX-entry");
	const nameLength = zip.readUInt16LE(localOffset + 26);
	const extraLength = zip.readUInt16LE(localOffset + 28);
	const data = zip.subarray(localOffset + 30 + nameLength + extraLength, localOffset + 30 + nameLength + extraLength + compressedSize);
	if (method === 0) return data;
	if (method === 8) return inflateRawSync(data);
	throw new Error("DOCX-komprimering støttes ikke");
}

function extractDocxRows(xml: string) {
	return Array.from(xml.matchAll(/<w:tr[\s\S]*?<\/w:tr>/g)).map((row) => Array.from(row[0].matchAll(/<w:tc[\s\S]*?<\/w:tc>/g)).map((cell) => extractText(cell[0])).filter(Boolean));
}

function extractText(xml: string) {
	return Array.from(xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)).map((match) => decodeXml(match[1])).join("").replace(/\s+/g, " ").trim();
}

function decodeXml(value: string) {
	return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

function extractLastNumber(value: string) {
	const matches = value.match(/[0-9]+/g);
	return matches?.at(-1) ?? "";
}

function extractAfter(value: string, start: RegExp) {
	const parts = value.split(start);
	return (parts[1] ?? "").trim();
}

function extractBetween(value: string, start: RegExp, end: RegExp) {
	const after = extractAfter(value, start);
	return after.split(end)[0]?.trim() ?? "";
}

function extractRequester(value: string) {
	const text = value.replace(/^Rekvirent\s*\/?\s*attestant\s*:/i, "").trim();
	return extractBetween(text, /Navn\s*:/i, /\bBID\s*:/i) || text.replace(/\bBID\s*:.*/i, "").replace(/^Navn\s*:/i, "").trim();
}

function extractBid(value: string) {
	return extractAfter(value, /\bBID\s*:/i).match(/[A-Za-z0-9_-]+/)?.[0] ?? "";
}

function normalizedSubject(subject: string | null | undefined) {
	return (subject ?? "").trim().replace(/^((re|fw|sv|vs):\s*)+/i, "").toLocaleLowerCase("nb-NO");
}

function findSignatureBackwards(buffer: Buffer, signature: number) {
	for (let index = buffer.length - 4; index >= 0; index -= 1) {
		if (buffer.readUInt32LE(index) === signature) return index;
	}
	return -1;
}