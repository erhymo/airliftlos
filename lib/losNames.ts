export const CANONICAL_LOS_NAMES = [
	"Anders Andrè Andersen", "Anders Melingen", "Anders Norstrand", "Anders Sangolt", "Are Aksnes",
	"Arild Lofthus", "Arne Gunnleiv Sæthre", "Arne Halvorsen", "Arnfinn Olav Remøy", "Arnt Egil Bjellvåg",
	"Arve Bjørnulf Bøe", "Arve Gangåssæter", "Asbjørn Austevoll", "Asbjørn Birkeli", "Audun Olsen",
	"Bent Elias Berntsen", "Bjarte Hindenes", "Bjarte Røksund", "Bjørn Helge Hjelmeland", "Bjørn Richard Abrahamsen",
	"Bjørnar Sæther", "Bård Magne Lunde", "Carl Ellingsen", "Christian Wilhelmsen", "Dag-Erik Kvalheim",
	"Dagfinn Fjeldstad", "Dagfinn Olsen", "Eirik Eriksen", "Eivind Sangolt", "Erlend Vik",
	"Espen Alsaker", "Espen Johnsen", "Frank-Roy Moltu", "Frode Arnesen", "Frode Møllerhaug",
	"Gaute Dyregro Haukeland", "Geir Bøe", "Geir Heggeset", "Geir Ognøy", "Geir Pettersen",
	"Geir Sigve Thorsen", "Geir-Arne Jensen", "Geirmund Stormark", "Gisle Aasebø", "Hallvard Nygård",
	"Halvard Grøneng", "Halvard Høydalsvik", "Hans-Arne Fylkesnes", "Hans Christian Ådlandsvik", "Harald Magne Bakken",
	"Helge Didriksen", "Holger Kåre Pettersen", "Håvar Sandvik", "Idar Moldøen", "Inge Johan Fagerheim",
	"Inge Olaissen", "Inge Ottar Sætrevik", "Jan Erik Fjeldsbø", "Jan Erik Lerum", "Jan I Nilsen",
	"Jan Kenneth Flygansvær", "Jan Magne Fosse", "Jan Ola Flåhammer", "Jan Ståle Sørensen", "Jan Terje Skåtevik",
	"Jan Vevatne", "John Petter Strand", "John Sigurd Torvik", "Jon Inge Nilsen", "Jon Aasberg",
	"Jon Sigurd Trovik", "Jostein Galtung", "Jostein Larsen", "Karl Andreas Njåstad", "Karl Helge Haagensen",
	"Karstein Helge Økland", "Ken Tommy Pettersen", "Kenneth Eilif Karlsen", "Kenneth Sandmo", "Kjell Arne Nes",
	"Kjell Evensen", "Kjell-Inge Telle", "Kjetil Magnussen", "Knut Arne Mikalsen", "Knut Egil Dyngeland",
	"Knut Inge Melingen", "Knut Steffensen", "Kristian Bratthammer", "Kristen Østhus", "Kristian Valberg",
	"Kristoffer Eidissen", "Lars Engvik", "Laurits Sund", "Leif Morten Slotvik", "Martin Jensen",
	"Martin Strømdahl", "Modstein Hansen", "Morten G. Urheim", "Morten Gunnar Telle", "Oddbjørn Snorre Hårsvær",
	"Odd Marvin Holberg", "Odd Roger Grinde", "Ola Moen", "Ole Andreas Vatle-Dahl", "Ole J. Henjesand",
	"Ole Magnus Benestvedt", "Ole Wille", "Onar Jøsang", "Ottar Eide", "Ove Arild Alfheim",
	"Ove Henning Smelvær", "Ove Valderhaug", "Per Herman Syre", "Per Morten Brennvik", "Remi Endre Hagenes",
	"Roger Notøy", "Roger Vik", "Rolf Magne Hausken", "Ronald Rydningen", "Ronny Stokkan",
	"Roy Pedersen", "Sigbjørn Tjoflot", "Sindre Myhre", "Solgunn Breivik Homme", "Staale Lemvig",
	"Stian Fonnes", "Stig Petter Midtbø", "Ståle Fagerstad", "Svein Austrheim", "Svein Boge",
	"Svein Egil Monsen", "Svein Henning Waagene", "Terje Mjølsvik", "Terje Sudmann", "Torbjørn Vinnes",
	"Tor-Steve Bendiksen", "Tore Anton Årvik", "Tore Espeland", "Tore Hella", "Tore Lund",
	"Tore Nystøyl", "Tormod Sivertsen", "Torry Sakkariassen", "Trond Myklevoll", "Trond Nybakk",
	"Tronn Stadsøy", "Vegard Hatland", "Vermund Halhjem", "Vidar Undertun", "Willy Olsen",
	"Ørjan Boge", "Ørjan Østrem", "Øystein Handegård", "Øystein Hesthamar",
].sort((a, b) => a.localeCompare(b, "nb-NO"));

