// Delt hjelper for å hindre dobbel innsending ved nettverksfeil/dobbelttrykk.
// Klienten lager en unik id én gang per skjema-økt; serveren bruker den som
// Firestore-dokument-id og "krever" den i en transaksjon før arbeidet gjøres,
// slik at et gjentatt forsøk med samme id trygt kan behandles som allerede gjort.
// Samme mønster som allerede brukes i app/api/police/report|crew|utmelding/route.ts.

export function createClientSubmissionId(prefix = "id") {
	return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function cleanClientSubmissionId(value: unknown) {
	const text = typeof value === "string" ? value : "";
	return /^[A-Za-z0-9_-]{8,80}$/.test(text) ? text : "";
}
