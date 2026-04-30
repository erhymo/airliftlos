import { NextResponse } from "next/server";
import { requireApiAccess } from "../../../../../lib/apiAccess";
import { getDb } from "../../../../../lib/firebaseAdmin";

export const runtime = "nodejs";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Des"];

type UtmeldingArchiveDoc = {
	id?: string;
	base?: unknown;
	date?: unknown;
	time?: unknown;
	reason?: unknown;
	durationText?: unknown;
	durationHours?: unknown;
	sender?: unknown;
	createdAt?: unknown;
};

function asString(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function cleanYear(value: string | null) {
	const year = Number(value);
	const currentYear = new Date().getFullYear();
	return Number.isInteger(year) && year >= 2020 && year <= currentYear + 1 ? year : currentYear;
}

function formatDisplayDate(date: string, time: string) {
	const match = date.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
	const formattedDate = match ? `${match[3]}.${match[2]}.${match[1]}` : date || "-";
	return time ? `${formattedDate} kl. ${time}` : formattedDate;
}

function stripCrewCode(value: string) {
	return value.replace(/\s*\([^()]+\)\s*$/, "").trim();
}

export async function GET(req: Request) {
	const accessError = await requireApiAccess();
	if (accessError) return accessError;

	const year = cleanYear(new URL(req.url).searchParams.get("year"));
	const months = MONTH_LABELS.map((label, index) => ({ month: index + 1, label, total: 0, tromso: 0, hammerfest: 0 }));
	const byReason: Record<string, number> = {};
	const recent: Array<{ id: string; dateTime: string; base: string; reason: string; duration: string; sender: string; sortKey: number }> = [];

	try {
		const snapshot = await getDb().collection("policeUtmeldinger").get();
		snapshot.forEach((doc) => {
			const data = doc.data() as UtmeldingArchiveDoc;
			const date = asString(data.date);
			if (!date.startsWith(`${year}-`)) return;

			const month = Number(date.slice(5, 7));
			const monthStat = months[month - 1];
			if (!monthStat) return;

			const base = asString(data.base) || "Tromsø";
			const reason = asString(data.reason) || "Ukjent";
			const duration = asString(data.durationText) || (asNumber(data.durationHours) ? `${asNumber(data.durationHours)} timer` : "-");
			const sender = stripCrewCode(asString(data.sender)) || "-";
			const time = asString(data.time);
			const createdAt = asNumber(data.createdAt);

			monthStat.total += 1;
			if (base === "Hammerfest") monthStat.hammerfest += 1;
			else monthStat.tromso += 1;
			byReason[reason] = (byReason[reason] ?? 0) + 1;

			recent.push({
				id: doc.id,
				dateTime: formatDisplayDate(date, time),
				base,
				reason,
				duration,
				sender,
				sortKey: createdAt || new Date(`${date}T${time || "00:00"}`).getTime() || 0,
			});
		});

		recent.sort((a, b) => b.sortKey - a.sortKey);
		return NextResponse.json({
			ok: true,
			year,
			total: months.reduce((sum, month) => sum + month.total, 0),
			months,
			byReason: Object.entries(byReason).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason, "nb-NO")),
			recent: recent.slice(0, 20).map((item) => ({ id: item.id, dateTime: item.dateTime, base: item.base, reason: item.reason, duration: item.duration, sender: item.sender })),
		});
	} catch (error) {
		console.error("Politiet utmelding arkiv: klarte ikke å hente statistikk", error);
		return NextResponse.json({ error: "Klarte ikke å hente utmelding-statistikk" }, { status: 500 });
	}
}