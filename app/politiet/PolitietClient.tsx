"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_MASKIN, MASKINER, type Maskin } from "../../lib/aviationOptions";
import { CREW_ROLE_LABELS, DEFAULT_CREW_DIRECTORY, formatCrewDirectoryEntry, mergeCrewDirectoryEntries, sortCrewDirectoryEntries, type CrewDirectoryEntry, type CrewRole } from "../../lib/crewDirectory";
import PoliceMapPicker from "./PoliceMapPicker";
import type { ApiSubmitResponse, PolicePin, PoliceReportType, PoliceTab, SubmitStatus } from "./types";

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (days: number) => {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return date.toISOString().slice(0, 10);
};
const nowTime = () => new Date().toTimeString().slice(0, 5);
const WATCH_PHONE_OPTIONS = {
	Tromsø: "Tromsø: 479 04 276",
	Hammerfest: "Hammerfest: 902 06 902",
} as const;
type WatchPhoneBase = keyof typeof WATCH_PHONE_OPTIONS;
const WATCH_PHONE_BASES = Object.keys(WATCH_PHONE_OPTIONS) as WatchPhoneBase[];
const DEFAULT_WATCH_PHONE = WATCH_PHONE_OPTIONS.Tromsø;

const UTMELDING_REASONS = ["Teknisk", "Vær", "Crew", "Operativ begrensning", "Annet"];
const MITIGATING_ACTIONS = ["Tekniker varslet", "Reservecrew vurderes", "Alternativ maskin vurderes", "Operativ begrensning meldt", "Annet"];
const TRAINING_TYPES = ["Politioperativ", "Søk og redning", "Navigasjon", "Nattflyging", "NVG-trening", "Bakkeoperasjoner", "Annet"];
const FIELD_CONTROL_CLASS = "min-w-0 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-base text-gray-900";
const COMPACT_DATE_TIME_CLASS = "min-w-0 w-full appearance-none rounded-lg border border-gray-300 bg-white px-1.5 py-2.5 text-[14px] leading-tight text-gray-900";
const TEXTAREA_CLASS = `${FIELD_CONTROL_CLASS} resize-y`;
const COMPACT_TWO_COLUMN_GRID = "grid grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] gap-1.5";
const CREW_FORM_SEND_ENABLED = true;
const POLICE_LAST_TECHLOG_STORAGE_KEY = "police_mission_last_techlog_number";

type PoliceCrewOptions = { captains: string[]; firstOfficers: string[]; technicians: string[]; all: string[] };

type UtmeldingMonthStat = { month: number; label: string; total: number; tromso: number; hammerfest: number };
type UtmeldingReasonStat = { reason: string; count: number };
type UtmeldingRecentItem = { id: string; dateTime: string; base: string; reason: string; duration: string; sender: string };
type PoliceLiveArchiveSettings = { isLive: boolean; liveFrom: number | null; liveFromIso: string | null };
type UtmeldingArchiveData = { ok?: boolean; year: number; live?: PoliceLiveArchiveSettings; total: number; months: UtmeldingMonthStat[]; byReason: UtmeldingReasonStat[]; recent: UtmeldingRecentItem[]; error?: string };
type ArchiveSection = "utmelding" | "reports";
type CountStat = { label: string; count: number };
type ReportMonthStat = { month: number; label: string; total: number; training: number; mission: number };
type ReportArchiveItem = {
	id: string;
	reportType: PoliceReportType;
	date: string;
	base: string;
	reporter: string;
	missionNumber: string;
	durationText: string;
	conditions: string;
	crew: string[];
	helicopter: string;
	pins: PolicePin[];
	trainingTypes: string[];
	involvedAgencies: string;
	result: string;
	description: string;
	lessonsLearned: string;
	followUp: string;
	safetyNotes: string;
	fileName: string;
};
type ReportArchiveData = { ok?: boolean; year: number; live?: PoliceLiveArchiveSettings; total: number; trainingTotal: number; missionTotal: number; months: ReportMonthStat[]; byBase: CountStat[]; byHelicopter: CountStat[]; byTrainingType: CountStat[]; reports: ReportArchiveItem[]; error?: string };

const PIN_TYPE_LABELS: Record<string, string> = {
	trainingArea: "Treningsområde",
	landingPoint: "Landingspunkt",
	other: "Annet",
};

function reportTypeLabel(type: PoliceReportType) {
	return type === "mission" ? "Mission Report" : "Training Report";
}

