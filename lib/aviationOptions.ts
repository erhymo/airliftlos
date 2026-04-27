export const MASKINER = ["LN-OXH", "LN-OXI", "LN-OXJ", "LN-OXK"] as const;
export type Maskin = (typeof MASKINER)[number];
export const DEFAULT_MASKIN: Maskin = MASKINER[0];

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
].sort((a, b) => a.localeCompare(b, "nb-NO"));

export const TECHNICIANS = [
	"MÆL",
	"KRO",
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