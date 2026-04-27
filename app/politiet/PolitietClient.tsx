"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
	CAPTAINS,
	DEFAULT_MASKIN,
	FIRST_OFFICERS,
	MASKINER,
	TECHNICIANS,
	type Maskin,
} from "../../lib/aviationOptions";
import PoliceMapPicker from "./PoliceMapPicker";
import type { ApiSubmitResponse, PolicePin, PoliceReportType, PoliceTab, SubmitStatus } from "./types";

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (days: number) => {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return date.toISOString().slice(0, 10);
};
const nowTime = () => new Date().toTimeString().slice(0, 5);
const WATCH_PHONE = "479 04 276 – Tromsø base";

const UTMELDING_REASONS = ["Teknisk", "Vær", "Crew", "Operativ begrensning", "Annet"];
const MITIGATING_ACTIONS = ["Tekniker varslet", "Reservecrew vurderes", "Alternativ maskin vurderes", "Operativ begrensning meldt", "Annet"];
const TRAINING_TYPES = ["Politioperativ", "Søk og redning", "Navigasjon", "Nattflyging", "NVG-trening", "Bakkeoperasjoner", "Annet"];
const FIELD_CONTROL_CLASS = "min-w-0 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-base text-gray-900";
const COMPACT_DATE_TIME_CLASS = "min-w-0 w-full rounded-xl border border-gray-300 bg-white px-2 py-3 text-[15px] leading-tight text-gray-900";
const TEXTAREA_CLASS = `${FIELD_CONTROL_CLASS} resize-y`;
const COMPACT_TWO_COLUMN_GRID = "grid grid-cols-2 gap-2";

type CrewRole = "captains" | "firstOfficers" | "technicians";
type CustomCrewOptions = Record<CrewRole, string[]>;
type PoliceCrewOptions = CustomCrewOptions & { all: string[] };

const EMPTY_CUSTOM_CREW_OPTIONS: CustomCrewOptions = {
	captains: [],
	firstOfficers: [],
	technicians: [],
};

function uniqueSorted(values: string[]) {
	return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "nb-NO"));
}

