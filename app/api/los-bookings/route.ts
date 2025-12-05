import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "../../../lib/firebaseAdmin";

type FirestoreLosBooking = {
	id: string;
	[key: string]: unknown;
};

export async function GET(req: Request) {
  const accessCode = process.env.ACCESS_CODE;

  // Krev tilgangs-cookie hvis ACCESS_CODE er satt (samme mønster som andre API)
  if (accessCode) {
    const cookieStore = await cookies();
    const accessCookie = cookieStore.get("airliftlos_access");
    if (!accessCookie || accessCookie.value !== "ok") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

	try {
		const url = new URL(req.url);
		const id = url.searchParams.get("id");
		const db = getDb();

		if (id) {
			const doc = await db.collection("losBookings").doc(id).get();
			if (!doc.exists) {
				return NextResponse.json({ error: "Not found" }, { status: 404 });
			}
			const data = doc.data() as Record<string, unknown>;
			return NextResponse.json({ ok: true, booking: { id: doc.id, ...data } });
		}

		const snapshot = await db
			.collection("losBookings")
			.orderBy("createdAt", "desc")
			.get();

		const bookings: FirestoreLosBooking[] = snapshot.docs.map((doc) => {
			const data = doc.data() as Record<string, unknown>;
			return {
				id: doc.id,
				...data,
			};
		});

		return NextResponse.json({ ok: true, bookings });
  } catch (error) {
    console.error("Failed to fetch losBookings from Firestore", error);
    return NextResponse.json(
      { ok: false, error: "Klarte ikke å hente los-bookinger fra Firestore" },
      { status: 500 },
    );
  }
}

