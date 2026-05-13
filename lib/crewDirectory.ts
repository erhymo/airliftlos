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
	{ id: "captain-amu", code: "AMU", fullName: "Bjørn Frode Amundsen", phone: "901 68 773", role: "captain", active: true },
	{ id: "captain-gun", code: "GUN", fullName: "Terje Gundersen", phone: "909 50 884", role: "captain", active: true },
	{ id: "captain-fol", code: "FOL", fullName: "Stian Follaug", phone: "995 42 232", role: "captain", active: true },
	{ id: "captain-lei", code: "LEI", fullName: "Nils Roger Leithe", phone: "952 50 119", role: "captain", active: true },
	{ id: "captain-hus", code: "HUS", fullName: "Leif Hus", phone: "952 50 104", role: "captain", active: true },
	{ id: "captain-brae", code: "BRÆ", fullName: "Sigbjørn Brækhus", phone: "958 12 412", role: "captain", active: true },
	{ id: "captain-loo", code: "LOO", fullName: "Vidar Loose", phone: "906 02 551", role: "captain", active: true },
	{ id: "captain-tja", code: "TJA", fullName: "Claus Tjalve", phone: "+46 70 290 2089", role: "captain", active: true },
	{ id: "captain-tur", code: "TUR", fullName: "Einar Turlid", phone: "952 50 113", role: "captain", active: true },
	{ id: "captain-mael", code: "MÆL", fullName: "Åge Mæland", phone: "913 28 512", role: "captain", active: true },
	{ id: "captain-bac", code: "BAC", fullName: "Øyvind Juel Bache", phone: "982 13 413", role: "captain", active: true },
	{ id: "captain-ohn", code: "OHN", fullName: "Mikal Ohnstad", phone: "901 10 207", role: "captain", active: true },
	{ id: "first-officer-lun", code: "LUN", fullName: "Bjørnar Lund", phone: "413 03 358", role: "firstOfficer", active: true },
	{ id: "first-officer-kir", code: "KIR", fullName: "Kristian Krog", role: "firstOfficer", active: true },
	{ id: "first-officer-dam", code: "DAM", fullName: "Dagfinn Damsgaard", phone: "971 87 220", role: "firstOfficer", active: true },
	{ id: "first-officer-ost", code: "ØST", fullName: "Tom Andreas Østrem", phone: "986 23 414", role: "firstOfficer", active: true },
	{ id: "first-officer-han", code: "HAN", fullName: "Henning Hansen", phone: "975 21 061", role: "firstOfficer", active: true },
	{ id: "first-officer-myh", code: "MYH", fullName: "Øyvind Myhre", phone: "917 53 151", role: "firstOfficer", active: true },
	{ id: "first-officer-sma", code: "SMÅ", fullName: "Ivan Småland", phone: "979 93 040", role: "firstOfficer", active: true },
	{ id: "first-officer-kon", code: "KON", fullName: "Per Kristian Kongsvik", phone: "415 15 750", role: "firstOfficer", active: true },
	{ id: "first-officer-kro", code: "KRO", fullName: "", role: "firstOfficer", active: true },
	{ id: "technician-mael", code: "MÆL", fullName: "", role: "technician", active: true },
	{ id: "technician-dyp", code: "DYP", fullName: "", role: "technician", active: true },
	{ id: "technician-ste", code: "STE", fullName: "", role: "technician", active: true },
	{ id: "technician-fik", code: "FIK", fullName: "", role: "technician", active: true },
	{ id: "technician-hov", code: "HØV", fullName: "", role: "technician", active: true },
	{ id: "technician-rot", code: "ROT", fullName: "", role: "technician", active: true },
	{ id: "technician-ads", code: "ADS", fullName: "", role: "technician", active: true },
	{ id: "technician-fes", code: "FES", fullName: "Jøran Festervoll", role: "technician", active: true },
	{ id: "technician-hes", code: "HES", fullName: "", role: "technician", active: true },
];

const RETIRED_CREW_DIRECTORY_ENTRY_IDS = new Set([
	"first-officer-hol",
]);

const RETIRED_CREW_DIRECTORY_ROLE_CODES = new Set([
	"firstOfficer:HOL",
]);

export function isCrewRole(value: unknown): value is CrewRole {
	return typeof value === "string" && CREW_ROLES.includes(value as CrewRole);
}

export function normalizeCrewCode(value: string) {
	return value.trim().toLocaleUpperCase("nb-NO");
}

export function isRetiredCrewDirectoryEntry(entry: Pick<CrewDirectoryEntry, "id" | "code" | "role">) {
	return RETIRED_CREW_DIRECTORY_ENTRY_IDS.has(entry.id) || RETIRED_CREW_DIRECTORY_ROLE_CODES.has(`${entry.role}:${normalizeCrewCode(entry.code)}`);
}

export function formatCrewDirectoryEntry(entry: Pick<CrewDirectoryEntry, "code" | "fullName">) {
	const code = normalizeCrewCode(entry.code);
	const fullName = entry.fullName.trim();
	if (fullName && code) return `${fullName} (${code})`;
	return fullName || code;
}

export function activeCrewCodesByRoles(entries: CrewDirectoryEntry[], roles: readonly CrewRole[]) {
	return Array.from(
		new Set(
			entries
				.filter((entry) => entry.active && roles.includes(entry.role))
				.map((entry) => normalizeCrewCode(entry.code))
				.filter(Boolean),
		),
	).sort((a, b) => a.localeCompare(b, "nb-NO"));
}

export function sortCrewDirectoryEntries(entries: CrewDirectoryEntry[]) {
	return [...entries].sort((a, b) => {
		if (a.active !== b.active) return a.active ? -1 : 1;
		if (a.role !== b.role) return CREW_ROLES.indexOf(a.role) - CREW_ROLES.indexOf(b.role);
		return formatCrewDirectoryEntry(a).localeCompare(formatCrewDirectoryEntry(b), "nb-NO");
	});
}

function crewDirectoryKey(entry: Pick<CrewDirectoryEntry, "code" | "role">) {
	return `${entry.role}:${normalizeCrewCode(entry.code)}`;
}

export function mergeCrewDirectoryEntries(entries: CrewDirectoryEntry[]) {
	const merged = new Map<string, CrewDirectoryEntry>();
	for (const entry of entries) {
		const key = crewDirectoryKey(entry);
		const existing = merged.get(key);
		const normalizedEntry = { ...entry, code: normalizeCrewCode(entry.code) };
		if (!existing) {
			merged.set(key, normalizedEntry);
			continue;
		}

		merged.set(key, {
			...existing,
			...normalizedEntry,
			fullName: normalizedEntry.fullName.trim() || existing.fullName,
			phone: normalizedEntry.phone || existing.phone,
			updatedAt: normalizedEntry.updatedAt ?? existing.updatedAt,
		});
	}

	return sortCrewDirectoryEntries(Array.from(merged.values()));
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