import { NextResponse } from "next/server";

import { getDb } from "../../../../lib/firebaseAdmin";
import { getOrCreateLosBookingsMeta } from "../../../../lib/losBookingsMeta";

export async function GET() {
	try {
		const db = getDb();
		const meta = await getOrCreateLosBookingsMeta(db);
		return NextResponse.json({ ok: true, meta });
	} catch (error) {
		console.error("Failed to fetch losBookings meta from Firestore", error);
		return NextResponse.json(
			{ ok: false, error: "Klarte ikke å hente los-bookings-meta fra Firestore" },
			{ status: 500 },
		);
	}
}