export type LosNameMatchMethod = "exact" | "normalized" | "alias" | "fuzzy" | "raw";

export type LosNameResolution = {
	rawName: string;
	name: string;
	method: LosNameMatchMethod;
	score: number;
	candidates?: string[];
};

const KNOWN_ALIASES: Record<string, string> = {
	"Anders Synsvoll Sangolt": "Anders Sangolt",
	"Hans Arne Fylkesnes": "Hans-Arne Fylkesnes",
	"Lauritz Sund": "Laurits Sund",
	"Ole Johnny Harberg Henjesand": "Ole J. Henjesand",
	"Per-Morten Brennvik": "Per Morten Brennvik",
	"Ronald Arnt Jarle Rydningen": "Ronald Rydningen",
	"Vegar Hatland": "Vegard Hatland",
};

export function normalizeLosNameForMatch(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[.’'`]/g, "")
		.replace(/[-–—_/]/g, " ")
		.replace(/[^a-zæøå0-9\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function nameTokens(value: string): string[] {
	return normalizeLosNameForMatch(value).split(" ").filter(Boolean);
}

function levenshtein(a: string, b: string): number {
	const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i += 1) {
		let last = i - 1;
		prev[0] = i;
		for (let j = 1; j <= b.length; j += 1) {
			const old = prev[j];
			prev[j] = a[i - 1] === b[j - 1] ? last : Math.min(last, prev[j - 1], prev[j]) + 1;
			last = old;
		}
	}
	return prev[b.length] ?? 0;
}

const CANONICAL_BY_NORMALIZED = new Map(CANONICAL_LOS_NAMES.map((name) => [normalizeLosNameForMatch(name), name]));
const ALIAS_BY_NORMALIZED = new Map(Object.entries(KNOWN_ALIASES).map(([alias, name]) => [normalizeLosNameForMatch(alias), name]));

function scoreLosName(rawName: string, canonicalName: string): number {
	const raw = normalizeLosNameForMatch(rawName);
	const canonical = normalizeLosNameForMatch(canonicalName);
	if (!raw || !canonical) return 0;
	if (raw === canonical) return 1;

	const rawTokens = new Set(nameTokens(rawName));
	const canonicalTokens = nameTokens(canonicalName);
	if (canonicalTokens.every((token) => rawTokens.has(token))) {
		return Math.max(0.84, 0.94 - (rawTokens.size - canonicalTokens.length) * 0.03);
	}
	if (canonicalTokens.length >= 2 && rawTokens.has(canonicalTokens[0]) && rawTokens.has(canonicalTokens[canonicalTokens.length - 1])) {
		return 0.86;
	}

	const distance = levenshtein(raw, canonical);
	return 1 - distance / Math.max(raw.length, canonical.length);
}

export function resolveLosName(rawName: string): LosNameResolution {
	const trimmed = rawName.replace(/\s+/g, " ").trim();
	if (!trimmed) return { rawName, name: "", method: "raw", score: 0 };

	const normalized = normalizeLosNameForMatch(trimmed);
	const normalizedMatch = CANONICAL_BY_NORMALIZED.get(normalized);
	if (normalizedMatch) {
		return { rawName: trimmed, name: normalizedMatch, method: trimmed === normalizedMatch ? "exact" : "normalized", score: 1 };
	}

	const aliasMatch = ALIAS_BY_NORMALIZED.get(normalized);
	if (aliasMatch) return { rawName: trimmed, name: aliasMatch, method: "alias", score: 1 };

	const scored = CANONICAL_LOS_NAMES
		.map((name) => ({ name, score: scoreLosName(trimmed, name) }))
		.sort((a, b) => b.score - a.score);
	const best = scored[0];
	const second = scored[1];
	const isAmbiguous = best && second && best.score >= 0.82 && second.score >= 0.82 && best.score - second.score < 0.08;
	if (best && best.score >= 0.82 && !isAmbiguous) {
		return { rawName: trimmed, name: best.name, method: "fuzzy", score: Number(best.score.toFixed(3)) };
	}

	return {
		rawName: trimmed,
		name: trimmed,
		method: "raw",
		score: best ? Number(best.score.toFixed(3)) : 0,
		candidates: scored.filter((item) => item.score >= 0.82).slice(0, 3).map((item) => item.name),
	};
}

export function resolveLosNames(rawNames: string[]): LosNameResolution[] {
	return rawNames.map(resolveLosName).filter((item) => item.name.length > 0);
}
