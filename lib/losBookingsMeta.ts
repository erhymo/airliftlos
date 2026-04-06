import type { Firestore } from "firebase-admin/firestore";

import { isOpenLosBooking } from "./losBookings";

export type LosBookingsMeta = {
	openCount: number;
	version: number;
	updatedAt: number;
};

const META_COLLECTION = "losBookingsMeta";
const META_DOC_ID = "current";

function getMetaRef(db: Firestore) {
	return db.collection(META_COLLECTION).doc(META_DOC_ID);
}

function normalizeMeta(data?: Record<string, unknown>): LosBookingsMeta | null {
	if (!data) return null;

	return {
		openCount: typeof data.openCount === "number" ? data.openCount : 0,
		version: typeof data.version === "number" ? data.version : 0,
		updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
	};
}

async function countOpenLosBookings(db: Firestore) {
	try {
		const snapshot = await db.collection("losBookings").where("status", "==", "open").count().get();
		return snapshot.data().count;
	} catch (error) {
		console.error("losBookingsMeta: count()-spørring feilet, bruker fallback", error);
		const snapshot = await db.collection("losBookings").get();
		return snapshot.docs.reduce((acc, doc) => {
			const data = doc.data() as { status?: string | null };
			return isOpenLosBooking(data) ? acc + 1 : acc;
		}, 0);
	}
}

export async function getLosBookingsMeta(db: Firestore) {
	const snapshot = await getMetaRef(db).get();
	return snapshot.exists ? normalizeMeta(snapshot.data() as Record<string, unknown>) : null;
}

export async function getOrCreateLosBookingsMeta(db: Firestore) {
	const existing = await getLosBookingsMeta(db);
	if (existing) return existing;

	const meta: LosBookingsMeta = {
		openCount: await countOpenLosBookings(db),
		version: 0,
		updatedAt: Date.now(),
	};

	await getMetaRef(db).set(meta, { merge: true });
	return meta;
}

export async function touchLosBookingsMeta(
	db: Firestore,
	{ openCountDelta = 0, bumpVersion = true }: { openCountDelta?: number; bumpVersion?: boolean } = {},
) {
	await getOrCreateLosBookingsMeta(db);
	const ref = getMetaRef(db);

	return db.runTransaction(async (transaction) => {
		const snapshot = await transaction.get(ref);
		const current = normalizeMeta(snapshot.data() as Record<string, unknown> | undefined) ?? {
			openCount: 0,
			version: 0,
			updatedAt: 0,
		};

		const next: LosBookingsMeta = {
			openCount: Math.max(0, current.openCount + openCountDelta),
			version: bumpVersion ? current.version + 1 : current.version,
			updatedAt: Date.now(),
		};

		transaction.set(ref, next, { merge: true });
		return next;
	});
}