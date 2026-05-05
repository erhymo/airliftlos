"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CAPTAINS, FIRST_OFFICERS } from "../vaktapp/components/CrewPicker";

const LAST_TECHLOG_STORAGE_KEY = "loslogg_last_techlog_number";
const PLACE_TYPES = ["Crew Change Bergen", "Crew Change Hammerfest", "Other Bergen", "Other Hammerfest"] as const;
type PlaceType = (typeof PLACE_TYPES)[number];

function todayISO() {
	return new Date().toISOString().slice(0, 10);
}

function parseIntValue(value: string) {
	const parsed = Number.parseInt(value, 10);
	return Number.isNaN(parsed) || parsed < 0 ? "" : String(parsed);
}

function requiresWeatherComment(dateIso: string) {
	const [, monthRaw, dayRaw] = dateIso.split("-");
	const month = Number(monthRaw);
	const day = Number(dayRaw);
	if (!month || !day) return false;
	return month >= 9 || month < 5 || (month === 5 && day === 1);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<label className="block space-y-1">
			<span className="text-sm font-medium text-gray-700">{label}</span>
			{children}
		</label>
	);
}

function CompactNumberField({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<label className="block space-y-1">
			<span className="flex min-h-10 items-end text-xs font-medium leading-tight text-gray-700">{label}</span>
			{children}
		</label>
	);
}

