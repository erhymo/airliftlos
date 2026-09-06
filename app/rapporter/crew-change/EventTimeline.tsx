"use client";

import { CREW_CHANGE_REASONS, CREW_CHANGE_REASON_LABELS, type CrewChangeEvent, type CrewChangeReason } from "../../../lib/crewChangeEvents";

// Aksen dekker hele dispensasjonsperioden: 3.9.2026 til 1.5.2027.
const TIMELINE_START_MS = Date.UTC(2026, 8, 3); // 3. september 2026
const TIMELINE_END_MS = Date.UTC(2027, 4, 1); // 1. mai 2027

const REASON_COLORS: Record<CrewChangeReason, string> = {
	ising: "#2563eb",
	lyn: "#ca8a04",
	vind: "#16a34a",
	bolger: "#0891b2",
	sikt: "#7c3aed",
	annet: "#6b7280",
};

const MONTH_TICKS = Array.from({ length: 9 }, (_, i) => {
	const monthIndex0 = 8 + i; // 8 = september (0-indeksert)
	const year = 2026 + Math.floor(monthIndex0 / 12);
	const month = monthIndex0 % 12;
	const label = new Date(Date.UTC(year, month, 1)).toLocaleDateString("nb-NO", { month: "short" });
	return { label, ms: Date.UTC(year, month, 1) };
});

function percentForDate(ms: number) {
	const clamped = Math.min(TIMELINE_END_MS, Math.max(TIMELINE_START_MS, ms));
	return ((clamped - TIMELINE_START_MS) / (TIMELINE_END_MS - TIMELINE_START_MS)) * 100;
}

const LABEL_COLUMN = "8rem";

export function EventTimeline({ incidents }: { incidents: CrewChangeEvent[] }) {
	return (
		<section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
			<h2 className="text-sm font-semibold text-gray-900">Hendelser over tid</h2>
			<p className="mb-3 text-xs text-gray-500">3. sep. 2026 – 1. mai 2027. Fylt prikk = kansellert, ring = utsatt.</p>

			<div className="space-y-2.5">
				{CREW_CHANGE_REASONS.map((reason) => {
					const reasonIncidents = incidents.filter((incident) => (incident.reasons ?? []).includes(reason));
					return (
						<div key={reason} className="flex items-center gap-2">
							<span className="shrink-0 text-xs font-medium text-gray-600" style={{ width: LABEL_COLUMN }}>
								{CREW_CHANGE_REASON_LABELS[reason]}
							</span>
							<div className="relative h-4 flex-1 rounded-full bg-gray-100">
								{reasonIncidents.map((incident) => (
									<span
										key={incident.id}
										title={`${new Date(incident.createdAt).toLocaleDateString("nb-NO")} – ${incident.base} – ${incident.outcome === "cancelled" ? "Kansellert" : "Utsatt"}`}
										className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
										style={{
											left: `${percentForDate(incident.createdAt)}%`,
											borderColor: REASON_COLORS[reason],
											background: incident.outcome === "cancelled" ? REASON_COLORS[reason] : "white",
										}}
									/>
								))}
							</div>
						</div>
					);
				})}
			</div>

			<div className="mt-1 flex items-center gap-2">
				<span className="shrink-0" style={{ width: LABEL_COLUMN }} />
				<div className="relative h-4 flex-1">
					{MONTH_TICKS.map((tick) => (
						<span
							key={tick.label}
							className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] text-gray-400"
							style={{ left: `${percentForDate(tick.ms)}%` }}
						>
							{tick.label}
						</span>
					))}
				</div>
			</div>
		</section>
	);
}
