import { NextResponse } from "next/server";
import { getDb } from "../../../lib/firebaseAdmin";
import { getOpenLosBookingsSnapshot, isOpenLosBooking } from "../../../lib/losBookings";

type FirestoreLosBooking = {
  id: string;
  [key: string]: unknown;
};

export async function GET(req: Request) {
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

			    const snapshot = await getOpenLosBookingsSnapshot(db);
		
		    const bookings: FirestoreLosBooking[] = snapshot.docs.reduce<FirestoreLosBooking[]>(
	      (acc, doc) => {
	        const data = doc.data() as Record<string, unknown> & { status?: string | null };
	
		        // Skjul bestillinger som er markert som ferdige (status "closed") eller kansellert.
		        // Selv om spørringen over allerede filtrerer på status="open", beholder vi
		        // denne sjekken for å sikre samme oppførsel hvis spørringen endres senere.
		        if (!isOpenLosBooking(data)) {
		          return acc;
		        }
	
	        acc.push({
	          id: doc.id,
	          ...data,
	        });
	
	        return acc;
	      },
	      [],
	    );

    return NextResponse.json({ ok: true, bookings });
  } catch (error) {
    console.error("Failed to fetch losBookings from Firestore", error);
    return NextResponse.json(
      { ok: false, error: "Klarte ikke å hente los-bookinger fra Firestore" },
      { status: 500 },
    );
  }
}
