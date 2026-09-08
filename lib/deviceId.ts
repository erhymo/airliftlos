// Samme lagringsnøkkel som DriftsforstyrrelseForsideClient.tsx allerede bruker,
// slik at "denne telefonen" er én og samme identitet på tvers av funksjoner.
const DEVICE_ID_KEY = "driftsrapport_device_id";

export function getOrCreateDeviceId(): string {
	if (typeof window === "undefined") return "server";
	try {
		const existing = localStorage.getItem(DEVICE_ID_KEY);
		if (existing) return existing;
		const id = crypto.randomUUID();
		localStorage.setItem(DEVICE_ID_KEY, id);
		return id;
	} catch {
		return "unknown";
	}
}
