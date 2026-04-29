export const MASKINER = ["LN-OXH", "LN-OXI", "LN-OXJ", "LN-OXK"] as const;
export type Maskin = (typeof MASKINER)[number];
export const DEFAULT_MASKIN: Maskin = MASKINER[0];

export type HelicopterContact = {
	mobile: string;
	iridium?: string;
};

export const HELICOPTER_CONTACTS: Record<Maskin, HelicopterContact> = {
	"LN-OXH": { mobile: "907 98 480", iridium: "+88 16 514 87 224" },
	"LN-OXI": { mobile: "476 71 471", iridium: "+88 16 514 86 934" },
	"LN-OXJ": { mobile: "476 68 276", iridium: "+88 16 514 89 223" },
	"LN-OXK": { mobile: "488 55 751" },
};

export const CAPTAINS = [
	"AMU",
	"GUN",
	"FOL",
	"LEI",
	"HUS",
	"BRÆ",
	"LOO",
	"TJA",
	"TUR",
	"MÆL",
	"BAC",
	"OHN",
].sort((a, b) => a.localeCompare(b, "nb-NO"));

export const FIRST_OFFICERS = [
	"LUN",
	"KIR",
	"DAM",
	"HOL",
	"ØST",
	"HAN",
	"MYH",
	"SMÅ",
	"KON",
	"KRO",
].sort((a, b) => a.localeCompare(b, "nb-NO"));

export const TECHNICIANS = [
	"MÆL",
	"DYP",
	"STE",
	"FIK",
	"HØV",
	"ROT",
	"ADS",
	"FES",
	"HES",
].sort((a, b) => a.localeCompare(b, "nb-NO"));

export const ALL_CREW_OPTIONS = Array.from(
	new Set([...CAPTAINS, ...FIRST_OFFICERS, ...TECHNICIANS]),
).sort((a, b) => a.localeCompare(b, "nb-NO"));