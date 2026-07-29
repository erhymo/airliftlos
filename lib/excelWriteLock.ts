import { getDb } from "./firebaseAdmin";

const LOCK_COLLECTION = "excelWriteLocks";
// Hvis en lås er eldre enn dette, regner vi den som forlatt (f.eks. krasjet
// forespørsel som aldri rakk å slippe den) og tillater en ny forespørsel å ta over.
const LOCK_STALE_AFTER_MS = 60_000;
const LOCK_POLL_INTERVAL_MS = 300;
const LOCK_MAX_WAIT_MS = 20_000;

function sanitizeLockId(key: string) {
	return key.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 300) || "default";
}

async function tryAcquireLock(lockId: string): Promise<boolean> {
	const db = getDb();
	const ref = db.collection(LOCK_COLLECTION).doc(lockId);
	const now = Date.now();

	return db.runTransaction(async (transaction) => {
		const snap = await transaction.get(ref);
		const data = snap.exists ? (snap.data() as { lockedAt?: number }) : undefined;
		const isStale = !data?.lockedAt || now - data.lockedAt > LOCK_STALE_AFTER_MS;

		if (snap.exists && !isStale) return false;

		transaction.set(ref, { lockedAt: now }, { merge: true });
		return true;
	});
}

async function releaseLock(lockId: string) {
	const db = getDb();
	await db
		.collection(LOCK_COLLECTION)
		.doc(lockId)
		.delete()
		.catch(() => {});
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sikrer at kun én "les neste ledige rad, så skriv dit"-operasjon mot samme
 * Excel-ark kan pågå samtidig. Uten dette kan to samtidige innsendinger lese
 * samme tomme rad før noen har rukket å skrive, og den ene overskriver den andre.
 */
export async function withExcelWriteLock<T>(lockKey: string, fn: () => Promise<T>): Promise<T> {
	const lockId = sanitizeLockId(lockKey);
	const deadline = Date.now() + LOCK_MAX_WAIT_MS;

	let acquired = await tryAcquireLock(lockId);
	while (!acquired && Date.now() < deadline) {
		await sleep(LOCK_POLL_INTERVAL_MS);
		acquired = await tryAcquireLock(lockId);
	}

	if (!acquired) {
		throw new Error("Excel-arket er opptatt av en annen samtidig skriving. Prøv igjen om litt.");
	}

	try {
		return await fn();
	} finally {
		await releaseLock(lockId);
	}
}
