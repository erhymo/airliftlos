// Delt lagringsformat for utmelding-boblen på forsiden (UtmeldingForsideClient.tsx)
// og selve utmeldingsskjemaet (app/politiet/PolitietClient.tsx), slik at begge er
// enige om nøkkel og datastruktur.

export interface PoliceUtmeldingLite {
	id: string;
	base: string;
	date: string;
	time: string;
	createdAt?: number;
	createdOnDeviceId?: string;
	innmeldtSendtAt?: number;
	innmeldtDato?: string;
	innmeldtTid?: string;
	innmeldtKommentar?: string;
}

export const POLICE_UTMELDING_STORAGE_KEY = "politiet_utmelding_reports_v1";

export function loadLocalUtmeldinger(): PoliceUtmeldingLite[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = localStorage.getItem(POLICE_UTMELDING_STORAGE_KEY);
		if (!raw) return [];
		const arr = JSON.parse(raw);
		if (!Array.isArray(arr)) return [];
		return arr as PoliceUtmeldingLite[];
	} catch {
		return [];
	}
}

export function saveLocalUtmeldinger(reports: PoliceUtmeldingLite[]) {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(POLICE_UTMELDING_STORAGE_KEY, JSON.stringify(reports));
	} catch {
		// Ignorer lagringsfeil (f.eks. fullt lager) – innmelding kan uansett gjøres via "Hent min siste utmelding".
	}
}
