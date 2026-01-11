import { getDb } from "../../../lib/firebaseAdmin";
import LosLoggArchiveClient from "./LosLoggArchiveClient";

export const dynamic = "force-dynamic";

type ArchiveRow = {
	id: string;
	date: string;
	orderNumber: string;
	techlogNumber: string;
	vesselName: string;
		// Sammendragslinje med alle felter som er skrevet til Excel (adminRowData)
		details: string | null;
};

type SearchParams = {
	[key: string]: string | string[] | undefined;
};

	const MONTH_NAMES = [
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

export default async function LosLoggArchivePage({
	searchParams,
}: {
	searchParams?: SearchParams;
}) {
	const monthParamRaw = searchParams?.month;
	const monthParam = Array.isArray(monthParamRaw) ? monthParamRaw[0] : monthParamRaw;
	const db = getDb();

		let rows: ArchiveRow[] = [];
		try {
			const snapshot = await db
				.collection("losBookings")
				.where("status", "==", "closed")
				.get();

			rows = snapshot.docs
				.map((doc) => {
					const data = doc.data() as {
						date?: string | null;
						orderNumber?: string | null;
						techlogNumber?: number | string | null;
						vesselName?: string | null;
						adminRowData?: Record<string, unknown> | null;
					};
					const admin = (data.adminRowData ?? {}) as Record<string, unknown>;

					// Bygg en kompakt tekstlinje som speiler kolonnene som skrives til Excel.
					const parts: string[] = [];

					const excelDate = String(admin.date ?? data.date ?? "");
					const orderNumber = String(
						admin.orderNumber ?? data.orderNumber ?? "",
					);
					const techlogNumberRaw =
						admin.techlogNumber ?? data.techlogNumber ?? "";
					const techlogNumberStr =
						techlogNumberRaw !== undefined && techlogNumberRaw !== null
							? String(techlogNumberRaw)
							: "";
					const vesselName = String(
						admin.vesselName ?? data.vesselName ?? "Ukjent fartøy",
					);
					const sign = String(admin.sign ?? "");
					const gt = admin.gt !== undefined && admin.gt !== null ? String(admin.gt) : "";
					const location = String(admin.location ?? "");
					const losType = String(admin.losType ?? "");
					const hasLos = Boolean((admin.hasLos as boolean | undefined) ?? false);
					const los1 = String(admin.los1 ?? "");
					const los2 = String(admin.los2 ?? "");
					const shipLanding = Boolean(
						(admin.shipLanding as boolean | undefined) ?? false,
					);
					const tokeBomtur = Boolean(
						(admin.tokeBomtur as boolean | undefined) ?? false,
					);
					const losToAirportCount =
						typeof admin.losToAirportCount === "number" &&
						Number.isFinite(admin.losToAirportCount)
							? (admin.losToAirportCount as number)
							: null;
					const enfjLandings =
						typeof admin.enfjLandings === "number" &&
						Number.isFinite(admin.enfjLandings)
							? (admin.enfjLandings as number)
							: null;
					const hoistCount =
						typeof admin.hoistCount === "number" &&
						Number.isFinite(admin.hoistCount)
							? (admin.hoistCount as number)
							: null;
					const comment = admin.comment != null ? String(admin.comment) : "";

					if (sign) parts.push(`Sign: ${sign.toUpperCase()}`);
					if (excelDate) parts.push(`Dato: ${excelDate}`);
					if (orderNumber) parts.push(`Ordre: ${orderNumber}`);
					if (techlogNumberStr) parts.push(`Techlog: ${techlogNumberStr}`);
					if (vesselName) parts.push(`Fartøy: ${vesselName}`);
					if (gt) parts.push(`GT: ${gt}`);
					if (location) parts.push(`Sted: ${location}`);
					if (losType) parts.push(`Type: ${losType}`);
					if (hasLos) {
						parts.push("LOS: 1");
						if (los1) parts.push(`Los 1: ${los1}`);
						if (los2) parts.push(`Los 2: ${los2}`);
					}
					if (shipLanding) parts.push("Ship landing: 1");
					if (tokeBomtur) parts.push("Tåke/bomtur: 1");
					if (losToAirportCount && losToAirportCount > 0)
						parts.push(`LOS til flyplass: ${losToAirportCount}`);
					if (enfjLandings && enfjLandings > 0)
						parts.push(`ENFJ-landinger: ${enfjLandings}`);
					if (hoistCount && hoistCount > 0)
						parts.push(`Hoist: ${hoistCount}`);
					if (comment) parts.push(`Kommentar: ${comment}`);

					const details = parts.length > 0 ? parts.join(" | ") : null;

					return {
						id: doc.id,
						date: data.date ?? "",
						orderNumber,
						techlogNumber: techlogNumberStr,
						vesselName,
						details,
					};
				})
				.filter((row) => typeof row.date === "string" && row.date.length >= 7);
		} catch (error) {
			console.error("LOS-logg arkiv: Klarte ikke å hente lukkede LOS-bookinger", error);
		}

		// Bygg opp månedsliste basert på alle rader
		const monthMap = new Map<
			string,
			{
				key: string;
				year: number;
				monthIndex: number;
				label: string;
				rows: ArchiveRow[];
			}
		>();
		
		for (const row of rows) {
			const iso = row.date;
			// Godta alle datoformater som starter med "YYYY-MM" (med eller uten klokkeslett)
			if (!iso || iso.length < 7) continue;
			const year = Number.parseInt(iso.slice(0, 4), 10);
			const monthIndex = Number.parseInt(iso.slice(5, 7), 10) - 1;
			if (Number.isNaN(year) || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11)
				continue;
		
			const key = iso.slice(0, 7); // YYYY-MM
			if (!monthMap.has(key)) {
				monthMap.set(key, {
					key,
					year,
					monthIndex,
					label: `${MONTH_NAMES[monthIndex]} ${year}`,
					rows: [],
				});
			}
			monthMap.get(key)!.rows.push(row);
		}

	const monthGroups = Array.from(monthMap.values()).sort((a, b) => {
		if (a.year === b.year) return b.monthIndex - a.monthIndex; // nyeste først
		return b.year - a.year;
	});

		let defaultKey: string | null = null;
		// Normaliser måned-parameteren slik at både "YYYY-MM" og "YYYY-MM-DD" fungerer
		if (monthParam) {
			const normalized = monthParam.slice(0, 7);
			if (monthMap.has(normalized)) {
				defaultKey = normalized;
			}
		}
		if (!defaultKey) {
			const now = new Date();
			const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
			if (monthMap.has(currentKey)) {
				defaultKey = currentKey;
			} else if (monthGroups.length > 0) {
				defaultKey = monthGroups[0].key;
			}
		}

		return <LosLoggArchiveClient monthGroups={monthGroups} defaultKey={defaultKey} />;
}
