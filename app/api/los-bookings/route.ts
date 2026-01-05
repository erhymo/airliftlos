import { NextResponse } from "next/server";
import { getDb } from "../../../lib/firebaseAdmin";

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

		    let snapshot;

		    // Forsøk først en mer effektiv spørring som bare henter åpne bestillinger.
		    // Hvis den feiler (f.eks. manglende indeks i Firestore), faller vi trygt
		    // tilbake til den opprinnelige spørringen som henter alle dokumenter.
		    try {
		      snapshot = await db
		        .collection("losBookings")
		        .where("status", "==", "open")
		        .orderBy("createdAt", "desc")
		        .get();
		    } catch (innerError) {
		      console.error(
		        "LOS-bookings API: optimalisert Firestore-spørring for åpne bestillinger feilet, bruker fallback som henter alle dokumenter",
		        innerError,
		      );
		      snapshot = await db
		        .collection("losBookings")
		        .orderBy("createdAt", "desc")
		        .get();
		    }
		
		    const bookings: FirestoreLosBooking[] = snapshot.docs.reduce<FirestoreLosBooking[]>(
	      (acc, doc) => {
	        const data = doc.data() as Record<string, unknown> & { status?: string | null };
	
		        // Skjul bestillinger som er markert som ferdige (status "closed") eller kansellert.
		        // Selv om spørringen over allerede filtrerer på status="open", beholder vi
		        // denne sjekken for å sikre samme oppførsel hvis spørringen endres senere.
		        if (data.status === "closed" || data.status === "cancelled") {
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
