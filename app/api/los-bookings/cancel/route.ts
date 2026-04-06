import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/firebaseAdmin";
import { isOpenLosBooking } from "../../../../lib/losBookings";
import { touchLosBookingsMeta } from "../../../../lib/losBookingsMeta";

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as { id?: string };
		if (!body.id) {
			return NextResponse.json(
				{ ok: false, error: "Mangler id for bestilling som skal fjernes" },
				{ status: 400 },
			);
		}

		const db = getDb();
		const ref = db.collection("losBookings").doc(body.id);
		const snap = await ref.get();
		if (!snap.exists) {
			return NextResponse.json({ ok: false, error: "Fant ikke bestilling" }, { status: 404 });
		}
		const wasOpen = isOpenLosBooking(snap.data() as { status?: string | null });

		const now = Date.now();
		await ref.set(
			{
				status: "cancelled",
				cancelledAt: now,
			},
			{ merge: true },
		);

		if (wasOpen) {
			try {
				await touchLosBookingsMeta(db, { openCountDelta: -1, bumpVersion: true });
			} catch (metaError) {
				console.error("LOS-bookings cancel: klarte ikke å oppdatere losBookings-meta", metaError);
			}
		}

		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("LOS-bookings cancel: klarte ikke å oppdatere dokument", error);
		return NextResponse.json(
			{ ok: false, error: "Klarte ikke å fjerne bestilling" },
			{ status: 500 },
		);
	}
}
