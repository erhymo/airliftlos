import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "../../../../lib/firebaseAdmin";

export const runtime = "nodejs";

// Enkel admin-endepunkt for å "rydde" LOS-booking-listen i appen.
// Når dette kalles, settes status="closed" på alle dokumenter i
// losBookings-samlingen. De vil da ikke lenger vises i LOS-logg-listen,
// men dataene blir bevart i Firestore.
export async function GET() {
  try {
    const accessCode = process.env.ACCESS_CODE;

    // Krev samme tilgangs-cookie som resten av appen
    if (accessCode) {
      const cookieStore = await cookies();
      const accessCookie = cookieStore.get("airliftlos_access");
      if (!accessCookie || accessCookie.value !== "ok") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    const db = getDb();
    const snapshot = await db.collection("losBookings").get();

    if (snapshot.empty) {
      return NextResponse.json({ ok: true, updated: 0 });
    }

    const batch = db.batch();
    const now = Date.now();

    snapshot.forEach((doc) => {
      batch.set(
        doc.ref,
        {
          status: "closed",
          losLogSentAt: now,
        },
        { merge: true },
      );
    });

    await batch.commit();

    return NextResponse.json({ ok: true, updated: snapshot.size });
  } catch (error) {
    console.error("LOS-bookings close-all: klarte ikke å oppdatere dokumenter", error);
    return NextResponse.json(
      { ok: false, error: "Klarte ikke å lukke los-bookinger" },
      { status: 500 },
    );
  }
}

