import Link from "next/link";
import { getDb } from "../../../lib/firebaseAdmin";

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

function formatDisplayDate(isoDate: string): string {
	const d = new Date(isoDate);
	if (Number.isNaN(d.getTime())) return isoDate;
	return d.toLocaleDateString("nb-NO");
}

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
		if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
		const year = Number.parseInt(iso.slice(0, 4), 10);
		const monthIndex = Number.parseInt(iso.slice(5, 7), 10) - 1;
		if (Number.isNaN(year) || monthIndex < 0 || monthIndex > 11) continue;

		const key = `${iso.slice(0, 7)}`; // YYYY-MM
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

	const now = new Date();
	const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	let selectedKey: string | undefined;
	if (monthParam && monthMap.has(monthParam)) {
		selectedKey = monthParam;
	} else if (monthMap.has(currentKey)) {
		selectedKey = currentKey;
	} else if (monthGroups.length > 0) {
		selectedKey = monthGroups[0].key;
	}

	const selectedGroup = selectedKey ? monthMap.get(selectedKey) ?? null : null;
	const selectedRows = selectedGroup ? [...selectedGroup.rows].sort((a, b) => b.date.localeCompare(a.date)) : [];

	return (
		<div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4">
			<main className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
				<header className="space-y-1">
					<div className="flex items-center justify-between gap-2">
						<h1 className="text-lg font-semibold">LOS-logg - arkiv</h1>
						<Link
							href="/loslogg"
							className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
						>
							Åpne bestillinger
						</Link>
					</div>
					<p className="text-sm text-gray-600">
						Her ser du fullførte LOS-oppdrag per måned. Datoen er dagen oppdraget ble gjennomført.
					</p>
				</header>

				{monthGroups.length === 0 ? (
					<p className="text-sm text-gray-600">
						Ingen fullførte LOS-oppdrag i arkivet ennå.
					</p>
				) : (
					<section className="space-y-3">
						<div className="flex items-center justify-between gap-2">
							<h2 className="text-sm font-medium text-gray-700">
								Arkiv for {selectedGroup?.label ?? "ønsket måned"}
							</h2>
							<div className="flex flex-wrap justify-end gap-1">
								{monthGroups.map((group) => {
									const isActive = group.key === selectedKey;
									return (
										<Link
											key={group.key}
											href={`/loslogg/arkiv?month=${group.key}`}
											className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium ${isActive ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
										>
											{group.label}
										</Link>
									);
								})}
							</div>
						</div>

						{selectedRows.length === 0 ? (
							<p className="text-xs text-gray-500">Ingen LOS-oppdrag funnet for valgt måned.</p>
						) : (
							<>
								<div className="overflow-x-auto rounded-md border border-gray-200">
									<table className="min-w-full divide-y divide-gray-200 text-xs">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-2 py-1.5 text-left font-semibold text-gray-700">Dato</th>
												<th className="px-2 py-1.5 text-left font-semibold text-gray-700">
													Ordrenr.
												</th>
												<th className="px-2 py-1.5 text-left font-semibold text-gray-700">
													Techlog
												</th>
												<th className="px-2 py-1.5 text-left font-semibold text-gray-700">
													Fartøy
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-gray-100 bg-white">
											{selectedRows.map((row) => (
												<tr key={row.id}>
													<td className="px-2 py-1.5 text-gray-900">
														{formatDisplayDate(row.date)}
													</td>
												<td className="px-2 py-1.5 text-gray-900">
													{row.orderNumber || "-"}
												</td>
												<td className="px-2 py-1.5 text-gray-900">
													{row.techlogNumber || "-"}
												</td>
													<td className="px-2 py-1.5 text-gray-900">
														{row.vesselName}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
								<details className="mt-3 rounded-md border border-gray-200 bg-white">
									<summary className="cursor-pointer select-none px-3 py-1.5 text-xs font-medium text-blue-700">
										Vis alle detaljer
									</summary>
									<div className="mt-2 max-h-64 overflow-y-auto border-t border-gray-100">
										<div className="overflow-x-auto">
											<ul className="divide-y divide-gray-100 font-mono text-[10px] sm:text-xs">
												{selectedRows.map((row) => (
													<li
														key={row.id}
														className="whitespace-nowrap px-2 py-1"
													>
														{row.details ?? "Detaljer ikke tilgjengelig for denne raden."}
													</li>
												))}
											</ul>
										</div>
									</div>
								</details>
							</>
						)}
					</section>
				)}

				<div className="pt-2">
					<Link
						href="/"
						className="text-sm text-blue-600 hover:text-blue-700 underline"
					>
						Tilbake til forsiden
					</Link>
				</div>
			</main>
		</div>
	);
}
