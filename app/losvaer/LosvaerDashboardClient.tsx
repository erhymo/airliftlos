"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
	calculateBoardingHeading,
	compassDirection,
	flowDirectionFrom,
	msToKnots,
	normalizeDeg,
	type BoardingHeadingRecommendation,
	type LosvaerWeatherPoint,
} from "@/lib/losvaer/boarding";
import type { LosvaerPlace } from "@/lib/losvaer/places";

type LosvaerApiResponse = {
	current: LosvaerWeatherPoint | null;
	points: LosvaerWeatherPoint[];
	updatedAt: string | null;
	sources: { wind: string; swell: string };
};

export default function LosvaerDashboardClient({ places }: { places: LosvaerPlace[] }) {
	return (
		<div className="min-h-screen bg-gray-50 px-3 py-5 text-gray-900 min-[380px]:px-4">
			<main className="mx-auto w-full max-w-md space-y-4">
				<header className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm min-[380px]:p-5">
					<div className="flex items-start justify-between gap-3">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">LOS vær</p>
							<h1 className="mt-1 text-2xl font-semibold text-gray-900">Boardingforhold</h1>
						</div>
						<Link href="/" className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50">
							Forsiden
						</Link>
					</div>
				</header>

				<section className="space-y-4">
					{places.map((place) => <LosvaerPlaceCard key={place.id} place={place} />)}
				</section>

				<p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
					Beslutningsstøtte må alltid vurderes opp mot faktiske lokale forhold, fartøy, prosedyrer og operativ erfaring.
				</p>
			</main>
		</div>
	);
}