function createClientSubmissionId() {
	return `police_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function extractCrewCode(value: string) {
	const match = value.match(/\(([^)]+)\)\s*$/);
	return (match?.[1] || value).trim().toLocaleUpperCase("nb-NO");
}

function minutesBetweenTimes(start: string, end: string) {
	const startMatch = start.match(/^([0-9]{2}):([0-9]{2})$/);
	const endMatch = end.match(/^([0-9]{2}):([0-9]{2})$/);
	if (!startMatch || !endMatch) return null;
	const startMinutes = Number(startMatch[1]) * 60 + Number(startMatch[2]);
	let endMinutes = Number(endMatch[1]) * 60 + Number(endMatch[2]);
	if (endMinutes < startMinutes) endMinutes += 24 * 60;
	return endMinutes - startMinutes;
}

function formatDurationMinutes(minutes: number | null) {
	if (minutes === null || !Number.isFinite(minutes) || minutes < 0) return "";
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return `${hours}:${String(rest).padStart(2, "0")}`;
}

function parseDurationMinutes(value: string) {
	const match = value.trim().match(/^([0-9]+):([0-9]{2})$/);
	if (!match) return null;
	return Number(match[1]) * 60 + Number(match[2]);
}

function hasText(value: string) {
	return value.trim().length > 0;
}

function formatLiveFrom(value: string | null | undefined) {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleString("nb-NO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function displayNamesByRole(entries: CrewDirectoryEntry[], role: CrewRole) {
	return entries.filter((entry) => entry.active && entry.role === role).map(formatCrewDirectoryEntry).filter(Boolean);
}

function buildCrewOptions(entries: CrewDirectoryEntry[]): PoliceCrewOptions {
	const captains = displayNamesByRole(entries, "captain");
	const firstOfficers = Array.from(new Set([...displayNamesByRole(entries, "firstOfficer"), ...captains]));
	const technicians = displayNamesByRole(entries, "technician");
	return {
		captains,
		firstOfficers,
		technicians,
		all: Array.from(new Set([...captains, ...firstOfficers, ...technicians])).sort((a, b) => a.localeCompare(b, "nb-NO")),
	};
}

async function submitJson(path: string, payload: unknown): Promise<ApiSubmitResponse> {
	const res = await fetch(path, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	const data = (await res.json().catch(() => ({}))) as ApiSubmitResponse;
	if (!res.ok || !data.ok) throw new Error(data.error || "Innsending feilet");
	return data;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
	return <label className="mb-1 block text-sm font-medium text-gray-700">{children}</label>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
			<h2 className="mb-4 text-base font-semibold text-gray-900">{title}</h2>
			<div className="space-y-4">{children}</div>
		</section>
	);
}

function StatusMessage({ status }: { status: SubmitStatus }) {
	if (status.type === "idle") return null;
	const colors = status.type === "error" ? "bg-red-50 text-red-800 border-red-200" : status.type === "success" ? "bg-green-50 text-green-800 border-green-200" : "bg-blue-50 text-blue-800 border-blue-200";
	return <div className={`rounded-xl border px-3 py-2 text-sm ${colors}`}>{status.message}</div>;
}

function CrewDirectoryEditor({ entries, onClose, onSaved }: { entries: CrewDirectoryEntry[]; onClose: () => void; onSaved: (entry: CrewDirectoryEntry) => void }) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [fullName, setFullName] = useState("");
	const [code, setCode] = useState("");
	const [phone, setPhone] = useState("");
	const [role, setRole] = useState<CrewRole>("captain");
	const [active, setActive] = useState(true);
	const [status, setStatus] = useState<SubmitStatus>({ type: "idle" });

	function startNew() {
		setEditingId(null);
		setFullName("");
		setCode("");
		setPhone("");
		setRole("captain");
		setActive(true);
		setStatus({ type: "idle" });
	}

	function startEdit(entry: CrewDirectoryEntry) {
		setEditingId(entry.id);
		setFullName(entry.fullName);
		setCode(entry.code);
		setPhone(entry.phone ?? "");
		setRole(entry.role);
		setActive(entry.active);
		setStatus({ type: "idle" });
	}

	async function handleSave(event: React.FormEvent) {
		event.preventDefault();
		if (!code.trim()) {
			setStatus({ type: "error", message: "Crew-kode må fylles ut." });
			return;
		}

		setStatus({ type: "sending", message: "Lagrer person..." });
		try {
			const res = await fetch("/api/crew-directory", {
				method: editingId ? "PATCH" : "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: editingId, fullName, code, phone, role, active }),
			});
			const data = (await res.json().catch(() => ({}))) as { error?: string; entry?: CrewDirectoryEntry };
			if (!res.ok || !data.entry) throw new Error(data.error || "Klarte ikke å lagre person.");
			onSaved(data.entry);
			setEditingId(data.entry.id);
			setStatus({ type: "success", message: "Person lagret." });
		} catch (error) {
			setStatus({ type: "error", message: (error as Error).message });
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
			<div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-4 shadow-lg">
				<div className="flex items-start justify-between gap-3">
					<div>
						<h2 className="text-lg font-semibold text-gray-900">Rediger crew-liste</h2>
						<p className="text-sm text-gray-600">Listen brukes av Politiet og Vaktrapport. Deaktiver personer som ikke skal vises.</p>
					</div>
					<button type="button" onClick={onClose} className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-700">Lukk</button>
				</div>

				<form onSubmit={handleSave} className="mt-4 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-3">
					<div className="flex items-center justify-between gap-2">
						<h3 className="text-sm font-semibold text-gray-900">{editingId ? "Rediger person" : "Legg til person"}</h3>
						<button type="button" onClick={startNew} className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700">Ny person</button>
					</div>
					<div><FieldLabel>Fullt navn</FieldLabel><input value={fullName} onChange={(e) => setFullName(e.target.value)} className={FIELD_CONTROL_CLASS} placeholder="F.eks. Tom Østrem" /></div>
					<div><FieldLabel>Telefon</FieldLabel><input value={phone} onChange={(e) => setPhone(e.target.value)} className={FIELD_CONTROL_CLASS} placeholder="F.eks. 98623414" inputMode="tel" /></div>
					<div className="grid grid-cols-[1fr_1.4fr] gap-2">
						<div><FieldLabel>Crew-kode</FieldLabel><input value={code} onChange={(e) => setCode(e.target.value.toLocaleUpperCase("nb-NO"))} className={FIELD_CONTROL_CLASS} placeholder="ØST" /></div>
						<div><FieldLabel>Rolle</FieldLabel><select value={role} onChange={(e) => setRole(e.target.value as CrewRole)} className={FIELD_CONTROL_CLASS}>{Object.entries(CREW_ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
					</div>
					<label className="flex items-center gap-2 text-sm text-gray-800"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Aktiv i dropdowns</label>
					<StatusMessage status={status} />
					<button type="submit" disabled={status.type === "sending"} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-60">Lagre</button>
				</form>

				<div className="mt-4 space-y-2">
					{entries.map((entry) => (
						<button key={entry.id} type="button" onClick={() => startEdit(entry)} className={`w-full rounded-xl border p-3 text-left text-sm ${entry.active ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-100 text-gray-500"}`}>
							<div className="font-medium text-gray-900">{formatCrewDirectoryEntry(entry) || entry.code}</div>
							<div className="text-xs text-gray-600">{CREW_ROLE_LABELS[entry.role]}{entry.active ? "" : " · deaktivert"}</div>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}

function CountList({ items, emptyText }: { items: CountStat[]; emptyText: string }) {
	return (
		<div className="mt-3 space-y-2 text-sm">
			{items.length === 0 && <div className="text-gray-500">{emptyText}</div>}
			{items.map((item) => <div key={item.label} className="flex justify-between gap-3"><span className="text-gray-700">{item.label}</span><span className="font-medium text-gray-900">{item.count}</span></div>)}
		</div>
	);
}

function ReportDetail({ report, onBack }: { report: ReportArchiveItem; onBack: () => void }) {
	return (
		<section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
			<button type="button" onClick={onBack} className="mb-3 rounded-full border border-blue-200 bg-white px-3 py-1 text-sm text-blue-900">Tilbake til rapportliste</button>
			<h3 className="text-base font-semibold text-gray-950">{reportTypeLabel(report.reportType)} · {report.date}</h3>
			<div className="mt-3 space-y-2 text-sm text-gray-800">
				<div><strong>Base:</strong> {report.base || "-"}</div>
				<div><strong>Helikopter:</strong> {report.helicopter || "-"}</div>
				<div><strong>Rapportskriver:</strong> {report.reporter || "-"}</div>
				<div><strong>Crew:</strong> {report.crew.length ? report.crew.join(", ") : "-"}</div>
				{report.reportType === "mission" && <div><strong>Oppdragsnummer:</strong> {report.missionNumber || "-"}</div>}
				{report.reportType === "training" && <div><strong>Treningstyper:</strong> {report.trainingTypes.length ? report.trainingTypes.join(", ") : "-"}</div>}
				<div><strong>Varighet:</strong> {report.durationText || "-"}</div>
				<div><strong>Vær/forhold:</strong> {report.conditions || "-"}</div>
				{report.reportType === "mission" && <div><strong>Involverte etater:</strong> {report.involvedAgencies || "-"}</div>}
				{report.reportType === "mission" && <div><strong>Resultat/utfall:</strong> {report.result || "-"}</div>}
				{report.reportType === "mission" && <div><strong>Sikkerhetsmomenter:</strong> {report.safetyNotes || "-"}</div>}
				<div><strong>Beskrivelse:</strong><br />{report.description || "-"}</div>
				<div><strong>Lessons learned:</strong><br />{report.lessonsLearned || "-"}</div>
				<div><strong>Tiltak/oppfølging:</strong><br />{report.followUp || "-"}</div>
				<div><strong>Kartpunkter:</strong> {report.pins.length}</div>
				{report.pins.map((pin, index) => <div key={`${pin.lat}-${pin.lng}-${index}`} className="rounded-xl bg-white/80 p-2 text-xs">{index + 1}. {PIN_TYPE_LABELS[pin.type || "trainingArea"] || "Kartpunkt"}{pin.label ? ` - ${pin.label}` : ""}: {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</div>)}
			</div>
		</section>
	);
}

function PoliceArchiveModal({ onClose }: { onClose: () => void }) {
	const currentYear = new Date().getFullYear();
	const [year, setYear] = useState(currentYear);
	const [section, setSection] = useState<ArchiveSection>("utmelding");
	const [utmeldingData, setUtmeldingData] = useState<UtmeldingArchiveData | null>(null);
	const [reportData, setReportData] = useState<ReportArchiveData | null>(null);
	const [utmeldingStatus, setUtmeldingStatus] = useState<SubmitStatus>({ type: "sending", message: "Henter arkiv..." });
	const [reportStatus, setReportStatus] = useState<SubmitStatus>({ type: "sending", message: "Henter rapportarkiv..." });
	const [selectedReport, setSelectedReport] = useState<ReportArchiveItem | null>(null);

	useEffect(() => {
		let cancelled = false;
		fetch(`/api/police/utmelding/archive?year=${year}`)
			.then((res) => res.json().then((json) => ({ ok: res.ok, json })))
			.then(({ ok, json }: { ok: boolean; json: UtmeldingArchiveData }) => {
				if (cancelled) return;
				if (!ok || !json.ok) throw new Error(json.error || "Klarte ikke å hente arkiv.");
				setUtmeldingData(json);
				setUtmeldingStatus({ type: "idle" });
			})
			.catch((error) => {
				if (!cancelled) setUtmeldingStatus({ type: "error", message: (error as Error).message });
			});
		fetch(`/api/police/report/archive?year=${year}`)
			.then((res) => res.json().then((json) => ({ ok: res.ok, json })))
			.then(({ ok, json }: { ok: boolean; json: ReportArchiveData }) => {
				if (cancelled) return;
				if (!ok || !json.ok) throw new Error(json.error || "Klarte ikke å hente rapportarkiv.");
				setReportData(json);
				setReportStatus({ type: "idle" });
			})
			.catch((error) => {
				if (!cancelled) setReportStatus({ type: "error", message: (error as Error).message });
			});
		return () => {
			cancelled = true;
		};
	}, [year]);

	const maxUtmeldingMonthTotal = Math.max(1, ...(utmeldingData?.months.map((month) => month.total) ?? [1]));
	const maxReportMonthTotal = Math.max(1, ...(reportData?.months.map((month) => month.total) ?? [1]));
	const activeLiveSettings = section === "utmelding" ? utmeldingData?.live : reportData?.live;
	const activeLiveFrom = formatLiveFrom(activeLiveSettings?.liveFromIso);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
			<div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-lg">
				<div className="flex items-start justify-between gap-3">
					<div>
						<h2 className="text-lg font-semibold text-gray-900">Arkiv</h2>
						<p className="text-sm text-gray-600">Statistikk og interne rapporter for Politiet-modulen.</p>
					</div>
					<button type="button" onClick={onClose} className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-700">Lukk</button>
				</div>

				<div className="mt-4 flex gap-2">
					{[currentYear, currentYear - 1, currentYear - 2].map((option) => (
						<button key={option} type="button" onClick={() => { if (option !== year) { setUtmeldingStatus({ type: "sending", message: "Henter arkiv..." }); setReportStatus({ type: "sending", message: "Henter rapportarkiv..." }); setSelectedReport(null); } setYear(option); }} className={`rounded-full border px-3 py-1.5 text-sm font-medium ${year === option ? "border-blue-500 bg-blue-50 text-blue-900" : "border-gray-300 bg-white text-gray-700"}`}>{option}</button>
					))}
				</div>
				<div className="mt-3 grid grid-cols-2 gap-2">
					{([{ key: "utmelding", label: "Utmelding" }, { key: "reports", label: "Rapporter" }] as { key: ArchiveSection; label: string }[]).map((item) => (
						<button key={item.key} type="button" onClick={() => { setSection(item.key); setSelectedReport(null); }} className={`rounded-xl border px-3 py-2 text-sm font-medium ${section === item.key ? "border-blue-500 bg-blue-50 text-blue-900" : "border-gray-200 bg-white text-gray-700"}`}>{item.label}</button>
					))}
				</div>

				<div className="mt-4 space-y-4">
					{section === "utmelding" && <StatusMessage status={utmeldingStatus} />}
					{section === "reports" && <StatusMessage status={reportStatus} />}
					{activeLiveFrom && <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">Live-checkpoint aktivt: statistikken viser kun data fra {activeLiveFrom}.</div>}
					{section === "utmelding" && utmeldingData && (
						<>
							<section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
								<div className="text-sm text-gray-600">Utmeldinger i {utmeldingData.year}</div>
								<div className="mt-1 text-4xl font-semibold text-gray-950">{utmeldingData.total}</div>
								<div className="mt-1 text-xs text-gray-500">Totalt registrert hittil i valgt år</div>
							</section>

							<section className="rounded-2xl border border-gray-200 bg-white p-4">
								<h3 className="text-sm font-semibold text-gray-900">Per måned</h3>
								<div className="mt-3 space-y-2">
									{utmeldingData.months.map((month) => (
										<div key={month.month} className="grid grid-cols-[2.5rem_1fr_2rem] items-center gap-2 text-sm">
											<div className="text-gray-600">{month.label}</div>
											<div className="h-3 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${(month.total / maxUtmeldingMonthTotal) * 100}%` }} /></div>
											<div className="text-right font-medium text-gray-900">{month.total}</div>
											<div />
											<div className="col-span-2 text-xs text-gray-500">Tromsø {month.tromso} · Hammerfest {month.hammerfest}</div>
										</div>
									))}
								</div>
							</section>

							<section className="rounded-2xl border border-gray-200 bg-white p-4">
								<h3 className="text-sm font-semibold text-gray-900">Årsaker</h3>
								<CountList items={utmeldingData.byReason.map((item) => ({ label: item.reason, count: item.count }))} emptyText="Ingen utmeldinger registrert." />
							</section>

							<section className="rounded-2xl border border-gray-200 bg-white p-4">
								<h3 className="text-sm font-semibold text-gray-900">Siste utmeldinger</h3>
								<div className="mt-3 space-y-2">
									{utmeldingData.recent.length === 0 && <div className="text-sm text-gray-500">Ingen utmeldinger i valgt år.</div>}
									{utmeldingData.recent.map((item) => (
										<div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
											<div className="font-medium text-gray-900">{item.dateTime} · {item.base}</div>
											<div className="text-gray-700">{item.reason} · {item.duration}</div>
											<div className="text-xs text-gray-500">Avsender: {item.sender}</div>
										</div>
									))}
								</div>
							</section>
						</>
					)}

					{section === "reports" && reportData && (
						<>
							<section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
								<div className="text-sm text-gray-600">Rapporter i {reportData.year}</div>
								<div className="mt-1 text-4xl font-semibold text-gray-950">{reportData.total}</div>
								<div className="mt-1 text-xs text-gray-500">Training {reportData.trainingTotal} · Mission {reportData.missionTotal}</div>
							</section>
							{selectedReport && <ReportDetail report={selectedReport} onBack={() => setSelectedReport(null)} />}
							<section className="rounded-2xl border border-gray-200 bg-white p-4">
								<h3 className="text-sm font-semibold text-gray-900">Per måned</h3>
								<div className="mt-3 space-y-2">
									{reportData.months.map((month) => (
										<div key={month.month} className="grid grid-cols-[2.5rem_1fr_2rem] items-center gap-2 text-sm">
											<div className="text-gray-600">{month.label}</div>
											<div className="h-3 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${(month.total / maxReportMonthTotal) * 100}%` }} /></div>
											<div className="text-right font-medium text-gray-900">{month.total}</div>
											<div />
											<div className="col-span-2 text-xs text-gray-500">Training {month.training} · Mission {month.mission}</div>
										</div>
									))}
								</div>
							</section>
							<section className="rounded-2xl border border-gray-200 bg-white p-4"><h3 className="text-sm font-semibold text-gray-900">Base</h3><CountList items={reportData.byBase} emptyText="Ingen rapporter registrert." /></section>
							<section className="rounded-2xl border border-gray-200 bg-white p-4"><h3 className="text-sm font-semibold text-gray-900">Helikopter</h3><CountList items={reportData.byHelicopter} emptyText="Ingen helikopterdata." /></section>
							<section className="rounded-2xl border border-gray-200 bg-white p-4"><h3 className="text-sm font-semibold text-gray-900">Treningstyper</h3><CountList items={reportData.byTrainingType} emptyText="Ingen treningstyper registrert." /></section>
							<section className="rounded-2xl border border-gray-200 bg-white p-4">
								<h3 className="text-sm font-semibold text-gray-900">Rapportliste</h3>
								<div className="mt-3 space-y-2">
									{reportData.reports.length === 0 && <div className="text-sm text-gray-500">Ingen rapporter i valgt år.</div>}
									{reportData.reports.map((item) => (
										<button key={item.id} type="button" onClick={() => setSelectedReport(item)} className="w-full rounded-xl border border-gray-100 bg-gray-50 p-3 text-left text-sm hover:border-blue-200 hover:bg-blue-50">
											<div className="font-medium text-gray-900">{reportTypeLabel(item.reportType)} · {item.date}</div>
											<div className="text-gray-700">{item.base} · {item.helicopter || "Helikopter ikke valgt"}</div>
											<div className="text-xs text-gray-500">{item.reportType === "mission" ? `Oppdrag ${item.missionNumber || "-"}` : item.trainingTypes.join(", ") || "Training"} · {item.pins.length} kartpunkt</div>
										</button>
									))}
								</div>
							</section>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

function SelectField({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[]; placeholder: string }) {
	return (
		<div>
			<FieldLabel>{label}</FieldLabel>
			<select value={value} onChange={(event) => onChange(event.target.value)} className={FIELD_CONTROL_CLASS}>
				<option value="">{placeholder}</option>
				{options.map((option) => (
					<option key={option} value={option}>{option}</option>
				))}
			</select>
		</div>
	);
}

function HelicopterSelect({ value, onChange }: { value: Maskin | ""; onChange: (value: Maskin | "") => void }) {
	return (
		<SelectField
			label="Helikopter"
			value={value}
			onChange={(next) => onChange(next as Maskin | "")}
			options={MASKINER}
			placeholder="Velg helikopter"
		/>
	);
}

function CrewForm({ crewOptions }: { crewOptions: PoliceCrewOptions }) {
	const [periodFromDate, setPeriodFromDate] = useState(todayISO());
	const [periodFromTime, setPeriodFromTime] = useState("14:00");
	const [periodToDate, setPeriodToDate] = useState(() => addDaysISO(7));
	const [periodToTime, setPeriodToTime] = useState("14:00");
	const [captain, setCaptain] = useState("");
	const [firstOfficer, setFirstOfficer] = useState("");
	const [technician, setTechnician] = useState("");
	const [helicopter, setHelicopter] = useState<Maskin | "">(DEFAULT_MASKIN);
	const [watchPhoneBase, setWatchPhoneBase] = useState<WatchPhoneBase>("Tromsø");
	const [showWatchPhoneOptions, setShowWatchPhoneOptions] = useState(false);
	const [status, setStatus] = useState<SubmitStatus>({ type: "idle" });
	const watchPhone = WATCH_PHONE_OPTIONS[watchPhoneBase];
	const otherWatchPhoneBases = WATCH_PHONE_BASES.filter((base) => base !== watchPhoneBase);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		if (!CREW_FORM_SEND_ENABLED) {
			setStatus({ type: "error", message: "Innsending av crew-skjema er midlertidig deaktivert." });
			return;
		}
		setStatus({ type: "sending", message: "Sender crew-skjema..." });
		try {
			await submitJson("/api/police/crew", { base: watchPhoneBase, periodFromDate, periodFromTime, periodToDate, periodToTime, watchPhone, captain, firstOfficer, technician, helicopter });
			setStatus({ type: "success", message: "Crew epost sendt." });
		} catch (error) {
			setStatus({ type: "error", message: (error as Error).message });
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<Section title="Vaktperiode">
				<div className={COMPACT_TWO_COLUMN_GRID}>
						<div className="min-w-0"><FieldLabel>Fra dato</FieldLabel><input type="date" value={periodFromDate} onChange={(e) => setPeriodFromDate(e.target.value)} className={COMPACT_DATE_TIME_CLASS} /></div>
						<div className="min-w-0"><FieldLabel>Fra tid</FieldLabel><input type="time" value={periodFromTime} onChange={(e) => setPeriodFromTime(e.target.value)} className={COMPACT_DATE_TIME_CLASS} /></div>
						<div className="min-w-0"><FieldLabel>Til dato</FieldLabel><input type="date" value={periodToDate} onChange={(e) => setPeriodToDate(e.target.value)} className={COMPACT_DATE_TIME_CLASS} /></div>
						<div className="min-w-0"><FieldLabel>Til tid</FieldLabel><input type="time" value={periodToTime} onChange={(e) => setPeriodToTime(e.target.value)} className={COMPACT_DATE_TIME_CLASS} /></div>
				</div>
			</Section>
			<Section title="Vakttelefon">
				<div className="relative">
					<FieldLabel>Trykk på vakttelefonen for å bytte base</FieldLabel>
					<button type="button" onClick={() => setShowWatchPhoneOptions((open) => !open)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-300 bg-gray-50 p-3 text-left text-gray-900">
						<span>{watchPhone}</span>
						<span className="text-sm text-gray-500">Bytt</span>
					</button>
					{showWatchPhoneOptions && (
						<div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
							{otherWatchPhoneBases.map((base) => (
								<button key={base} type="button" onClick={() => { setWatchPhoneBase(base); setShowWatchPhoneOptions(false); }} className="w-full px-3 py-3 text-left text-gray-900 hover:bg-gray-50">
									{WATCH_PHONE_OPTIONS[base]}
								</button>
							))}
						</div>
					)}
				</div>
			</Section>
			<Section title="Helikopter crew">
				<SelectField label="Fartøysjef" value={captain} onChange={setCaptain} options={crewOptions.captains} placeholder="Velg fartøysjef" />
				<SelectField label="Co-pilot" value={firstOfficer} onChange={setFirstOfficer} options={crewOptions.firstOfficers} placeholder="Velg co-pilot" />
				<SelectField label="Tekniker / Task Specialist" value={technician} onChange={setTechnician} options={crewOptions.technicians} placeholder="Velg tekniker" />
				<HelicopterSelect value={helicopter} onChange={setHelicopter} />
			</Section>
			{!CREW_FORM_SEND_ENABLED && <div className="rounded-xl border border-gray-200 bg-gray-100 p-3 text-sm text-gray-700">Innsending av crew-skjema er midlertidig deaktivert. Skjemaet kan fortsatt fylles ut og klargjøres.</div>}
			<StatusMessage status={status} />
			<button disabled={!CREW_FORM_SEND_ENABLED || status.type === "sending" || status.type === "success"} className="w-full rounded-xl bg-amber-500 px-4 py-3 font-semibold text-gray-950 disabled:cursor-not-allowed disabled:opacity-60">{!CREW_FORM_SEND_ENABLED ? "Crew-skjema deaktivert" : status.type === "success" ? "Crew epost sendt" : status.type === "sending" ? "Sender crew-skjema..." : "Send crew-skjema"}</button>
		</form>
	);
}

function UtmeldingForm({ crewOptions }: { crewOptions: PoliceCrewOptions }) {
	const [reason, setReason] = useState("");
	const [reasonDetails, setReasonDetails] = useState("");
	const [date, setDate] = useState(todayISO());
	const [time, setTime] = useState(nowTime());
	const [durationHours, setDurationHours] = useState(4);
	const [durationText, setDurationText] = useState("");
	const [mitigatingAction, setMitigatingAction] = useState("");
	const [mitigatingActionDetails, setMitigatingActionDetails] = useState("");
	const [sender, setSender] = useState("");
	const [status, setStatus] = useState<SubmitStatus>({ type: "idle" });

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setStatus({ type: "sending", message: "Sender utmelding..." });
		try {
			await submitJson("/api/police/utmelding", { base: "Tromsø", reason, reasonDetails, date, time, durationHours, durationText, mitigatingAction, mitigatingActionDetails, sender, watchPhone: DEFAULT_WATCH_PHONE });
			setStatus({ type: "success", message: "Utmelding er sendt og lagret." });
		} catch (error) {
			setStatus({ type: "error", message: (error as Error).message });
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<Section title="Utmelding">
				<SelectField label="Årsak til utmelding" value={reason} onChange={setReason} options={UTMELDING_REASONS} placeholder="Velg årsak" />
				<div><FieldLabel>Utdyping / fritekst</FieldLabel><textarea value={reasonDetails} onChange={(e) => setReasonDetails(e.target.value)} rows={4} className={TEXTAREA_CLASS} placeholder="Beskriv årsak nærmere..." /></div>
				<div className={COMPACT_TWO_COLUMN_GRID}>
						<div className="min-w-0"><FieldLabel>Dato</FieldLabel><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={COMPACT_DATE_TIME_CLASS} /></div>
						<div className="min-w-0"><FieldLabel>Tid</FieldLabel><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={COMPACT_DATE_TIME_CLASS} /></div>
				</div>
			</Section>
			<Section title="Varighet">
				<div className="text-2xl font-semibold text-amber-600">{durationHours >= 24 ? "24+ timer" : `${durationHours} timer`}</div>
				<input type="range" min="1" max="24" value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value))} className="time-slider" />
				<div><FieldLabel>Presiser forventet varighet</FieldLabel><textarea value={durationText} onChange={(e) => setDurationText(e.target.value)} rows={3} className={TEXTAREA_CLASS} placeholder="F.eks: Avventer tekniker fra Bergen, ETA 18:00..." /></div>
			</Section>
			<Section title="Mitigerende tiltak">
				<SelectField label="Tiltak" value={mitigatingAction} onChange={setMitigatingAction} options={MITIGATING_ACTIONS} placeholder="Velg tiltak" />
				<div><FieldLabel>Tilleggsinfo tiltak</FieldLabel><textarea value={mitigatingActionDetails} onChange={(e) => setMitigatingActionDetails(e.target.value)} rows={3} className={TEXTAREA_CLASS} placeholder="Eventuelle tilleggsopplysninger..." /></div>
			</Section>
			<Section title="Avsender">
				<SelectField label="Sendt av (fartøysjef)" value={sender} onChange={setSender} options={crewOptions.captains} placeholder="Velg avsender" />
					<div className="rounded-xl border bg-gray-50 p-3 text-gray-900">☎ {DEFAULT_WATCH_PHONE}</div>
			</Section>
			<StatusMessage status={status} />
			<button disabled={status.type === "sending"} className="w-full rounded-xl bg-red-500 px-4 py-3 font-semibold text-white disabled:opacity-60">Send utmelding</button>
		</form>
	);
}

function ReportForm({ crewOptions }: { crewOptions: PoliceCrewOptions }) {
	const [reportType, setReportType] = useState<PoliceReportType>("training");
	const [base, setBase] = useState<WatchPhoneBase>("Tromsø");
	const [missionNumber, setMissionNumber] = useState("");
	const [date, setDate] = useState(todayISO());
	const [reporter, setReporter] = useState("");
	const [durationText, setDurationText] = useState("");
	const [conditions, setConditions] = useState("");
	const [crew, setCrew] = useState(["", "", "", ""]);
	const [helicopter, setHelicopter] = useState<Maskin | "">(DEFAULT_MASKIN);
	const [pinsByType, setPinsByType] = useState<Record<PoliceReportType, PolicePin[]>>({
		training: [],
		mission: [],
	});
	const [showMap, setShowMap] = useState(false);
	const [trainingTypes, setTrainingTypes] = useState<string[]>([]);
	const [involvedAgencies, setInvolvedAgencies] = useState("");
	const [result, setResult] = useState("");
	const [description, setDescription] = useState("");
	const [lessonsLearned, setLessonsLearned] = useState("");
	const [followUp, setFollowUp] = useState("");
	const [safetyNotes, setSafetyNotes] = useState("");
	const [clientSubmissionId] = useState(createClientSubmissionId);
	const [missionRef, setMissionRef] = useState("");
	const [missionPoId, setMissionPoId] = useState("");
	const [missionBid, setMissionBid] = useState("");
	const [missionPax, setMissionPax] = useState("");
	const [missionAlertTime, setMissionAlertTime] = useState("");
	const [missionReadyTime, setMissionReadyTime] = useState("");
	const [missionReadinessDeviation, setMissionReadinessDeviation] = useState("");
	const [missionReadinessDeviationReason, setMissionReadinessDeviationReason] = useState("");
	const [missionCancelled, setMissionCancelled] = useState(false);
	const [missionTechlogNumber, setMissionTechlogNumber] = useState(() => {
		try {
			return typeof window !== "undefined" ? window.localStorage.getItem(POLICE_LAST_TECHLOG_STORAGE_KEY) ?? "" : "";
		} catch {
			return "";
		}
	});
	const [missionBlockOff1, setMissionBlockOff1] = useState("");
	const [missionBlockOn1, setMissionBlockOn1] = useState("");
	const [missionBlockTime1, setMissionBlockTime1] = useState("");
	const [missionBlockTime1Manual, setMissionBlockTime1Manual] = useState(false);
	const [missionWaitTime, setMissionWaitTime] = useState("");
	const [missionBlockOff2, setMissionBlockOff2] = useState("");
	const [missionBlockOn2, setMissionBlockOn2] = useState("");
	const [missionBlockTime2, setMissionBlockTime2] = useState("");
	const [missionBlockTime2Manual, setMissionBlockTime2Manual] = useState(false);
	const [missionTotalBlock, setMissionTotalBlock] = useState("");
	const [missionTotalBlockManual, setMissionTotalBlockManual] = useState(false);
	const [missionFlightRoute, setMissionFlightRoute] = useState("");
	const [status, setStatus] = useState<SubmitStatus>({ type: "idle" });
	const selectedCrew = useMemo(() => crew.filter(Boolean), [crew]);
	const pins = pinsByType[reportType];
	const effectiveBlockTime1 = missionBlockTime1Manual ? missionBlockTime1 : formatDurationMinutes(minutesBetweenTimes(missionBlockOff1, missionBlockOn1));
	const effectiveBlockTime2 = missionBlockTime2Manual ? missionBlockTime2 : formatDurationMinutes(minutesBetweenTimes(missionBlockOff2, missionBlockOn2));
	const calculatedTotalBlockMinutes = [effectiveBlockTime1, effectiveBlockTime2].map(parseDurationMinutes).filter((value): value is number => value !== null).reduce((sum, value) => sum + value, 0);
	const effectiveTotalBlock = missionTotalBlockManual ? missionTotalBlock : calculatedTotalBlockMinutes > 0 ? formatDurationMinutes(calculatedTotalBlockMinutes) : "";

	function toggleTrainingType(value: string) {
		setTrainingTypes((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
	}

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		if (reportType === "mission") {
			const completeBlock1 = hasText(missionBlockOff1) && hasText(missionBlockOn1);
			const completeBlock2 = hasText(missionBlockOff2) && hasText(missionBlockOn2);
			const missing: string[] = [];
			if (!hasText(missionNumber)) missing.push("Oppdragsnummer");
			if (!hasText(date)) missing.push("Dato");
			if (!hasText(base)) missing.push("Base");
			if (!hasText(reporter)) missing.push("Rapportskriver");
			if (!hasText(conditions)) missing.push("Vær/forhold");
			if (!hasText(missionPoId)) missing.push("PO ID");
			if (!hasText(missionRef)) missing.push("Ref./rekvirent");
			if (!hasText(missionPax)) missing.push("Pax");
			if (!hasText(missionFlightRoute)) missing.push("Flyrute");
			if (!hasText(missionAlertTime)) missing.push("Varslingstidspunkt");
			if (!hasText(missionReadyTime)) missing.push("Klar for oppdrag");
			if (!hasText(missionTechlogNumber)) missing.push("TechLog Nr.");
			if (!completeBlock1 && !completeBlock2) missing.push("minst ett komplett Block Off/On-par");
			if (hasText(missionBlockOff1) && !hasText(missionBlockOn1)) missing.push("Block On 1");
			if (!hasText(missionBlockOff1) && hasText(missionBlockOn1)) missing.push("Block Off 1");
			if (hasText(missionBlockOff2) && !hasText(missionBlockOn2)) missing.push("Block On 2");
			if (!hasText(missionBlockOff2) && hasText(missionBlockOn2)) missing.push("Block Off 2");
			if (!hasText(effectiveTotalBlock)) missing.push("Total Block");
			if (!hasText(missionWaitTime)) missing.push("Vente tid");
			if (selectedCrew.length === 0) missing.push("Crew");
			if (!hasText(helicopter)) missing.push("Helikopter");
			if (pins.length === 0) missing.push("Trenings-/oppdragsområde");
			if (!hasText(description)) missing.push("Beskrivelse av oppdrag");

			if (missing.length > 0) {
				setStatus({ type: "error", message: `Kan ikke sende Mission Report. Følgende mangler: ${missing.join(", ")}.` });
				return;
			}
			if (!hasText(missionBid) && !window.confirm("BID mangler. Vil du sende Mission Report uten BID?")) return;
		}
		setStatus({ type: "sending", message: "Lagrer rapport og laster opp PDF til SharePoint..." });
		try {
			const reportDurationText = reportType === "mission" ? effectiveTotalBlock : durationText;
			const missionLog = reportType === "mission" ? { sign: extractCrewCode(reporter), alertTime: missionAlertTime, readyTime: missionReadyTime, readinessDeviation: missionReadinessDeviation, ref: missionRef, poId: missionPoId, bid: missionBid, cancelled: missionCancelled, techlogNumber: missionTechlogNumber, blockOff1: missionBlockOff1, blockOn1: missionBlockOn1, blockTime1: effectiveBlockTime1, waitTime: missionWaitTime, blockOff2: missionBlockOff2, blockOn2: missionBlockOn2, blockTime2: effectiveBlockTime2, totalBlock: effectiveTotalBlock, flightRoute: missionFlightRoute, pax: missionPax, description, readinessDeviationReason: missionReadinessDeviationReason } : undefined;
			const response = await submitJson("/api/police/report", { clientSubmissionId, base, reportType, missionNumber, date, reporter, durationText: reportDurationText, conditions, crew: selectedCrew, helicopter, pins, trainingTypes: reportType === "training" ? trainingTypes : [], involvedAgencies, result, description, lessonsLearned, followUp, safetyNotes, missionLog });
			const sharepoint = response.delivery?.sharepoint;
			const excel = response.delivery?.excel;
			if (reportType === "mission" && missionTechlogNumber.trim() && excel?.ok !== false) {
				try {
					window.localStorage.setItem(POLICE_LAST_TECHLOG_STORAGE_KEY, missionTechlogNumber.trim());
				} catch {
					// Ignorer localStorage-feil.
				}
			}
			setStatus(sharepoint?.ok === false
				? { type: "error", message: `Rapporten er lagret i Firestore, men SharePoint-opplasting feilet: ${sharepoint.error || "ukjent feil"}` }
				: excel?.ok === false
					? { type: "error", message: `Rapporten er lagret i Firestore og SharePoint, men Excel-logg feilet: ${excel.error || "ukjent feil"}` }
					: { type: "success", message: reportType === "mission" ? "Mission Report er lagret i Firestore, SharePoint og Excel. Ingen e-post er sendt." : "Rapporten er lagret i Firestore og SharePoint. Ingen e-post er sendt." });
		} catch (error) {
			setStatus({ type: "error", message: (error as Error).message });
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{showMap && (
				<PoliceMapPicker
					pins={pins}
					onChangePins={(nextPins) =>
						setPinsByType((current) => ({
							...current,
							[reportType]: nextPins,
						}))
					}
					reportType={reportType}
					onClose={() => setShowMap(false)}
				/>
			)}
			<Section title="Rapporttype">
				<div className="grid grid-cols-2 gap-2">
					{(["training", "mission"] as PoliceReportType[]).map((type) => (
						<button key={type} type="button" onClick={() => setReportType(type)} className={`rounded-xl border px-3 py-3 text-sm font-medium ${reportType === type ? "border-blue-500 bg-blue-50 text-blue-900" : "border-gray-200 bg-white text-gray-800"}`}>{type === "training" ? "Training Report" : "Mission Report"}</button>
					))}
				</div>
				{reportType === "mission" && <div><FieldLabel>Oppdragsnummer</FieldLabel><input value={missionNumber} onChange={(e) => setMissionNumber(e.target.value)} className={FIELD_CONTROL_CLASS} placeholder="Oppdragsnummer" /></div>}
				<div><FieldLabel>Dato</FieldLabel><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD_CONTROL_CLASS} /></div>
				<SelectField label="Base" value={base} onChange={(next) => setBase((next || "Tromsø") as WatchPhoneBase)} options={WATCH_PHONE_BASES} placeholder="Velg base" />
				<SelectField label="Rapportskriver" value={reporter} onChange={setReporter} options={crewOptions.all} placeholder="Velg rapportskriver" />
					{reportType === "training" && <div><FieldLabel>Varighet</FieldLabel><input value={durationText} onChange={(e) => setDurationText(e.target.value)} className={FIELD_CONTROL_CLASS} placeholder="F.eks. 2 timer 30 min" /></div>}
				<div><FieldLabel>Vær/forhold</FieldLabel><textarea value={conditions} onChange={(e) => setConditions(e.target.value)} rows={3} className={TEXTAREA_CLASS} placeholder="Kort om vær, lysforhold, sikt eller andre relevante forhold..." /></div>
			</Section>
				{reportType === "mission" && (
					<Section title="Bestilling fra Politiet">
						<div className={COMPACT_TWO_COLUMN_GRID}>
							<div><FieldLabel>PO ID</FieldLabel><input value={missionPoId} onChange={(e) => setMissionPoId(e.target.value)} className={FIELD_CONTROL_CLASS} placeholder="F.eks. 44" /></div>
							<div><FieldLabel>BID</FieldLabel><input value={missionBid} onChange={(e) => setMissionBid(e.target.value)} className={FIELD_CONTROL_CLASS} placeholder="F.eks. RNI006" /></div>
						</div>
						<div><FieldLabel>Ref./rekvirent</FieldLabel><input value={missionRef} onChange={(e) => setMissionRef(e.target.value)} className={FIELD_CONTROL_CLASS} placeholder="Navn / telefon / operasjonsleder" /></div>
						<div><FieldLabel>Pax</FieldLabel><input value={missionPax} onChange={(e) => setMissionPax(e.target.value)} className={FIELD_CONTROL_CLASS} placeholder="F.eks. 2 + 2 hunder (ca 180 kg)" /></div>
						<div><FieldLabel>Flyrute</FieldLabel><input value={missionFlightRoute} onChange={(e) => setMissionFlightRoute(e.target.value)} className={FIELD_CONTROL_CLASS} placeholder="F.eks. Tromsø - område - Tromsø" /></div>
					</Section>
				)}
				{reportType === "mission" && (
					<Section title="Operativ logg til Excel">
						<div className={COMPACT_TWO_COLUMN_GRID}>
							<div><FieldLabel>Varslingstidspunkt</FieldLabel><input value={missionAlertTime} onChange={(e) => setMissionAlertTime(e.target.value)} className={COMPACT_DATE_TIME_CLASS} placeholder="F.eks. 12:30 / tekst" /></div>
							<div>
								<FieldLabel>Klar for oppdrag</FieldLabel>
								<input value={missionReadyTime} onChange={(e) => setMissionReadyTime(e.target.value)} className={COMPACT_DATE_TIME_CLASS} placeholder="Tid eller tekst" />
								<button type="button" onClick={() => setMissionReadyTime("Til planlagt tidspunkt")} className="mt-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-900">
									Til planlagt tidspunkt
								</button>
							</div>
						</div>
						<div className={COMPACT_TWO_COLUMN_GRID}>
							<div><FieldLabel>Avvik beredskapstid</FieldLabel><input value={missionReadinessDeviation} onChange={(e) => setMissionReadinessDeviation(e.target.value)} className={FIELD_CONTROL_CLASS} placeholder="F.eks. 0:15" /></div>
							<label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-800"><input type="checkbox" checked={missionCancelled} onChange={(e) => setMissionCancelled(e.target.checked)} /> Kansellert</label>
						</div>
						<div><FieldLabel>Årsak avvik fra beredskapstid</FieldLabel><input value={missionReadinessDeviationReason} onChange={(e) => setMissionReadinessDeviationReason(e.target.value)} className={FIELD_CONTROL_CLASS} placeholder="Fylles kun ved avvik" /></div>
						<div>
							<FieldLabel>TechLog Nr.</FieldLabel>
							<div className="flex items-center gap-2">
								<button type="button" onClick={() => setMissionTechlogNumber(String(Math.max(0, Number.parseInt(missionTechlogNumber || "0", 10) - 1)))} className="h-11 w-11 rounded-xl border border-gray-300 bg-gray-50 text-lg font-semibold">-</button>
								<input inputMode="numeric" value={missionTechlogNumber} onChange={(e) => setMissionTechlogNumber(e.target.value)} className={`${FIELD_CONTROL_CLASS} text-center font-semibold`} placeholder="TechLog" />
								<button type="button" onClick={() => setMissionTechlogNumber(String((Number.parseInt(missionTechlogNumber || "0", 10) || 0) + 1))} className="h-11 w-11 rounded-xl border border-gray-300 bg-gray-50 text-lg font-semibold">+</button>
							</div>
							<p className="mt-1 text-xs text-gray-500">Siste brukte nummer huskes på denne enheten etter vellykket innsending.</p>
						</div>
						<div className="grid grid-cols-3 gap-1.5">
							<div><FieldLabel>Block Off 1</FieldLabel><input type="time" value={missionBlockOff1} onChange={(e) => setMissionBlockOff1(e.target.value)} className={COMPACT_DATE_TIME_CLASS} /></div>
							<div><FieldLabel>Block On 1</FieldLabel><input type="time" value={missionBlockOn1} onChange={(e) => setMissionBlockOn1(e.target.value)} className={COMPACT_DATE_TIME_CLASS} /></div>
							<div><FieldLabel>Block tid 1</FieldLabel><input value={effectiveBlockTime1} onChange={(e) => { setMissionBlockTime1Manual(true); setMissionBlockTime1(e.target.value); }} className={COMPACT_DATE_TIME_CLASS} placeholder="0:00" /></div>
						</div>
						<div><FieldLabel>Vente tid</FieldLabel><input value={missionWaitTime} onChange={(e) => setMissionWaitTime(e.target.value)} className={FIELD_CONTROL_CLASS} placeholder="F.eks. 0:30" /></div>
						<div className="grid grid-cols-3 gap-1.5">
							<div><FieldLabel>Block Off 2</FieldLabel><input type="time" value={missionBlockOff2} onChange={(e) => setMissionBlockOff2(e.target.value)} className={COMPACT_DATE_TIME_CLASS} /></div>
							<div><FieldLabel>Block On 2</FieldLabel><input type="time" value={missionBlockOn2} onChange={(e) => setMissionBlockOn2(e.target.value)} className={COMPACT_DATE_TIME_CLASS} /></div>
							<div><FieldLabel>Block tid 2</FieldLabel><input value={effectiveBlockTime2} onChange={(e) => { setMissionBlockTime2Manual(true); setMissionBlockTime2(e.target.value); }} className={COMPACT_DATE_TIME_CLASS} placeholder="0:00" /></div>
						</div>
						<div><FieldLabel>Total Block</FieldLabel><input value={effectiveTotalBlock} onChange={(e) => { setMissionTotalBlockManual(true); setMissionTotalBlock(e.target.value); }} className={FIELD_CONTROL_CLASS} placeholder="Beregnes automatisk" /></div>
					</Section>
				)}
			<Section title="Crew">
				{crew.map((value, index) => (
					<SelectField key={index} label={`Crew ${index + 1}${index > 0 ? " (valgfritt)" : ""}`} value={value} onChange={(next) => setCrew((current) => current.map((item, i) => i === index ? next : item))} options={crewOptions.all.filter((option) => !selectedCrew.includes(option) || option === value)} placeholder="Velg crew" />
				))}
				<HelicopterSelect value={helicopter} onChange={setHelicopter} />
			</Section>
			<Section title="Trenings-/oppdragsområde">
				<p className="text-sm text-gray-600">Kartet åpnes i fullskjerm for enklere bruk på mobil. Pins lagres strukturert for senere heatmap/statistikk.</p>
				<button type="button" onClick={() => setShowMap(true)} className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">{pins.length ? `Rediger kart (${pins.length} punkt)` : "Åpne kart / marker område"}</button>
				{pins.length > 0 && <div className="space-y-2 text-sm text-gray-700">{pins.map((pin, index) => <div key={`${pin.lat}-${pin.lng}-${index}`} className="rounded-xl border border-gray-100 bg-gray-50 p-2">{index + 1}. {PIN_TYPE_LABELS[pin.type || "trainingArea"] || "Kartpunkt"}{pin.label ? ` - ${pin.label}` : ""}<br /><span className="text-xs text-gray-500">{pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</span></div>)}</div>}
			</Section>
			<Section title="Beskrivelse">
				{reportType === "training" && <div className="flex flex-wrap gap-2">{TRAINING_TYPES.map((type) => <button key={type} type="button" onClick={() => toggleTrainingType(type)} className={`rounded-full border px-3 py-1.5 text-sm ${trainingTypes.includes(type) ? "border-blue-500 bg-blue-50 text-blue-900" : "border-gray-300 bg-white text-gray-700"}`}>{type}</button>)}</div>}
				{reportType === "mission" && <div><FieldLabel>Involverte etater</FieldLabel><input value={involvedAgencies} onChange={(e) => setInvolvedAgencies(e.target.value)} className={FIELD_CONTROL_CLASS} placeholder="F.eks. Politiet, AMK, brann" /></div>}
				{reportType === "mission" && <div><FieldLabel>Resultat/utfall</FieldLabel><textarea value={result} onChange={(e) => setResult(e.target.value)} rows={3} className={TEXTAREA_CLASS} placeholder="Kort oppsummering av utfallet..." /></div>}
				{reportType === "mission" && <div><FieldLabel>Sikkerhetsmomenter / observasjoner</FieldLabel><textarea value={safetyNotes} onChange={(e) => setSafetyNotes(e.target.value)} rows={3} className={TEXTAREA_CLASS} placeholder="Eventuelle sikkerhetspunkter eller observasjoner..." /></div>}
					<div><FieldLabel>{reportType === "mission" ? "Beskrivelse av oppdrag" : "Beskrivelse"}</FieldLabel><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className={TEXTAREA_CLASS} placeholder={reportType === "mission" ? "Beskriv oppdraget..." : "Detaljert beskrivelse..."} /></div>
			</Section>
			<Section title="Lessons learned og oppfølging">
				<div><FieldLabel>Lessons learned</FieldLabel><textarea value={lessonsLearned} onChange={(e) => setLessonsLearned(e.target.value)} rows={5} className={TEXTAREA_CLASS} placeholder="Hva fungerte bra? Hva kan forbedres?" /></div>
				<div><FieldLabel>Tiltak/oppfølging</FieldLabel><textarea value={followUp} onChange={(e) => setFollowUp(e.target.value)} rows={4} className={TEXTAREA_CLASS} placeholder="Tiltak, oppfølging eller punkter til senere bruk..." /></div>
			</Section>
				{reportType === "mission" && status.type === "success" && (
					<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
						<div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-lg">
							<h2 className="text-lg font-semibold text-gray-900">Mission Report lagret</h2>
							<p className="mt-3 text-sm text-gray-700">{status.message}</p>
							<Link href="/" className="mt-5 block w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">
								Tilbake
							</Link>
						</div>
					</div>
				)}
				{!(reportType === "mission" && status.type === "success") && <StatusMessage status={status} />}
				<button type="submit" disabled={status.type === "sending" || status.type === "success"} aria-busy={status.type === "sending"} className="w-full rounded-xl bg-amber-500 px-4 py-3 font-semibold text-gray-950 disabled:cursor-wait disabled:opacity-60">{status.type === "sending" ? "Lagrer rapport..." : status.type === "success" ? "Rapport lagret" : "Lagre rapport"}</button>
		</form>
	);
}

export default function PolitietClient() {
	const [tab, setTab] = useState<PoliceTab>("crew");
	const [showCrewEditor, setShowCrewEditor] = useState(false);
	const [showArchive, setShowArchive] = useState(false);
	const [crewDirectory, setCrewDirectory] = useState<CrewDirectoryEntry[]>(() => sortCrewDirectoryEntries(DEFAULT_CREW_DIRECTORY));
	const crewOptions = useMemo(() => buildCrewOptions(crewDirectory), [crewDirectory]);

	useEffect(() => {
		let cancelled = false;
		fetch("/api/crew-directory")
			.then((res) => (res.ok ? res.json() : null))
			.then((data: { ok?: boolean; entries?: CrewDirectoryEntry[] } | null) => {
				if (cancelled || !data?.ok) return;
				if (Array.isArray(data.entries)) setCrewDirectory(sortCrewDirectoryEntries(data.entries));
			})
			.catch(() => {
				// Hvis Firestore/env ikke er klart lokalt, bruker vi bare standardlistene.
			});

		return () => {
			cancelled = true;
		};
	}, []);

	function handleCrewDirectorySaved(entry: CrewDirectoryEntry) {
		setCrewDirectory((current) => mergeCrewDirectoryEntries([...current.filter((item) => item.id !== entry.id), entry]));
	}

	return (
		<div className="min-h-screen bg-gray-50 text-gray-900">
			{showArchive && <PoliceArchiveModal onClose={() => setShowArchive(false)} />}
			{showCrewEditor && <CrewDirectoryEditor entries={crewDirectory} onClose={() => setShowCrewEditor(false)} onSaved={handleCrewDirectorySaved} />}
			<header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur">
				<div className="mx-auto flex max-w-md items-center justify-between gap-3 p-4">
					<div>
						<Link href="/" className="mb-2 inline-block rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700">Til forsiden</Link>
						<h1 className="text-xl font-semibold">Airlift Politiberedskap</h1>
						<p className="text-xs uppercase tracking-wide text-gray-500">Politiberedskap // Tromsø base</p>
					</div>
					<div className="flex gap-2">
						<button type="button" onClick={() => setShowArchive(true)} className="rounded-full border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">Arkiv</button>
						<button type="button" onClick={() => setShowCrewEditor(true)} className="rounded-full border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">Rediger</button>
					</div>
				</div>
				<nav className="mx-auto grid max-w-md grid-cols-3 gap-2 px-4 pb-4">
					{([{ key: "crew", label: "Crew-skjema" }, { key: "utmelding", label: "Utmelding" }, { key: "rapport", label: "Rapport" }] as { key: PoliceTab; label: string }[]).map((item) => (
						<button key={item.key} type="button" onClick={() => setTab(item.key)} className={`rounded-xl border px-2 py-2 text-sm font-medium ${tab === item.key ? "border-blue-500 bg-blue-50 text-blue-900" : "border-gray-200 bg-white text-gray-700"}`}>{item.label}</button>
					))}
				</nav>
			</header>
			<main className="mx-auto max-w-md space-y-4 px-3 py-4 pb-10 sm:px-4">
				{tab === "crew" && <CrewForm crewOptions={crewOptions} />}
				{tab === "utmelding" && <UtmeldingForm crewOptions={crewOptions} />}
				{tab === "rapport" && <ReportForm crewOptions={crewOptions} />}
			</main>
		</div>
	);
}