function buildCrewOptions(custom: CustomCrewOptions): PoliceCrewOptions {
	const captains = uniqueSorted([...CAPTAINS, ...custom.captains]);
	const firstOfficers = uniqueSorted([...FIRST_OFFICERS, ...custom.firstOfficers]);
	const technicians = uniqueSorted([...TECHNICIANS, ...custom.technicians]);
	return {
		captains,
		firstOfficers,
		technicians,
		all: uniqueSorted([...captains, ...firstOfficers, ...technicians]),
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

function CrewOptionsEditor({ onClose, onSaved }: { onClose: () => void; onSaved: (entries: { role: CrewRole; name: string }[]) => void }) {
	const [captainName, setCaptainName] = useState("");
	const [firstOfficerName, setFirstOfficerName] = useState("");
	const [technicianName, setTechnicianName] = useState("");
	const [status, setStatus] = useState<SubmitStatus>({ type: "idle" });

	async function handleSave(event: React.FormEvent) {
		event.preventDefault();
		const entries = [
			{ role: "captains" as const, name: captainName.trim() },
			{ role: "firstOfficers" as const, name: firstOfficerName.trim() },
			{ role: "technicians" as const, name: technicianName.trim() },
		].filter((entry) => entry.name.length > 0);

		if (entries.length === 0) {
			setStatus({ type: "error", message: "Skriv inn minst ett navn før du lagrer." });
			return;
		}

		setStatus({ type: "sending", message: "Lagrer person..." });
		try {
			await Promise.all(
				entries.map(async (entry) => {
					const res = await fetch("/api/police/crew-options", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(entry),
					});
					if (!res.ok) {
						const data = (await res.json().catch(() => ({}))) as { error?: string };
						throw new Error(data.error || "Klarte ikke å lagre person.");
					}
				}),
			);
			onSaved(entries);
			setCaptainName("");
			setFirstOfficerName("");
			setTechnicianName("");
			setStatus({ type: "success", message: "Person lagret." });
		} catch (error) {
			setStatus({ type: "error", message: (error as Error).message });
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
			<form onSubmit={handleSave} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-4 shadow-lg">
				<div className="flex items-start justify-between gap-3">
					<div>
						<h2 className="text-lg font-semibold text-gray-900">Rediger crew</h2>
						<p className="text-sm text-gray-600">Legg inn nytt navn under riktig stilling.</p>
					</div>
					<button type="button" onClick={onClose} className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-700">Lukk</button>
				</div>
				<div>
					<FieldLabel>Fartøysjef</FieldLabel>
					<input value={captainName} onChange={(e) => setCaptainName(e.target.value)} className={FIELD_CONTROL_CLASS} placeholder="Navn eller initialer" />
				</div>
				<div>
					<FieldLabel>Co-pilot</FieldLabel>
					<input value={firstOfficerName} onChange={(e) => setFirstOfficerName(e.target.value)} className={FIELD_CONTROL_CLASS} placeholder="Navn eller initialer" />
				</div>
				<div>
					<FieldLabel>Tekniker / Task Specialist</FieldLabel>
					<input value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} className={FIELD_CONTROL_CLASS} placeholder="Navn eller initialer" />
				</div>
				<StatusMessage status={status} />
				<button type="submit" disabled={status.type === "sending"} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-60">Lagre</button>
			</form>
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
	const [status, setStatus] = useState<SubmitStatus>({ type: "idle" });

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setStatus({ type: "sending", message: "Sender crew-skjema..." });
		try {
			await submitJson("/api/police/crew", { base: "Tromsø", periodFromDate, periodFromTime, periodToDate, periodToTime, watchPhone: WATCH_PHONE, captain, firstOfficer, technician, helicopter });
			setStatus({ type: "success", message: "Crew-skjema er lagret. E-post/SharePoint kobles på når mottakere og mapper er satt." });
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
			<Section title="Vakttelefon"><div className="rounded-xl border bg-gray-50 p-3 text-gray-900">{WATCH_PHONE}</div></Section>
			<Section title="Helikopter crew">
				<SelectField label="Fartøysjef" value={captain} onChange={setCaptain} options={crewOptions.captains} placeholder="Velg fartøysjef" />
				<SelectField label="Co-pilot" value={firstOfficer} onChange={setFirstOfficer} options={crewOptions.firstOfficers} placeholder="Velg co-pilot" />
				<SelectField label="Tekniker / Task Specialist" value={technician} onChange={setTechnician} options={crewOptions.technicians} placeholder="Velg tekniker" />
				<HelicopterSelect value={helicopter} onChange={setHelicopter} />
			</Section>
			<div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Oppnås ikke kontakt på vakttelefon kan vakttelefon til tekniker eller direkte telefon til crewet brukes. Flyr helikopteret, ring direkte på GSM eller Iridium.</div>
			<StatusMessage status={status} />
			<button disabled={status.type === "sending"} className="w-full rounded-xl bg-amber-500 px-4 py-3 font-semibold text-gray-950 disabled:opacity-60">Send crew-skjema</button>
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
			await submitJson("/api/police/utmelding", { base: "Tromsø", reason, reasonDetails, date, time, durationHours, durationText, mitigatingAction, mitigatingActionDetails, sender, watchPhone: WATCH_PHONE });
			setStatus({ type: "success", message: "Utmelding er lagret. E-post/SharePoint kobles på når mottakere og mapper er satt." });
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
						<div className="min-w-0"><FieldLabel>Tidspunkt</FieldLabel><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={COMPACT_DATE_TIME_CLASS} /></div>
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
				<div className="rounded-xl border bg-gray-50 p-3 text-gray-900">☎ {WATCH_PHONE}</div>
			</Section>
			<StatusMessage status={status} />
			<button disabled={status.type === "sending"} className="w-full rounded-xl bg-red-500 px-4 py-3 font-semibold text-white disabled:opacity-60">Send utmelding</button>
		</form>
	);
}

function ReportForm({ crewOptions }: { crewOptions: PoliceCrewOptions }) {
	const [reportType, setReportType] = useState<PoliceReportType>("training");
	const [missionNumber, setMissionNumber] = useState("");
	const [date, setDate] = useState(todayISO());
	const [crew, setCrew] = useState(["", "", "", ""]);
	const [helicopter, setHelicopter] = useState<Maskin | "">(DEFAULT_MASKIN);
	const [pinsByType, setPinsByType] = useState<Record<PoliceReportType, PolicePin[]>>({
		training: [],
		mission: [],
	});
	const [trainingTypes, setTrainingTypes] = useState<string[]>([]);
	const [description, setDescription] = useState("");
	const [lessonsLearned, setLessonsLearned] = useState("");
	const [status, setStatus] = useState<SubmitStatus>({ type: "idle" });
	const selectedCrew = useMemo(() => crew.filter(Boolean), [crew]);
	const pins = pinsByType[reportType];

	function toggleTrainingType(value: string) {
		setTrainingTypes((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
	}

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setStatus({ type: "sending", message: "Lagrer rapport..." });
		try {
			await submitJson("/api/police/report", { base: "Tromsø", reportType, missionNumber, date, crew: selectedCrew, helicopter, pins, trainingTypes, description, lessonsLearned });
			setStatus({ type: "success", message: "Rapporten er lagret. E-post/SharePoint kobles på når mottakere og mapper er satt." });
		} catch (error) {
			setStatus({ type: "error", message: (error as Error).message });
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<Section title="Rapporttype">
				<div className="grid grid-cols-2 gap-2">
					{(["training", "mission"] as PoliceReportType[]).map((type) => (
						<button key={type} type="button" onClick={() => setReportType(type)} className={`rounded-xl border px-3 py-3 text-sm font-medium ${reportType === type ? "border-blue-500 bg-blue-50 text-blue-900" : "border-gray-200 bg-white text-gray-800"}`}>{type === "training" ? "Training Report" : "Mission Report"}</button>
					))}
				</div>
				{reportType === "mission" && <div><FieldLabel>Oppdragsnummer</FieldLabel><input value={missionNumber} onChange={(e) => setMissionNumber(e.target.value)} className={FIELD_CONTROL_CLASS} placeholder="Oppdragsnummer" /></div>}
				<div><FieldLabel>Dato</FieldLabel><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD_CONTROL_CLASS} /></div>
			</Section>
			<Section title="Crew">
				{crew.map((value, index) => (
					<SelectField key={index} label={`Crew ${index + 1}${index > 0 ? " (valgfritt)" : ""}`} value={value} onChange={(next) => setCrew((current) => current.map((item, i) => i === index ? next : item))} options={crewOptions.all.filter((option) => !selectedCrew.includes(option) || option === value)} placeholder="Velg crew" />
				))}
				<HelicopterSelect value={helicopter} onChange={setHelicopter} />
			</Section>
			<Section title="Trenings-/oppdragsområde">
				<p className="text-sm text-gray-600">Trykk i kartet for å markere områder. Pins lagres strukturert for senere heatmap/statistikk.</p>
				<PoliceMapPicker
					pins={pins}
					onChangePins={(nextPins) =>
						setPinsByType((current) => ({
							...current,
							[reportType]: nextPins,
						}))
					}
					reportType={reportType}
				/>
			</Section>
			<Section title="Beskrivelse">
				<div className="flex flex-wrap gap-2">
					{TRAINING_TYPES.map((type) => <button key={type} type="button" onClick={() => toggleTrainingType(type)} className={`rounded-full border px-3 py-1.5 text-sm ${trainingTypes.includes(type) ? "border-blue-500 bg-blue-50 text-blue-900" : "border-gray-300 bg-white text-gray-700"}`}>{type}</button>)}
				</div>
				<div><FieldLabel>Beskrivelse</FieldLabel><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className={TEXTAREA_CLASS} placeholder="Detaljert beskrivelse..." /></div>
			</Section>
			<Section title="Lessons learned">
				<textarea value={lessonsLearned} onChange={(e) => setLessonsLearned(e.target.value)} rows={5} className={TEXTAREA_CLASS} placeholder="Hva fungerte bra? Hva kan forbedres?" />
			</Section>
			<StatusMessage status={status} />
			<button disabled={status.type === "sending"} className="w-full rounded-xl bg-amber-500 px-4 py-3 font-semibold text-gray-950 disabled:opacity-60">Lagre rapport</button>
		</form>
	);
}

export default function PolitietClient() {
	const [tab, setTab] = useState<PoliceTab>("crew");
	const [showCrewEditor, setShowCrewEditor] = useState(false);
	const [customCrewOptions, setCustomCrewOptions] = useState<CustomCrewOptions>(EMPTY_CUSTOM_CREW_OPTIONS);
	const crewOptions = useMemo(() => buildCrewOptions(customCrewOptions), [customCrewOptions]);

	useEffect(() => {
		let cancelled = false;
		fetch("/api/police/crew-options")
			.then((res) => (res.ok ? res.json() : null))
			.then((data: (CustomCrewOptions & { ok?: boolean }) | null) => {
				if (cancelled || !data?.ok) return;
				setCustomCrewOptions({
					captains: Array.isArray(data.captains) ? data.captains : [],
					firstOfficers: Array.isArray(data.firstOfficers) ? data.firstOfficers : [],
					technicians: Array.isArray(data.technicians) ? data.technicians : [],
				});
			})
			.catch(() => {
				// Hvis Firestore/env ikke er klart lokalt, bruker vi bare standardlistene.
			});

		return () => {
			cancelled = true;
		};
	}, []);

	function handleCrewOptionsSaved(entries: { role: CrewRole; name: string }[]) {
		setCustomCrewOptions((current) => {
			const next = { ...current };
			entries.forEach((entry) => {
				next[entry.role] = uniqueSorted([...next[entry.role], entry.name]);
			});
			return next;
		});
	}

	return (
		<div className="min-h-screen bg-gray-50 text-gray-900">
			{showCrewEditor && <CrewOptionsEditor onClose={() => setShowCrewEditor(false)} onSaved={handleCrewOptionsSaved} />}
			<header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur">
				<div className="mx-auto flex max-w-md items-center justify-between gap-3 p-4">
					<div>
						<Link href="/" className="mb-2 inline-block rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700">Til forsiden</Link>
						<h1 className="text-xl font-semibold">Airlift Politiberedskap</h1>
						<p className="text-xs uppercase tracking-wide text-gray-500">Politiberedskap // Tromsø base</p>
					</div>
					<button type="button" onClick={() => setShowCrewEditor(true)} className="rounded-full border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">Rediger</button>
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