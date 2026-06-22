import { getLosvaerPlaceById } from "@/lib/losvaer/places";
import { normalizeDeg } from "@/lib/losvaer/boarding";
import type { LosvaerWeatherPoint } from "@/lib/losvaer/boarding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ForecastEntry = {
	time?: string;
	data?: {
		instant?: { details?: Record<string, number> };
		next_1_hours?: { details?: Record<string, number> };
		next_6_hours?: { details?: Record<string, number> };
		next_12_hours?: { details?: Record<string, number> };
	};
};
type MetResponse = { properties?: { meta?: { updated_at?: string }; timeseries?: ForecastEntry[] } };

const USER_AGENT = "airliftlos-losvaer/1.0 https://airlift.no";

export async function GET(req: Request) {
	const placeId = new URL(req.url).searchParams.get("place") ?? "holmengra";
	const place = getLosvaerPlaceById(placeId);
	if (!place) return Response.json({ error: "Ukjent LOS-værplass" }, { status: 404 });

	const locationUrl = `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${place.lat}&lon=${place.lon}`;
	const oceanUrl = `https://api.met.no/weatherapi/oceanforecast/2.0/complete?lat=${place.lat}&lon=${place.lon}`;
	const [locationResult, oceanResult] = await Promise.allSettled([fetchMetJson(locationUrl), fetchMetJson(oceanUrl)]);

	if (locationResult.status !== "fulfilled") {
		return Response.json({ error: "Klarte ikke å hente vinddata fra MET" }, { status: 502 });
	}

	const location = locationResult.value;
	const ocean = oceanResult.status === "fulfilled" ? oceanResult.value : null;
	const points = combineForecasts(location, ocean);

	return Response.json({
		place,
		current: points[0] ?? null,
		points,
		updatedAt: location.properties?.meta?.updated_at ?? ocean?.properties?.meta?.updated_at ?? new Date().toISOString(),
		sources: { wind: "MET Locationforecast", swell: ocean ? "MET Oceanforecast" : "Ikke tilgjengelig", lightning: "MET Locationforecast" },
	});
}

async function fetchMetJson(url: string): Promise<MetResponse> {
	const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, next: { revalidate: 300 } });
	if (!res.ok) throw new Error(`MET svarte HTTP ${res.status}`);
	return res.json() as Promise<MetResponse>;
}

function combineForecasts(location: MetResponse, ocean: MetResponse | null): LosvaerWeatherPoint[] {
	const now = Date.now();
	const windPoints = toWindPoints(location, now);
	const swellPoints = toSwellPoints(ocean, now);
	if (swellPoints.length === 0) return windPoints.slice(0, 12);
	return swellPoints.slice(0, 12).map((swellPoint) => {
		const windPoint = nearestPoint(windPoints, swellPoint.time);
		return {
			...swellPoint,
			windSpeedMs: windPoint?.windSpeedMs ?? null,
			gustMs: windPoint?.gustMs ?? null,
			windFromDeg: windPoint?.windFromDeg ?? null,
				thunderProbabilityPercent: windPoint?.thunderProbabilityPercent ?? null,
		};
	});
}

function toWindPoints(location: MetResponse, now: number): LosvaerWeatherPoint[] {
	return (location.properties?.timeseries ?? []).filter((entry) => !entry.time || Date.parse(entry.time) >= now - 30 * 60 * 1000).slice(0, 60).flatMap((entry) => {
		const details = entry.data?.instant?.details ?? {};
		const nextHourDetails = entry.data?.next_1_hours?.details ?? {};
		const windSpeedMs = numberOrNull(details.wind_speed);
		const windFromDeg = numberOrNull(details.wind_from_direction);
		if (windSpeedMs == null || windFromDeg == null) return [];
		return {
			time: entry.time ?? new Date().toISOString(),
			windSpeedMs,
			gustMs: numberOrNull(details.wind_speed_of_gust) ?? numberOrNull(nextHourDetails.wind_speed_of_gust),
			windFromDeg: windFromDeg == null ? null : normalizeDeg(windFromDeg),
				thunderProbabilityPercent: thunderProbability(entry),
			seaSurfaceWaveHeightM: null,
			waveFromDeg: null,
		};
	});
}

function toSwellPoints(ocean: MetResponse | null, now: number): LosvaerWeatherPoint[] {
	return (ocean?.properties?.timeseries ?? []).filter((entry) => !entry.time || Date.parse(entry.time) >= now - 30 * 60 * 1000).slice(0, 60).flatMap((entry) => {
		const details = entry.data?.instant?.details ?? {};
		const heightM = numberOrNull(details.sea_surface_wave_height);
		if (heightM == null) return [];
		const waveFromDeg = numberOrNull(details.sea_surface_wave_from_direction);
		return {
			time: entry.time ?? new Date().toISOString(),
			windSpeedMs: null,
			gustMs: null,
			windFromDeg: null,
			thunderProbabilityPercent: null,
			seaSurfaceWaveHeightM: heightM,
			waveFromDeg: waveFromDeg == null ? null : normalizeDeg(waveFromDeg),
		};
	});
}

function thunderProbability(entry: ForecastEntry) {
	return numberOrNull(entry.data?.next_1_hours?.details?.probability_of_thunder)
		?? numberOrNull(entry.data?.next_6_hours?.details?.probability_of_thunder)
		?? numberOrNull(entry.data?.next_12_hours?.details?.probability_of_thunder);
}

function nearestPoint(points: LosvaerWeatherPoint[], isoTime: string) {
	const target = Date.parse(isoTime);
	if (!Number.isFinite(target)) return null;
	let best: LosvaerWeatherPoint | null = null;
	let bestDelta = Number.POSITIVE_INFINITY;
	for (const point of points) {
		const time = Date.parse(point.time);
		if (!Number.isFinite(time)) continue;
		const delta = Math.abs(time - target);
		if (delta < bestDelta) {
			best = point;
			bestDelta = delta;
		}
	}
	return bestDelta <= 90 * 60 * 1000 ? best : null;
}

function numberOrNull(value: unknown) {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}