function LosvaerPlaceCard({ place }: { place: LosvaerPlace }) {
	const [data, setData] = useState<LosvaerApiResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [refreshToken, setRefreshToken] = useState(0);

	useEffect(() => {
		let ignore = false;
		fetch(`/api/losvaer?place=${encodeURIComponent(place.id)}`)
			.then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
			.then((payload: LosvaerApiResponse) => {
				if (ignore) return;
				setData(payload);
				setError(null);
			})
			.catch(() => {
				if (ignore) return;
				setData(null);
				setError("Klarte ikke å hente MET-data");
			});
		return () => {
			ignore = true;
		};
	}, [place.id, refreshToken]);

	const current = data?.current ?? null;
	const recommendation = useMemo(() => calculateBoardingHeading(current), [current]);
	const loading = !data && !error;
	const waveState = current?.seaSurfaceWaveHeightM == null ? null : waveStateFor(current.seaSurfaceWaveHeightM);
	const accent = error ? "#ef4444" : recommendation.color;
	const headingText = recommendation.headingDeg == null ? "—" : `${recommendation.headingDeg.toFixed(0)}°`;
	const headingSub = recommendation.headingDeg == null ? recommendation.label : `${compassDirection(recommendation.headingDeg)} · ${recommendation.label}`;
	const speedText = recommendation.speedKt == null ? "—" : `${recommendation.speedKt} knop`;

	function refresh() {
		setData(null);
		setError(null);
		setRefreshToken((value) => value + 1);
	}

	return (
		<article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" style={{ borderLeftColor: accent, borderLeftWidth: 5 }}>
			<div className="p-4 min-[380px]:p-5">
				<div className="flex items-start justify-between gap-3 min-[380px]:gap-4">
					<div className="min-w-0">
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Losbordingsfelt</p>
						<h2 className="mt-1 text-xl font-semibold text-gray-900">{place.name}</h2>
						<p className="mt-1 text-sm text-gray-500">{place.coordinateLabel}</p>
					</div>
					<span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${accent}18`, color: accent }}>
						{loading ? "Henter" : error ? "Feil" : "Oppdatert"}
					</span>
				</div>

					<div className="mt-4 rounded-lg border p-4" style={{ background: `${accent}0f`, borderColor: `${accent}33` }}>
						<div className="flex flex-col gap-4 min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between">
							<div className="min-w-0">
								<p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Anbefalt skipsretning</p>
								<p className="mt-1 text-5xl font-semibold leading-none" style={{ color: accent }}>{headingText}</p>
								<p className="mt-2 text-sm font-medium text-gray-700">{headingSub}</p>
							</div>
							<ShipHeadingIndicator recommendation={recommendation} />
						</div>
						<div className="mt-4 w-fit max-w-full rounded-lg border border-white/70 bg-white/75 px-3 py-3 shadow-sm">
							<p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Anbefalt fart</p>
							<p className="mt-1 text-2xl font-semibold leading-none text-gray-900">{error ? "—" : speedText}</p>
						</div>
					</div>

				<dl className="mt-4 grid grid-cols-2 gap-3">
					<Metric label="Vind" value={windText(current?.windSpeedMs, current?.windFromDeg)} />
					<Metric label="Kast" value={windText(current?.gustMs, current?.windFromDeg)} />
					<Metric label="Svell" value={swellText(current)} sub={waveState?.label ?? "svelldata"} className="col-span-2" />
				</dl>

				<div className="mt-4 grid gap-3 sm:grid-cols-[8rem_1fr]">
					<MiniDirectionCompass windFromDeg={current?.windFromDeg ?? null} waveFromDeg={current?.waveFromDeg ?? null} />
					<TrendBars points={data?.points.slice(0, 8) ?? []} />
				</div>

				<div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-3 text-xs text-gray-500">
					<p className="min-w-0">{loading ? "Henter MET-data…" : `Kilder: ${data?.sources.wind ?? "—"} / ${data?.sources.swell ?? "—"}`}</p>
					<button type="button" onClick={refresh} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 shadow-sm hover:bg-gray-50">
						Oppdater
					</button>
				</div>
				<p className="mt-2 text-xs text-gray-400">Sist oppdatert: {formatTime(data?.updatedAt)}</p>
			</div>
		</article>
	);
}

function ShipHeadingIndicator({ recommendation }: { recommendation: BoardingHeadingRecommendation }) {
	const heading = recommendation.headingDeg;
	return (
		<div className="flex h-36 w-28 shrink-0 flex-col items-center justify-between rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
			<p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Skip</p>
			<svg className="h-16 w-16" viewBox="0 0 100 100" role="img" aria-label="Anbefalt skipsretning">
				<circle cx="50" cy="50" r="42" fill="#f8fafc" stroke="#e5e7eb" strokeWidth="3" />
				{heading == null ? <text fill={recommendation.color} fontSize="42" fontWeight="900" textAnchor="middle" x="50" y="65">!</text> : <g transform={`rotate(${heading} 50 50)`}><path d="M50 7 L66 45 L56 41 L56 88 L44 88 L44 41 L34 45 Z" fill={recommendation.color} /></g>}
			</svg>
			<p className="text-lg font-semibold leading-none text-gray-900">{heading == null ? "—" : `${heading.toFixed(0)}°`}</p>
		</div>
	);
}

function MiniDirectionCompass({ windFromDeg, waveFromDeg }: { windFromDeg: number | null; waveFromDeg: number | null }) {
	const windToDeg = windFromDeg == null ? null : flowDirectionFrom(windFromDeg);
	const waveToDeg = waveFromDeg == null ? null : flowDirectionFrom(waveFromDeg);
	return (
		<div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center">
			<p className="text-[11px] font-semibold text-gray-500">N</p>
			<svg className="mx-auto h-20 w-20" viewBox="0 0 100 100" role="img" aria-label="Retning for vind og svell">
				<circle cx="50" cy="50" r="43" fill="#ffffff" stroke="#d1d5db" strokeWidth="2" />
				<path d="M50 8V92M8 50H92" stroke="#d1d5db" strokeLinecap="round" strokeWidth="1.5" />
				{waveToDeg != null && <CompassArrow deg={waveToDeg} color="#10b981" wide />}
				{windToDeg != null && <CompassArrow deg={windToDeg} color="#0ea5e9" />}
				<circle cx="50" cy="50" r="3.5" fill="#111827" />
			</svg>
			<div className="mt-1 flex justify-center gap-2 text-[10px] font-semibold">
				<span className="text-sky-600">vind</span><span className="text-emerald-600">svell</span>
			</div>
		</div>
	);
}

function CompassArrow({ deg, color, wide = false }: { deg: number; color: string; wide?: boolean }) {
	return <g transform={`rotate(${normalizeDeg(deg)} 50 50)`}><path d={wide ? "M50 6 L63 38 L55 35 L55 76 L45 76 L45 35 L37 38 Z" : "M50 11 L57 28 L52 26 L52 78 L48 78 L48 26 L43 28 Z"} fill={color} opacity={wide ? 0.85 : 1} /></g>;
}

function TrendBars({ points }: { points: LosvaerWeatherPoint[] }) {
	if (points.length === 0) return <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">Trend lastes…</div>;
	const maxWave = Math.max(3, ...points.map((point) => point.seaSurfaceWaveHeightM ?? 0));
	const maxWind = Math.max(18, ...points.map((point) => Math.max(point.windSpeedMs ?? 0, point.gustMs ?? 0)));
	return (
		<div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
			<h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Trend neste timer</h3>
			<div className="mt-3 space-y-2">
				{points.map((point) => <TrendRow key={point.time} point={point} maxWave={maxWave} maxWind={maxWind} />)}
			</div>
		</div>
	);
}

function TrendRow({ point, maxWave, maxWind }: { point: LosvaerWeatherPoint; maxWave: number; maxWind: number }) {
	const wave = point.seaSurfaceWaveHeightM ?? 0;
	const wind = Math.max(point.windSpeedMs ?? 0, point.gustMs ?? 0);
	const state = wave > 0 ? waveStateFor(wave) : null;
	return (
		<div className="grid grid-cols-[3rem_1fr_3.5rem] items-center gap-2 text-xs">
			<span className="text-gray-500">{formatHour(point.time)}</span>
			<div className="space-y-1">
				<Bar color={state?.color ?? "#d1d5db"} width={(wave / maxWave) * 100} />
				<Bar color="#0ea5e9" width={(wind / maxWind) * 100} />
			</div>
			<span className="text-right font-medium text-gray-700">{wave > 0 ? `${wave.toFixed(1)} m` : "—"}</span>
		</div>
	);
}

function Bar({ color, width }: { color: string; width: number }) {
	return <div className="h-1.5 overflow-hidden rounded-full bg-gray-200"><div className="h-full" style={{ width: `${Math.min(100, Math.max(0, width))}%`, background: color }} /></div>;
}

function Metric({ label, value, sub, className = "" }: { label: string; value: ReactNode; sub?: string; className?: string }) {
	return <div className={`rounded-lg bg-gray-50 p-3 ${className}`}><dt className="text-xs font-medium text-gray-500">{label}</dt><dd className="mt-1 text-base font-semibold text-gray-900">{value}</dd>{sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}</div>;
}

function waveStateFor(heightM: number) {
	if (heightM < 2.5) return { label: "Lav risiko", color: "#22c55e" };
	if (heightM <= 4.5) return { label: "Moderat risiko", color: "#facc15" };
	return { label: "Høy risiko", color: "#ef4444" };
}

function windText(speedMs: number | null | undefined, fromDeg: number | null | undefined) {
	if (speedMs == null) return "—";
	const speed = `${msToKnots(speedMs).toFixed(0)} kt`;
	return fromDeg == null ? speed : `${speed} fra ${fromDeg.toFixed(0)}°`;
}

function swellText(point: LosvaerWeatherPoint | null) {
	if (point?.seaSurfaceWaveHeightM == null) return "—";
	const swell = `${point.seaSurfaceWaveHeightM.toFixed(1)} m`;
	return point.waveFromDeg == null ? swell : `${swell} fra ${point.waveFromDeg.toFixed(0)}°`;
}

function formatHour(value: string) {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
}

function formatTime(value: string | null | undefined) {
	if (!value) return "—";
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : date.toLocaleString("nb-NO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
