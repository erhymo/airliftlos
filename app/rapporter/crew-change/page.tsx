"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
	CREW_CHANGE_REASONS,
	CREW_CHANGE_REASON_LABELS,
	DISPENSATION_END_ISO,
	DISPENSATION_START_ISO,
	type CrewChangeEvent,
	type CrewChangeReason,
} from "../../../lib/crewChangeEvents";
import { EventTimeline } from "./EventTimeline";

type StatsResponse = { ok?: boolean; events?: CrewChangeEvent[]; error?: string };

function reasonCounts(events: CrewChangeEvent[]): Record<CrewChangeReason, number> {
	const counts = Object.fromEntries(CREW_CHANGE_REASONS.map((reason) => [reason, 0])) as Record<CrewChangeReason, number>;
	for (const event of events) {
		for (const reason of event.reasons ?? []) counts[reason] += 1;
	}
	return counts;
}

function formatDateTime(ms: number) {
	return new Date(ms).toLocaleString("nb-NO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function CrewChangeReportPage() {
	const [password, setPassword] = useState("");
	const [events, setEvents] = useState<CrewChangeEvent[] | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleUnlock(event: React.FormEvent) {
		event.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const res = await fetch("/api/crew-change/stats", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ password }),
			});
			const data = (await res.json().catch(() => ({}))) as StatsResponse;
			if (!res.ok || !data.ok) throw new Error(data.error || "Feil passord.");
			setEvents(data.events ?? []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Feil passord.");
		} finally {
			setLoading(false);
			setPassword("");
		}
	}

	if (!events) {
		return (
			<div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4">
				<main className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
					<header className="space-y-1">
						<h1 className="text-lg font-semibold">Crew Change – rapport</h1>
						<p className="text-sm text-gray-600">Skriv inn passord for å se statistikk.</p>
					</header>
					<form onSubmit={handleUnlock} className="space-y-3">
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							autoComplete="off"
							placeholder="Passord"
							className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900"
						/>
						{error && <p className="text-sm text-red-600">{error}</p>}
						<button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 py-2.5 text-base font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">
							{loading ? "Sjekker..." : "Lås opp"}
						</button>
					</form>
					<Link href="/" className="block text-center text-sm text-gray-500 underline">Tilbake til forsiden</Link>
				</main>
			</div>
		);
	}

	return <CrewChangeStatsDashboard events={events} />;
}

