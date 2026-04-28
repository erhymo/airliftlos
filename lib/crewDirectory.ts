export const CREW_ROLES = ["captain", "firstOfficer", "technician"] as const;
export type CrewRole = (typeof CREW_ROLES)[number];

export type CrewDirectoryEntry = {
	id: string;
	code: string;
	fullName: string;
	phone?: string;
	role: CrewRole;
	active: boolean;
	updatedAt?: number;
};

export const CREW_ROLE_LABELS: Record<CrewRole, string> = {
	captain: "Fartøysjef",
	firstOfficer: "Co-pilot",
	technician: "Tekniker / Task Specialist",
};

export const DEFAULT_CREW_DIRECTORY: CrewDirectoryEntry[] = [
	{ id: "captain-amu", code: "AMU", fullName: "Bjørn Frode Amundsen", role: "captain", active: true },
	{ id: "captain-gun", code: "GUN", fullName: "Terje Gundersen", role: "captain", active: true },
	{ id: "captain-fol", code: "FOL", fullName: "Stian Follaug", role: "captain", active: true },
	{ id: "captain-lei", code: "LEI", fullName: "Nils Roger Leithe", role: "captain", active: true },
	{ id: "captain-hus", code: "HUS", fullName: "Leif Hus", role: "captain", active: true },
	{ id: "captain-brae", code: "BRÆ", fullName: "Sigbjørn Brækhus", role: "captain", active: true },
	{ id: "captain-loo", code: "LOO", fullName: "Vidar Loose", role: "captain", active: true },
	{ id: "captain-tja", code: "TJA", fullName: "Claus Tjalve", role: "captain", active: true },
	{ id: "captain-tur", code: "TUR", fullName: "Einar Turlid", role: "captain", active: true },
	{ id: "captain-mael", code: "MÆL", fullName: "Åge Mæland", role: "captain", active: true },
	{ id: "captain-bac", code: "BAC", fullName: "Øyvind Bache", role: "captain", active: true },
	{ id: "captain-ohn", code: "OHN", fullName: "Mikal Onhstad", role: "captain", active: true },
	{ id: "first-officer-lun", code: "LUN", fullName: "Bjørnar Lund", role: "firstOfficer", active: true },
	{ id: "first-officer-kir", code: "KIR", fullName: "", role: "firstOfficer", active: true },
	{ id: "first-officer-dam", code: "DAM", fullName: "Dagfinn Damsgaard", role: "firstOfficer", active: true },
	{ id: "first-officer-hol", code: "HOL", fullName: "", role: "firstOfficer", active: true },
	{ id: "first-officer-ost", code: "ØST", fullName: "Tom Østrem", role: "firstOfficer", active: true },
	{ id: "first-officer-han", code: "HAN", fullName: "Henning Hansen", role: "firstOfficer", active: true },
	{ id: "first-officer-myh", code: "MYH", fullName: "Øyvind Myhre", role: "firstOfficer", active: true },
	{ id: "first-officer-sma", code: "SMÅ", fullName: "Ivan Småland", role: "firstOfficer", active: true },
	{ id: "first-officer-kon", code: "KON", fullName: "Per Kristian Kongsvik", role: "firstOfficer", active: true },
	{ id: "technician-mael", code: "MÆL", fullName: "", role: "technician", active: true },
	{ id: "technician-kro", code: "KRO", fullName: "Kristian Krog", role: "technician", active: true },
	{ id: "technician-dyp", code: "DYP", fullName: "", role: "technician", active: true },
	{ id: "technician-ste", code: "STE", fullName: "", role: "technician", active: true },
	{ id: "technician-fik", code: "FIK", fullName: "", role: "technician", active: true },
	{ id: "technician-hov", code: "HØV", fullName: "", role: "technician", active: true },
	{ id: "technician-rot", code: "ROT", fullName: "", role: "technician", active: true },
	{ id: "technician-ads", code: "ADS", fullName: "", role: "technician", active: true },
	{ id: "technician-fes", code: "FES", fullName: "", role: "technician", active: true },
	{ id: "technician-hes", code: "HES", fullName: "", role: "technician", active: true },
];

export function isCrewRole(value: unknown): value is CrewRole {
	return typeof value === "string" && CREW_ROLES.includes(value as CrewRole);
}

export function normalizeCrewCode(value: string) {
	return value.trim().toLocaleUpperCase("nb-NO");
}

export function formatCrewDirectoryEntry(entry: Pick<CrewDirectoryEntry, "code" | "fullName">) {
	const code = normalizeCrewCode(entry.code);
	const fullName = entry.fullName.trim();
	if (fullName && code) return `${fullName} (${code})`;
	return fullName || code;
}

export function sortCrewDirectoryEntries(entries: CrewDirectoryEntry[]) {
	return [...entries].sort((a, b) => {
		if (a.active !== b.active) return a.active ? -1 : 1;
		if (a.role !== b.role) return CREW_ROLES.indexOf(a.role) - CREW_ROLES.indexOf(b.role);
		return formatCrewDirectoryEntry(a).localeCompare(formatCrewDirectoryEntry(b), "nb-NO");
	});
}

const defaultDisplayByRoleAndCode = new Map<string, string>();
const defaultDisplayByCode = new Map<string, string>();
const defaultCodeCounts = new Map<string, number>();

for (const entry of DEFAULT_CREW_DIRECTORY) {
	const code = normalizeCrewCode(entry.code);
	const display = formatCrewDirectoryEntry(entry);
	defaultCodeCounts.set(code, (defaultCodeCounts.get(code) ?? 0) + 1);
	if (entry.fullName) defaultDisplayByRoleAndCode.set(`${entry.role}:${code}`, display);
}

for (const entry of DEFAULT_CREW_DIRECTORY) {
	const code = normalizeCrewCode(entry.code);
	const display = formatCrewDirectoryEntry(entry);
	if (entry.fullName && defaultCodeCounts.get(code) === 1) defaultDisplayByCode.set(code, display);
}

export function formatCrewDisplayName(value: string | undefined) {
	const clean = value?.trim();
	if (!clean) return "";
	if (clean.includes(" ")) return clean;
	return defaultDisplayByCode.get(normalizeCrewCode(clean)) ?? clean;
}

export function formatCrewDisplayNameForRole(value: string | undefined, role: CrewRole) {
	const clean = value?.trim();
	if (!clean) return "";
	if (clean.includes(" ")) return clean;
	return defaultDisplayByRoleAndCode.get(`${role}:${normalizeCrewCode(clean)}`) ?? clean;
}