import { NextResponse } from "next/server";
import { requireApiAccess } from "../../../../../lib/apiAccess";
import { getDb } from "../../../../../lib/firebaseAdmin";
import { getPoliceLiveSettings, recordIsAfterPoliceLiveStart } from "../../../../../lib/policeLiveSettings";

export const runtime = "nodejs";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Des"];

type ReportDoc = {
	id?: unknown;
	reportType?: unknown;
	base?: unknown;
	date?: unknown;
	reporter?: unknown;
	missionNumber?: unknown;
	durationText?: unknown;
	conditions?: unknown;
	crew?: unknown;
	helicopter?: unknown;
	pins?: unknown;
	trainingTypes?: unknown;
	involvedAgencies?: unknown;
	result?: unknown;
	description?: unknown;
	lessonsLearned?: unknown;
	followUp?: unknown;
	safetyNotes?: unknown;
	fileName?: unknown;
	createdAt?: unknown;
	delivery?: unknown;
};

function asString(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asStringArray(value: unknown) {
	return Array.isArray(value) ? value.map(asString).filter(Boolean) : [];
}

function asPins(value: unknown) {
	if (!Array.isArray(value)) return [];
	return value.flatMap((pin) => {
		if (!pin || typeof pin !== "object") return [];
		const data = pin as { lat?: unknown; lng?: unknown; type?: unknown; label?: unknown };
		const lat = asNumber(data.lat);
		const lng = asNumber(data.lng);
		if (!lat || !lng) return [];
		return [{ lat, lng, type: asString(data.type) || "trainingArea", label: asString(data.label) }];
	});
}

function cleanYear(value: string | null) {
	const year = Number(value);
	const currentYear = new Date().getFullYear();
	return Number.isInteger(year) && year >= 2020 && year <= currentYear + 1 ? year : currentYear;
}

function addCount(target: Record<string, number>, key: string) {
	const clean = key || "Ukjent";
	target[clean] = (target[clean] ?? 0) + 1;
}

function toCountArray(record: Record<string, number>) {
	return Object.entries(record).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "nb-NO"));
}

export async function GET(req: Request) {
	const accessError = await requireApiAccess();
	if (accessError) return accessError;

	const year = cleanYear(new URL(req.url).searchParams.get("year"));
	const liveSettings = await getPoliceLiveSettings();
	const months = MONTH_LABELS.map((label, index) => ({ month: index + 1, label, total: 0, training: 0, mission: 0 }));
	const byBase: Record<string, number> = {};
	const byHelicopter: Record<string, number> = {};
	const byTrainingType: Record<string, number> = {};
	const reports: Array<Record<string, unknown> & { sortKey: number; reportType: "training" | "mission" }> = [];

	try {
		const snapshot = await getDb().collection("policeReports").get();
		snapshot.forEach((doc) => {
			const data = doc.data() as ReportDoc;
			const date = asString(data.date);
			if (!date.startsWith(`${year}-`)) return;
			if (!recordIsAfterPoliceLiveStart(liveSettings, { createdAt: data.createdAt, date })) return;

			const monthStat = months[Number(date.slice(5, 7)) - 1];
			if (!monthStat) return;

			const reportType = asString(data.reportType) === "mission" ? "mission" : "training";
			const base = asString(data.base) || "Tromsø";
			const helicopter = asString(data.helicopter) || "Ukjent";
			const trainingTypes = asStringArray(data.trainingTypes);
			const createdAt = asNumber(data.createdAt);

			monthStat.total += 1;
			monthStat[reportType] += 1;
			addCount(byBase, base);
			addCount(byHelicopter, helicopter);
			if (reportType === "training") trainingTypes.forEach((type) => addCount(byTrainingType, type));

			reports.push({
				id: doc.id,
				reportType,
				date,
				base,
				reporter: asString(data.reporter),
				missionNumber: asString(data.missionNumber),
				durationText: asString(data.durationText),
				conditions: asString(data.conditions),
				crew: asStringArray(data.crew),
				helicopter,
				pins: asPins(data.pins),
				trainingTypes,
				involvedAgencies: asString(data.involvedAgencies),
				result: asString(data.result),
				description: asString(data.description),
				lessonsLearned: asString(data.lessonsLearned),
				followUp: asString(data.followUp),
				safetyNotes: asString(data.safetyNotes),
				fileName: asString(data.fileName),
				delivery: data.delivery ?? null,
				sortKey: createdAt || new Date(`${date}T00:00:00`).getTime() || 0,
			});
		});

		reports.sort((a, b) => b.sortKey - a.sortKey);
		const reportItems = reports.slice(0, 200).map((item) => {
			const clone: Record<string, unknown> = { ...item };
			delete clone.sortKey;
			return clone;
		});
		return NextResponse.json({
			ok: true,
			year,
			live: liveSettings,
			total: reports.length,
			trainingTotal: reports.filter((item) => item.reportType === "training").length,
			missionTotal: reports.filter((item) => item.reportType === "mission").length,
			months,
			byBase: toCountArray(byBase),
			byHelicopter: toCountArray(byHelicopter),
			byTrainingType: toCountArray(byTrainingType),
			reports: reportItems,
		});
	} catch (error) {
		console.error("Politiet rapportarkiv: klarte ikke å hente statistikk", error);
		return NextResponse.json({ error: "Klarte ikke å hente rapportstatistikk" }, { status: 500 });
	}
}