export default function CrewChangePage() {
	const [date, setDate] = useState(todayISO());
	const [techlogNumber, setTechlogNumber] = useState("");
	const [vesselName, setVesselName] = useState("");
	const [placeType, setPlaceType] = useState<PlaceType | "">("");
	const [isCrewChange, setIsCrewChange] = useState(true);
	const [totalFlightDistance, setTotalFlightDistance] = useState("");
	const [pax, setPax] = useState("");
	const [helideckIdleTime, setHelideckIdleTime] = useState("");
	const [reposMinutes, setReposMinutes] = useState("");
	const [comment, setComment] = useState("");
	const [weatherComment, setWeatherComment] = useState("");
	const [weatherDelayComment, setWeatherDelayComment] = useState("");
	const [sign, setSign] = useState("");
	const [sending, setSending] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		try {
			const stored = window.localStorage.getItem(LAST_TECHLOG_STORAGE_KEY);
			if (stored) setTechlogNumber(parseIntValue(stored));
		} catch {}

		fetch("/api/crew-change", { cache: "no-store" })
			.then((res) => (res.ok ? res.json() : null))
			.then((data: { latestTechlogNumber?: number } | null) => {
				if (typeof data?.latestTechlogNumber === "number" && data.latestTechlogNumber > 0) {
					setTechlogNumber((current) => current || String(data.latestTechlogNumber));
				}
			})
			.catch(() => {});
	}, []);

	const weatherRequired = useMemo(() => requiresWeatherComment(date), [date]);
	const signers = useMemo(() => [...CAPTAINS, ...FIRST_OFFICERS].sort((a, b) => a.localeCompare(b, "nb-NO")), []);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);
		if (!date || !techlogNumber || !vesselName.trim() || !placeType || !sign.trim()) {
			setError("Dato, TechLogNr, fartøy, sted/type og sign må fylles ut.");
			return;
		}
		if (weatherRequired && !weatherComment.trim()) {
			setError("Kommentarer om værforhold må fylles ut mellom 1. september og 1. mai.");
			return;
		}

		setSending(true);
		try {
			const res = await fetch("/api/crew-change", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ date, techlogNumber: Number(techlogNumber), vesselName, placeType, isCrewChange, totalFlightDistance: totalFlightDistance ? Number(totalFlightDistance) : null, pax: pax ? Number(pax) : null, helideckIdleTime: helideckIdleTime ? Number(helideckIdleTime) : null, reposMinutes: reposMinutes ? Number(reposMinutes) : null, comment, weatherComment, weatherDelayComment, sign }),
			});
			const data = (await res.json().catch(() => ({}))) as { error?: string };
			if (!res.ok) throw new Error(data.error || "Klarte ikke å sende Crew change.");
			try { window.localStorage.setItem(LAST_TECHLOG_STORAGE_KEY, techlogNumber); } catch {}
			setSent(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Klarte ikke å sende Crew change.");
		} finally {
			setSending(false);
		}
	}

	const numberInput = "w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900";
	const textInput = "w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900";

	return (
		<div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4">
			<main className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
				<header className="space-y-1">
					<h1 className="text-lg font-semibold">Crew change</h1>
					<p className="text-sm text-gray-600">Fyll inn oppdraget og send raden til SharePoint.</p>
				</header>

				{sent ? (
					<section className="space-y-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
						<p className="font-medium">Crew change er sendt til SharePoint.</p>
						<Link href="/" className="inline-flex rounded-md bg-green-700 px-3 py-2 text-white">Til forsiden</Link>
					</section>
				) : (
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="grid grid-cols-2 gap-3">
							<Field label="Dato"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={textInput} /></Field>
							<Field label="Sign"><select value={sign} onChange={(e) => setSign(e.target.value)} className={textInput}><option value="">Velg sign</option>{signers.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
						</div>
						<Field label="TechLogNr"><input type="number" inputMode="numeric" value={techlogNumber} onChange={(e) => setTechlogNumber(parseIntValue(e.target.value))} className={numberInput} /></Field>
						<Field label="Navn på fartøy"><input value={vesselName} onChange={(e) => setVesselName(e.target.value)} className={textInput} /></Field>
						<Field label="Sted/type"><select value={placeType} onChange={(e) => setPlaceType(e.target.value as PlaceType | "")} className={textInput}><option value="">Velg sted/type</option>{PLACE_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
						<label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-3 text-sm font-medium text-gray-700"><input type="checkbox" checked={isCrewChange} onChange={(e) => setIsCrewChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />Crew Change</label>
						<Field label="Total flight distance in NM"><input type="number" inputMode="numeric" value={totalFlightDistance} onChange={(e) => setTotalFlightDistance(parseIntValue(e.target.value))} className={numberInput} /></Field>
							<div className="grid grid-cols-3 gap-3"><CompactNumberField label="PAX"><input type="number" inputMode="numeric" value={pax} onChange={(e) => setPax(parseIntValue(e.target.value))} className={numberInput} /></CompactNumberField><CompactNumberField label="Helideck idle time"><input type="number" inputMode="numeric" value={helideckIdleTime} onChange={(e) => setHelideckIdleTime(parseIntValue(e.target.value))} className={numberInput} /></CompactNumberField><CompactNumberField label="Repos min."><input type="number" inputMode="numeric" value={reposMinutes} onChange={(e) => setReposMinutes(parseIntValue(e.target.value))} className={numberInput} /></CompactNumberField></div>
						<Field label="Kommentarer"><textarea value={comment} onChange={(e) => setComment(e.target.value)} className={`${textInput} min-h-20`} /></Field>
						<Field label={`Kommentarer om værforhold${weatherRequired ? " *" : ""}`}><textarea value={weatherComment} onChange={(e) => setWeatherComment(e.target.value)} className={`${textInput} min-h-20`} placeholder={weatherRequired ? "Må fylles ut i perioden 1. september–1. mai" : "Valgfritt"} /></Field>
						<Field label="Oppdrag utsatt på grunn av vær"><textarea value={weatherDelayComment} onChange={(e) => setWeatherDelayComment(e.target.value)} className={`${textInput} min-h-20`} placeholder="Oppgi varighet og værfenomen hvis relevant" /></Field>
						{error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
						<button type="submit" disabled={sending} className="w-full rounded-lg bg-blue-600 py-3 text-base font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">{sending ? "Sender..." : "Send inn"}</button>
						<Link href="/" className="block text-center text-sm text-gray-500 underline">Tilbake til forsiden</Link>
					</form>
				)}
			</main>
		</div>
	);
}