function CrewChangeStatsDashboard({ events }: { events: CrewChangeEvent[] }) {
	const [monthFilter, setMonthFilter] = useState("");

	const filteredEvents = useMemo(() => {
		if (!monthFilter) return events;
		return events.filter((e) => new Date(e.createdAt).toISOString().slice(0, 7) === monthFilter);
	}, [events, monthFilter]);

	const completed = filteredEvents.filter((e) => e.outcome === "completed");
	const postponed = filteredEvents.filter((e) => e.outcome === "postponed");
	const cancelled = filteredEvents.filter((e) => e.outcome === "cancelled");
	const postponedReasons = reasonCounts(postponed);
	const cancelledReasons = reasonCounts(cancelled);
	const incidents = [...postponed, ...cancelled].sort((a, b) => b.createdAt - a.createdAt);
	// Tidslinjen skal alltid vise hele dispensasjonsperioden, uavhengig av månedsfilteret over.
	const allIncidents = useMemo(
		() => events.filter((e) => e.outcome === "postponed" || e.outcome === "cancelled"),
		[events],
	);

	const periodLabel = monthFilter
		? new Date(`${monthFilter}-01`).toLocaleDateString("nb-NO", { month: "long", year: "numeric" })
		: "Hele dispensasjonsperioden";

	async function handleExportPdf() {
		const { buildCrewChangeReportPdf } = await import("./buildReportPdf");
		const bytes = await buildCrewChangeReportPdf({
			periodLabel,
			total: filteredEvents.length,
			completedCount: completed.length,
			postponedCount: postponed.length,
			cancelledCount: cancelled.length,
			postponedReasons,
			cancelledReasons,
			incidents,
		});
		const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Crew-change-rapport-${monthFilter || "hele-perioden"}.pdf`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}

	return (
		<div className="min-h-screen bg-gray-50 text-gray-900 p-3 sm:p-4">
			<main className="mx-auto w-full max-w-2xl space-y-4">
				<header className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<div className="flex items-center justify-between gap-3">
						<h1 className="text-lg font-semibold">Crew Change – rapport</h1>
						<Link href="/" className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50">Forsiden</Link>
					</div>
					<p className="mt-1 text-xs text-gray-500">Dispensasjon 25/34384-7 – gjelder {new Date(DISPENSATION_START_ISO).toLocaleDateString("nb-NO")} til {new Date(DISPENSATION_END_ISO).toLocaleDateString("nb-NO")}.</p>
				</header>

				<section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
					<div className="flex flex-wrap items-center gap-2">
						<label className="text-sm font-medium text-gray-700">Periode:</label>
						<input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900" />
						{monthFilter && (
							<button type="button" onClick={() => setMonthFilter("")} className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
								Hele perioden
							</button>
						)}
					</div>

					<div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-4">
						<Stat label="Totalt" value={filteredEvents.length} />
						<Stat label="Gjennomført" value={completed.length} />
						<Stat label="Utsatt" value={postponed.length} />
						<Stat label="Kansellert" value={cancelled.length} />
					</div>

					<button type="button" onClick={handleExportPdf} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
						Eksporter PDF-rapport
					</button>
				</section>

				<EventTimeline incidents={allIncidents} />

				<ReasonBarChart title="Utsatt – årsak" counts={postponedReasons} color="#d97706" />
				<ReasonBarChart title="Kansellert – årsak" counts={cancelledReasons} color="#dc2626" />

				<section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<h2 className="mb-3 text-sm font-semibold text-gray-900">Enkelthendelser (utsatt/kansellert)</h2>
					{incidents.length === 0 && <p className="text-sm text-gray-500">Ingen registrerte hendelser i denne perioden.</p>}
					<div className="space-y-3">
						{incidents.map((incident) => (
							<IncidentRow key={incident.id} incident={incident} />
						))}
					</div>
				</section>
			</main>
		</div>
	);
}

function Stat({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-lg bg-gray-50 p-3 text-center">
			<div className="text-2xl font-semibold text-gray-900">{value}</div>
			<div className="text-xs font-medium text-gray-500">{label}</div>
		</div>
	);
}

function ReasonBarChart({ title, counts, color }: { title: string; counts: Record<CrewChangeReason, number>; color: string }) {
	const max = Math.max(1, ...Object.values(counts));
	return (
		<section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
			<h2 className="mb-3 text-sm font-semibold text-gray-900">{title}</h2>
			<div className="space-y-2">
				{CREW_CHANGE_REASONS.map((reason) => (
					<div key={reason} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-2 text-xs">
						<span className="text-gray-600">{CREW_CHANGE_REASON_LABELS[reason]}</span>
						<div className="h-2 overflow-hidden rounded-full bg-gray-200">
							<div className="h-full rounded-full" style={{ width: `${(counts[reason] / max) * 100}%`, background: color }} />
						</div>
						<span className="text-right font-medium text-gray-700">{counts[reason]}</span>
					</div>
				))}
			</div>
		</section>
	);
}

function IncidentRow({ incident }: { incident: CrewChangeEvent }) {
	const [open, setOpen] = useState(false);
	const outcomeLabel = incident.outcome === "cancelled" ? "Kansellert" : "Utsatt";
	const outcomeColor = incident.outcome === "cancelled" ? "text-red-700" : "text-amber-700";
	return (
		<div className="rounded-lg border border-gray-200 p-3">
			<button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
				<div>
					<span className={`text-sm font-semibold ${outcomeColor}`}>{outcomeLabel}</span>
					<span className="ml-2 text-sm text-gray-700">{incident.base}</span>
					<span className="ml-2 text-xs text-gray-500">{formatDateTime(incident.createdAt)}</span>
				</div>
				<span className="text-xs text-gray-400">{open ? "Skjul" : "Vis vær"}</span>
			</button>
			<p className="mt-1 text-xs text-gray-600">{(incident.reasons ?? []).map((r) => CREW_CHANGE_REASON_LABELS[r]).join(", ")}</p>
			{incident.comment && <p className="mt-1 text-xs text-gray-500">«{incident.comment}»</p>}
			{open && (
				<div className="mt-2 space-y-1 rounded-md bg-gray-50 p-2 text-xs text-gray-700">
					<p className="font-medium text-gray-500">METAR</p>
					{(incident.weather?.metar ?? []).length > 0 ? incident.weather!.metar.map((line, i) => <p key={i} className="font-mono">{line}</p>) : <p>Ingen data</p>}
					<p className="mt-1 font-medium text-gray-500">TAF</p>
					{(incident.weather?.taf ?? []).length > 0 ? incident.weather!.taf.map((line, i) => <p key={i} className="font-mono">{line}</p>) : <p>Ingen data</p>}
				</div>
			)}
		</div>
	);
}
