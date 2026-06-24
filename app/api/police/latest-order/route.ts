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
	"@odata.type"?: string;
	name?: string | null;
	contentType?: string | null;
	contentBytes?: string | null;
};

const MAILBOX = "politiberedskap@airlift.no";
const SUBJECT_PREFIX = "airlift bestilling";

export async function GET() {
	const accessError = await requireApiAccess();
	if (accessError) return accessError;

	try {
		const token = await getGraphAccessToken();
		if (!token) return NextResponse.json({ ok: false, error: "Fikk ikke access token fra Microsoft Graph" }, { status: 500 });

		const message = await findLatestPoliceOrderMessage(token);
		if (!message) return NextResponse.json({ ok: false, error: "Fant ingen ny Politiet-bestilling." }, { status: 404 });

		const attachment = await findDocxAttachment(token, message.id);
		if (!attachment?.contentBytes) return NextResponse.json({ ok: false, error: "Fant ingen DOCX-bestilling i siste e-post." }, { status: 404 });

		const docx = Buffer.from(attachment.contentBytes, "base64");
		const parsed = parsePoliceOrderDocx(docx);
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
	} catch {
		return NextResponse.json({ ok: false, error: "Klarte ikke å hente eller lese siste bestilling fra Politiet." }, { status: 500 });
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
	const url = new URL(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(MAILBOX)}/mailFolders/Inbox/messages`);
	url.search = new URLSearchParams({ $top: "25", $orderby: "receivedDateTime desc", $select: "id,subject,receivedDateTime,from,hasAttachments" }).toString();
	const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
	if (!res.ok) throw new Error("Klarte ikke å hente e-post fra Politiet-postboksen");
	const data = (await res.json().catch(() => ({}))) as { value?: GraphMessage[] };
	return (data.value ?? []).find((message) => normalizedSubject(message.subject).startsWith(SUBJECT_PREFIX) && message.hasAttachments) ?? null;
}

async function findDocxAttachment(token: string, messageId: string) {
	const url = new URL(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(MAILBOX)}/messages/${encodeURIComponent(messageId)}/attachments`);
	url.search = new URLSearchParams({ $select: "name,contentType,contentBytes" }).toString();
	const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
	if (!res.ok) throw new Error("Klarte ikke å hente vedlegg fra Politiet-bestilling");
	const data = (await res.json().catch(() => ({}))) as { value?: GraphAttachment[] };
	return (data.value ?? []).find((item) => item.contentBytes && (item.name ?? "").toLocaleLowerCase("nb-NO").endsWith(".docx")) ?? null;
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
		if (/PO\s*id\s*:/i.test(label)) poId = extractLastNumber(value);
		if (/Rekvirent\/?attestant\s*:/i.test(label)) {
			requester = extractBetween(value, /Navn\s*:/i, /\bBID\s*:/i) || value.replace(/\bBID\s*:.*/i, "").replace(/^Navn\s*:/i, "").trim();
			bid = extractAfter(value, /\bBID\s*:/i).split(/\s+/)[0] ?? "";
		}
	}

	const text = rows.flat().join("\n");
	return {
		poId: poId || extractLastNumber(extractAfter(text, /PO\s*id\s*:/i)),
		requester: requester || extractBetween(text, /Rekvirent\/?attestant\s*:\s*Navn\s*:/i, /\bBID\s*:/i),
		bid: bid || extractAfter(text, /\bBID\s*:/i).split(/\s+/)[0],
	};
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

function normalizedSubject(subject: string | null | undefined) {
	return (subject ?? "").trim().replace(/^(re|fw|sv):\s*/i, "").toLocaleLowerCase("nb-NO");
}

function findSignatureBackwards(buffer: Buffer, signature: number) {
	for (let index = buffer.length - 4; index >= 0; index -= 1) {
		if (buffer.readUInt32LE(index) === signature) return index;
	}
	return -1;
}