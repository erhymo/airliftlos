// Datamodell og hjelpefunksjoner for erfaringsrapporten som kreves av
// Luftfartstilsynets dispensasjon for av-/anti-isingsutstyr (gjelder Crew
// Change-oppdrag med AW169 uten slikt utstyr). Se dispensasjonsvedtaket
// 25/34384-7, gyldig fra vedtaksdato til og med 30. april 2027.

export type CrewChangeBase = "Bergen" | "Hammerfest";
export type CrewChangeOutcome = "completed" | "postponed" | "cancelled";
export type CrewChangeReason = "ising" | "lyn" | "vind" | "bolger" | "sikt" | "annet";

export const CREW_CHANGE_REASONS: CrewChangeReason[] = ["ising", "lyn", "vind", "bolger", "sikt", "annet"];

export const CREW_CHANGE_REASON_LABELS: Record<CrewChangeReason, string> = {
	ising: "Ising",
	lyn: "Lyn og torden",
	vind: "Vind",
	bolger: "Bølger",
	sikt: "Sikt og skyer",
	annet: "Annet",
};

export const CREW_CHANGE_EVENTS_COLLECTION = "crewChangeEvents";

// Dispensasjonen (25/34384-7) gjelder fra vedtaksdato til og med 30. april 2027.
export const DISPENSATION_START_ISO = "2026-09-03T00:00:00.000Z";
export const DISPENSATION_END_ISO = "2027-04-30T23:59:59.999Z";
export const DISPENSATION_START_MS = Date.parse(DISPENSATION_START_ISO);
export const DISPENSATION_END_MS = Date.parse(DISPENSATION_END_ISO);

export type CrewChangeWeatherSnapshot = {
	metar: string[];
	taf: string[];
};

export type CrewChangeEvent = {
	id: string;
	createdAt: number;
	base: CrewChangeBase;
	outcome: CrewChangeOutcome;
	reasons?: CrewChangeReason[];
	comment?: string;
	weather?: CrewChangeWeatherSnapshot;
};

const BASE_TO_ICAO: Record<CrewChangeBase, string> = {
	Bergen: "ENBR",
	Hammerfest: "ENHF",
};

const USER_AGENT = "airliftlos-crewchange/1.0 https://airlift.no";

/**
 * Henter siste METAR/TAF-linjer for en base, samme kilde som appens
 * øvrige METAR/TAF-visning. Feiler aldri hardt – returnerer tomme lister
 * hvis MET ikke svarer, slik at selve hendelsen uansett kan lagres.
 */
export async function fetchCrewChangeWeather(base: CrewChangeBase): Promise<CrewChangeWeatherSnapshot> {
	const icao = BASE_TO_ICAO[base];
	try {
		const res = await fetch(`https://api.met.no/weatherapi/tafmetar/1.0/tafmetar.txt?icao=${icao}`, {
			headers: { "User-Agent": USER_AGENT },
			cache: "no-store",
		});
		if (!res.ok) return { metar: [], taf: [] };

		const text = await res.text();
		const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
		const taf: string[] = [];
		const metar: string[] = [];
		for (const line of lines) {
			const parts = line.split(/\s+/);
			// Etter stasjonskode og tidspunkt kommer gyldighetsperiode for TAF (inneholder "/"),
			// METAR har ikke det – samme skille som brukes i app/api/weather/route.ts.
			if (parts.length >= 3 && parts[2].includes("/")) taf.push(line);
			else metar.push(line);
		}
		return { metar: metar.slice(-3), taf: taf.slice(-3) };
	} catch {
		return { metar: [], taf: [] };
	}
}

export function isCrewChangeReason(value: unknown): value is CrewChangeReason {
	return typeof value === "string" && (CREW_CHANGE_REASONS as string[]).includes(value);
}

export function isCrewChangeBase(value: unknown): value is CrewChangeBase {
	return value === "Bergen" || value === "Hammerfest";
}
