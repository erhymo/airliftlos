import { getDb } from "./firebaseAdmin";

export type PoliceLiveSettings = {
	isLive: boolean;
	liveFrom: number | null;
	liveFromIso: string | null;
	updatedAt?: number;
};

type LiveSettingsDoc = {
	isLive?: unknown;
	liveFrom?: unknown;
	updatedAt?: unknown;
};

function asNumber(value: unknown) {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function parseLiveFrom(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
	if (typeof value === "string" && value.trim()) {
		const millis = new Date(value).getTime();
		return Number.isFinite(millis) ? millis : null;
	}
	if (value && typeof value === "object") {
		const maybeTimestamp = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
		if (typeof maybeTimestamp.toMillis === "function") {
			const millis = maybeTimestamp.toMillis();
			return Number.isFinite(millis) ? millis : null;
		}
		if (typeof maybeTimestamp.seconds === "number") return maybeTimestamp.seconds * 1000 + Math.floor((maybeTimestamp.nanoseconds ?? 0) / 1_000_000);
	}
	return null;
}

export async function getPoliceLiveSettings(): Promise<PoliceLiveSettings> {
	const snapshot = await getDb().collection("policeSettings").doc("live").get();
	const data = snapshot.exists ? (snapshot.data() as LiveSettingsDoc) : null;
	const liveFrom = data ? parseLiveFrom(data.liveFrom) : null;
	return {
		isLive: Boolean(data?.isLive && liveFrom),
		liveFrom,
		liveFromIso: liveFrom ? new Date(liveFrom).toISOString() : null,
		updatedAt: asNumber(data?.updatedAt) || undefined,
	};
}

export function recordIsAfterPoliceLiveStart(settings: PoliceLiveSettings, values: { createdAt?: unknown; date?: string; time?: string }) {
	if (!settings.isLive || !settings.liveFrom) return true;
	const createdAt = asNumber(values.createdAt);
	if (createdAt) return createdAt >= settings.liveFrom;
	const date = values.date?.trim();
	if (!date) return false;
	const time = values.time?.trim() || "23:59";
	const millis = new Date(`${date}T${time}:00`).getTime();
	return Number.isFinite(millis) ? millis >= settings.liveFrom : false;
}
