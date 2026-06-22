import { getLosvaerPlaceById } from "@/lib/losvaer/places";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OffshoreMapEntry = {
	params?: { area?: string; time?: string };
	updated?: string;
};

type LightningMap = {
	time: string;
	url: string;
	area: string;
	areaLabel: string;
	updatedAt: string | null;
};

const USER_AGENT = "airliftlos-losvaer/1.0 https://airlift.no";
const LIGHTNING_MAP_TYPE = "helicoptertriggeredlightningindex";
const HOUR_MS = 60 * 60 * 1000;

export async function GET(req: Request) {
	const placeId = new URL(req.url).searchParams.get("place") ?? "holmengra";
	const place = getLosvaerPlaceById(placeId);
	if (!place) return Response.json({ error: "Ukjent LOS-værplass" }, { status: 404 });

	const area = lightningAreaForPlace(place.id);
	const lightningMaps = await fetchLightningMaps(area);
	return Response.json({ lightningMaps });
}

async function fetchLightningMaps(area: string): Promise<LightningMap[]> {
	const url = `https://api.met.no/weatherapi/offshoremaps/1.0/available.json?type=${LIGHTNING_MAP_TYPE}&area=${area}`;
	const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, next: { revalidate: 300 } });
	if (!res.ok) throw new Error(`MET offshoremaps svarte HTTP ${res.status}`);
	const entries = (await res.json()) as OffshoreMapEntry[];
	return selectLightningMaps(entries, area);
}

function selectLightningMaps(entries: OffshoreMapEntry[], area: string): LightningMap[] {
	const now = Date.now();
	const end = now + 6 * HOUR_MS;
	const maps = entries.flatMap((entry) => {
		const time = entry.params?.time;
		if (!time || entry.params?.area !== area || !Number.isFinite(Date.parse(time))) return [];
		return [{ time, url: lightningMapProxyUrl(area, time), area, areaLabel: lightningAreaLabel(area), updatedAt: entry.updated ?? null }];
	}).sort((a, b) => Date.parse(a.time) - Date.parse(b.time));

	const currentWindow = maps.filter((map) => {
		const time = Date.parse(map.time);
		return time >= now - HOUR_MS && time <= end;
	});
	return (currentWindow.length > 0 ? currentWindow : maps.filter((map) => Date.parse(map.time) >= now).slice(0, 7)).slice(0, 8);
}

function lightningMapProxyUrl(area: string, time: string) {
	const params = new URLSearchParams({ area, time });
	return `/api/losvaer/map?${params.toString()}`;
}

function lightningAreaForPlace(placeId: string) {
	return placeId === "fruholmen" ? "northern_norway" : "western_norway";
}

function lightningAreaLabel(area: string) {
	return area === "northern_norway" ? "Nord-Norge" : "Vest-Norge";
}