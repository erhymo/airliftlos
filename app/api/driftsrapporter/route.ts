import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "../../../lib/firebaseAdmin";

type FirestoreDriftsReport = {
	id: string;
	[key: string]: unknown;
};

export async function GET() {
  const accessCode = process.env.ACCESS_CODE;

  if (accessCode) {
    const cookieStore = await cookies();
    const accessCookie = cookieStore.get("airliftlos_access");
    if (!accessCookie || accessCookie.value !== "ok") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

	  try {
	    const db = getDb();
	    const snapshot = await db
	      .collection("driftsrapporter")
	      .orderBy("createdAt", "desc")
	      .get();

	    const reports: FirestoreDriftsReport[] = snapshot.docs.map((doc) => {
	      const data = doc.data() as Record<string, unknown>;
	      return {
	        id: doc.id,
	        ...data,
	      };
	    });

	    return NextResponse.json({ ok: true, reports });
	  } catch (error) {
    console.error("Failed to fetch driftsrapporter from Firestore", error);
    return NextResponse.json(
      { ok: false, error: "Klarte ikke å hente driftsrapporter fra Firestore" },
      { status: 500 }
    );
  }
}

