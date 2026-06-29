import { NextResponse } from "next/server";

import { requireApiAccess } from "../../../../lib/apiAccess";
import { getDb } from "../../../../lib/firebaseAdmin";
import { touchLosBookingsMeta } from "../../../../lib/losBookingsMeta";

export const runtime = "nodejs";

const ORDER_NUMBER = "436270";
const BOOKING_DATA = {
	vesselName: "KOOL KELVIN",
	date: "2026-06-29",
	orderNumber: ORDER_NUMBER,
	base: "Hammerfest",
	pilots: ["Martin Jensen"],
	pilotNameMatches: [],
	fromLocation: "Hammerfest lufthavn",
	toLocation: "Fruholmen Losbordingspunkt",
	terminal: "Melkøya",
	scheduledTime: "06:00",
	mailbox: "loshelikopter.hammerfest@airlift.no",
	subject: "Oppdatering av bestilling for lostransport: 436270",
	status: "open",
	manuallyCreatedFromUpdateEmail: true,
};

async function upsertManualBooking() {
	const db = getDb();
	const existing = await db.collection("losBookings").where("orderNumber", "==", ORDER_NUMBER).limit(1).get();
	const existed = !existing.empty;
	const ref = existed ? existing.docs[0].ref : db.collection("losBookings").doc(`manual-${ORDER_NUMBER}`);
	const now = Date.now();

	await ref.set({
		...BOOKING_DATA,
		updatedAt: now,
		...(existed ? {} : { createdAt: now }),
	}, { merge: true });

	await touchLosBookingsMeta(db, { openCountDelta: existed ? 0 : 1, bumpVersion: true });

	return { existed, id: ref.id };
}

export async function GET(req: Request) {
	const accessError = await requireApiAccess();
	if (accessError) return accessError;

	const url = new URL(req.url);
	if (url.searchParams.get("confirm") !== "opprett") {
		return NextResponse.json({
			ok: true,
			message: "Legger ikke inn noe før confirm=opprett er satt.",
			booking: BOOKING_DATA,
		});
	}

	const result = await upsertManualBooking();
	return NextResponse.json({ ok: true, ...result, booking: BOOKING_DATA });
}

export async function POST() {
	const accessError = await requireApiAccess();
	if (accessError) return accessError;

	const result = await upsertManualBooking();
	return NextResponse.json({ ok: true, ...result, booking: BOOKING_DATA });
}
